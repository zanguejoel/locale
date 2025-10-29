/**
 * MessagePersistenceManager
 * 
 * Manages message save verification, retry logic, and error handling
 * for both foreground and background streams.
 * 
 * Features:
 * - Save verification after streaming completes
 * - Exponential backoff retry for failed saves
 * - Message queue for retry
 * - Error tracking and reporting
 * - Automatic cleanup of old messages
 */

import api from './ApiClient';
import { Message } from './Interfaces';
import { storage } from '@/hooks/useMMKVStorage';

// ============ Types ============

export enum MessageSaveStatus {
  PENDING = 'pending',
  SAVING = 'saving',
  SAVED = 'saved',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

export interface MessageSaveRecord {
  messageId: string;
  conversationId: string;
  content: string;
  role: 'user' | 'assistant';
  status: MessageSaveStatus;
  attempts: number;
  lastAttempt: number;
  error?: string;
  additionalData?: any;
  chatId?: string;
}

export interface SaveVerificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  shouldRetry: boolean;
}

export interface PersistenceStats {
  totalMessages: number;
  savedMessages: number;
  failedMessages: number;
  pendingMessages: number;
  retryQueueSize: number;
}

// ============ Configuration ============

const CONFIG = {
  // Retry configuration
  MAX_RETRY_ATTEMPTS: 3,
  INITIAL_RETRY_DELAY: 2000, // 2 seconds
  MAX_RETRY_DELAY: 30000, // 30 seconds
  BACKOFF_MULTIPLIER: 2,
  
  // Verification
  VERIFY_DELAY: 1000, // Wait 1s before verifying
  VERIFY_TIMEOUT: 10000, // 10s timeout for verification
  
  // Storage
  STORAGE_KEY: '@odyssey_message_queue',
  CLEANUP_INTERVAL: 300000, // 5 minutes
  MESSAGE_RETENTION: 86400000, // 24 hours
};

// ============ MessagePersistenceManager Class ============

class MessagePersistenceManager {
  private messageQueue: Map<string, MessageSaveRecord> = new Map();
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private onErrorCallback: ((error: string, conversationId: string) => void) | null = null;
  private onSuccessCallback: ((messageId: string, conversationId: string) => void) | null = null;
  
  constructor() {
    this.loadQueueFromStorage();
    this.startCleanupInterval();
  }
  
  // ============ Public API ============
  
  /**
   * Register callbacks for error and success events
   */
  public setCallbacks(
    onError?: (error: string, conversationId: string) => void,
    onSuccess?: (messageId: string, conversationId: string) => void
  ) {
    if (onError) this.onErrorCallback = onError;
    if (onSuccess) this.onSuccessCallback = onSuccess;
  }
  
  /**
   * Track a new message that needs to be saved
   */
  public trackMessage(
    messageId: string,
    conversationId: string,
    content: string,
    role: 'user' | 'assistant',
    additionalData?: any,
    chatId?: string
  ): void {
    console.log('[Persistence] Tracking message:', messageId, 'for conversation:', conversationId);
    
    const record: MessageSaveRecord = {
      messageId,
      conversationId,
      content,
      role,
      status: MessageSaveStatus.PENDING,
      attempts: 0,
      lastAttempt: Date.now(),
      additionalData,
      chatId,
    };
    
    this.messageQueue.set(messageId, record);
    this.saveQueueToStorage();
  }
  
  /**
   * Verify that a message was saved successfully
   */
  public async verifyMessageSaved(
    conversationId: string,
    messageId: string
  ): Promise<SaveVerificationResult> {
    console.log('[Persistence] Verifying message save:', messageId);
    
    const record = this.messageQueue.get(messageId);
    if (!record) {
      console.log('[Persistence] No record found for message:', messageId);
      return { success: true, shouldRetry: false }; // Already processed
    }
    
    // Update status
    record.status = MessageSaveStatus.SAVING;
    record.attempts++;
    record.lastAttempt = Date.now();
    
    try {
      // Wait a moment for backend to complete save
      await new Promise(resolve => setTimeout(resolve, CONFIG.VERIFY_DELAY));
      
      // Fetch recent messages to verify the message exists
      const response = await api.get<Message[]>(
        `/conversation/${conversationId}/logs`,
        { 
          params: { conversation_id: conversationId, limit: 10 },
          timeout: CONFIG.VERIFY_TIMEOUT,
        }
      );
      
      if (!response.ok || !response.data) {
        throw new Error('Failed to fetch messages for verification');
      }
      
      // Check if our message is in the response
      const found = response.data.some(msg => 
        msg.chat_id === messageId || 
        msg.id === messageId ||
        (msg.content === record.content && String(msg.role) === record.role)
      );
      
      if (found) {
        console.log('[Persistence] ✅ Message verified saved:', messageId);
        record.status = MessageSaveStatus.SAVED;
        
        // Remove from queue after short delay
        setTimeout(() => {
          this.messageQueue.delete(messageId);
          this.saveQueueToStorage();
        }, 5000);
        
        // Call success callback
        if (this.onSuccessCallback) {
          this.onSuccessCallback(messageId, conversationId);
        }
        
        return { 
          success: true, 
          messageId,
          shouldRetry: false,
        };
      } else {
        throw new Error('Message not found in conversation logs');
      }
    } catch (error: any) {
      console.error('[Persistence] ❌ Message save verification failed:', error);
      
      record.status = MessageSaveStatus.FAILED;
      record.error = error.message || 'Unknown error';
      
      const shouldRetry = record.attempts < CONFIG.MAX_RETRY_ATTEMPTS;
      
      if (shouldRetry) {
        console.log(`[Persistence] Will retry (${record.attempts}/${CONFIG.MAX_RETRY_ATTEMPTS})`);
        this.scheduleRetry(messageId);
      } else {
        console.log('[Persistence] Max retries reached, message save failed permanently');
        
        // Call error callback
        if (this.onErrorCallback) {
          this.onErrorCallback(
            `Failed to save message after ${record.attempts} attempts`,
            conversationId
          );
        }
      }
      
      this.saveQueueToStorage();
      
      return {
        success: false,
        error: record.error,
        shouldRetry,
      };
    }
  }
  
  /**
   * Manually retry saving a failed message
   */
  public async retryMessage(messageId: string): Promise<void> {
    const record = this.messageQueue.get(messageId);
    if (!record) {
      console.warn('[Persistence] Cannot retry - message not found:', messageId);
      return;
    }
    
    console.log('[Persistence] Manually retrying message:', messageId);
    await this.verifyMessageSaved(record.conversationId, messageId);
  }
  
  /**
   * Get all failed messages
   */
  public getFailedMessages(): MessageSaveRecord[] {
    return Array.from(this.messageQueue.values())
      .filter(record => record.status === MessageSaveStatus.FAILED);
  }
  
  /**
   * Get save status for a specific message
   */
  public getMessageStatus(messageId: string): MessageSaveStatus | null {
    return this.messageQueue.get(messageId)?.status || null;
  }
  
  /**
   * Get persistence statistics
   */
  public getStats(): PersistenceStats {
    const records = Array.from(this.messageQueue.values());
    
    return {
      totalMessages: records.length,
      savedMessages: records.filter(r => r.status === MessageSaveStatus.SAVED).length,
      failedMessages: records.filter(r => r.status === MessageSaveStatus.FAILED).length,
      pendingMessages: records.filter(r => r.status === MessageSaveStatus.PENDING).length,
      retryQueueSize: this.retryTimeouts.size,
    };
  }
  
  /**
   * Clear all failed messages from queue
   */
  public clearFailedMessages(): void {
    console.log('[Persistence] Clearing failed messages');
    
    for (const [messageId, record] of this.messageQueue.entries()) {
      if (record.status === MessageSaveStatus.FAILED) {
        this.messageQueue.delete(messageId);
        
        // Cancel any pending retries
        const timeout = this.retryTimeouts.get(messageId);
        if (timeout) {
          clearTimeout(timeout);
          this.retryTimeouts.delete(messageId);
        }
      }
    }
    
    this.saveQueueToStorage();
  }
  
  /**
   * Cleanup and destroy
   */
  public destroy(): void {
    console.log('[Persistence] Destroying manager');
    
    // Clear all retry timeouts
    for (const timeout of this.retryTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.retryTimeouts.clear();
    
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Save queue before destroying
    this.saveQueueToStorage();
  }
  
  // ============ Private Methods ============
  
  /**
   * Schedule a retry with exponential backoff
   */
  private scheduleRetry(messageId: string): void {
    const record = this.messageQueue.get(messageId);
    if (!record) return;
    
    record.status = MessageSaveStatus.RETRYING;
    
    // Calculate delay with exponential backoff
    const delay = Math.min(
      CONFIG.INITIAL_RETRY_DELAY * Math.pow(CONFIG.BACKOFF_MULTIPLIER, record.attempts - 1),
      CONFIG.MAX_RETRY_DELAY
    );
    
    console.log(`[Persistence] Scheduling retry for ${messageId} in ${delay}ms`);
    
    // Clear existing timeout if any
    const existingTimeout = this.retryTimeouts.get(messageId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Schedule new retry
    const timeout = setTimeout(async () => {
      this.retryTimeouts.delete(messageId);
      await this.verifyMessageSaved(record.conversationId, messageId);
    }, delay);
    
    this.retryTimeouts.set(messageId, timeout);
    this.saveQueueToStorage();
  }
  
  /**
   * Load queue from MMKV storage (synchronous)
   */
  private loadQueueFromStorage(): void {
    try {
      const stored = storage.getString(CONFIG.STORAGE_KEY);
      if (stored) {
        const records: MessageSaveRecord[] = JSON.parse(stored);
        
        // Restore records to queue
        for (const record of records) {
          this.messageQueue.set(record.messageId, record);
          
          // Resume retries for failed messages
          if (record.status === MessageSaveStatus.FAILED || 
              record.status === MessageSaveStatus.RETRYING) {
            this.scheduleRetry(record.messageId);
          }
        }
        
        console.log(`[Persistence] Loaded ${records.length} messages from MMKV storage`);
      }
    } catch (error) {
      console.error('[Persistence] Error loading queue from MMKV storage:', error);
    }
  }
  
  /**
   * Save queue to MMKV storage (synchronous)
   */
  private saveQueueToStorage(): void {
    try {
      const records = Array.from(this.messageQueue.values());
      storage.set(CONFIG.STORAGE_KEY, JSON.stringify(records));
    } catch (error) {
      console.error('[Persistence] Error saving queue to MMKV storage:', error);
    }
  }
  
  /**
   * Start cleanup interval to remove old messages
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, CONFIG.CLEANUP_INTERVAL);
  }
  
  /**
   * Clean up old messages from queue
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [messageId, record] of this.messageQueue.entries()) {
      const age = now - record.lastAttempt;
      
      // Remove messages older than retention period
      if (age > CONFIG.MESSAGE_RETENTION) {
        console.log('[Persistence] Cleaning up old message:', messageId);
        this.messageQueue.delete(messageId);
        
        // Cancel any pending retry
        const timeout = this.retryTimeouts.get(messageId);
        if (timeout) {
          clearTimeout(timeout);
          this.retryTimeouts.delete(messageId);
        }
        
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[Persistence] Cleaned up ${cleaned} old messages`);
      this.saveQueueToStorage();
    }
  }
}

// ============ Singleton Instance ============

export const messagePersistenceManager = new MessagePersistenceManager();

// ============ Helper Functions ============

/**
 * Track a message for save verification (synchronous with MMKV)
 */
export function trackMessageSave(
  messageId: string,
  conversationId: string,
  content: string,
  role: 'user' | 'assistant',
  additionalData?: any,
  chatId?: string
): void {
  messagePersistenceManager.trackMessage(
    messageId,
    conversationId,
    content,
    role,
    additionalData,
    chatId
  );
}

/**
 * Verify message was saved and retry if needed
 */
export async function verifyAndRetryMessageSave(
  conversationId: string,
  messageId: string
): Promise<SaveVerificationResult> {
  return messagePersistenceManager.verifyMessageSaved(conversationId, messageId);
}

/**
 * Get all failed messages across all conversations
 */
export function getFailedMessages(): MessageSaveRecord[] {
  return messagePersistenceManager.getFailedMessages();
}

/**
 * Retry a specific failed message
 */
export async function retryFailedMessage(messageId: string): Promise<void> {
  return messagePersistenceManager.retryMessage(messageId);
}

/**
 * Get persistence statistics
 */
export function getPersistenceStats(): PersistenceStats {
  return messagePersistenceManager.getStats();
}

