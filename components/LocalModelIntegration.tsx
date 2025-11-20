/**
 * LocalModelIntegration - Wrapper component for local AI
 * 
 * This component integrates the useLocalModel hook and provides
 * the UI for toggling between local and cloud models.
 * 
 * IMPORTANT: This should be used in your chat screen, NOT in ChatProvider,
 * to avoid infinite re-render loops.
 * 
 * Usage:
 * <LocalModelIntegration>
 *   {(localProps) => (
 *     <YourChatUI {...localProps} />
 *   )}
 * </LocalModelIntegration>
 */

import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalModel } from '@/hooks/useLocalModel';
import { useChat } from '@/hooks/useChat';
import { LocalModelTestToggle } from './LocalModelTestToggle';

interface LocalModelIntegrationProps {
  children: (props: LocalModelChildProps) => React.ReactElement;
}

export interface LocalModelChildProps {
  // Local model state
  isLocal: boolean;
  setIsLocal: (value: boolean) => void;
  isLocalModelReady: boolean;
  isLocalModelGenerating: boolean;
  
  // Actions
  handleSend: (text: string) => Promise<void>;
  stopGeneration: () => void;
  
  // UI components
  renderToggle: () => React.ReactElement;
}

export function LocalModelIntegration({ children }: LocalModelIntegrationProps) {
  const chat = useChat();
  
  // Initialize local model here (in component, not provider)
  const localModel = useLocalModel({
    currentConversationId: chat.currentConversationId,
    onStreamUpdate: (text) => {
      // Update would go through chat.setStream if we exposed it
      // For now, the hook handles it internally via its callbacks
      console.log('[LocalModel] Stream update:', text.length, 'chars');
    },
    onSendingUpdate: (sending) => {
      console.log('[LocalModel] Sending state:', sending);
    },
    messages: chat.messages,
  });
  
  // ============ Message Sending (Routes between local/cloud) ============
  
  const handleSend = useCallback(
    async (text: string) => {
      if (localModel.isLocal) {
        // Send to local model
        await localModel.handleSendLocalMessage(text);
      } else {
        // Send to cloud model (existing)
        await chat.sendMessage(text);
      }
    },
    [localModel.isLocal, localModel.handleSendLocalMessage, chat.sendMessage]
  );
  
  // ============ Stop Generation ============
  
  const stopGeneration = useCallback(() => {
    if (localModel.isLocal) {
      localModel.interruptLocalGeneration();
    } else {
      chat.stopStreaming();
    }
  }, [localModel.isLocal, localModel.interruptLocalGeneration, chat.stopStreaming]);
  
  // ============ Toggle Component ============
  
  const renderToggle = useCallback(() => {
    return (
      <LocalModelTestToggle
        isLocal={localModel.isLocal}
        setIsLocal={localModel.setIsLocal}
        isLocalModelReady={localModel.isLocalModelReady}
        isLocalModelGenerating={localModel.isLocalModelGenerating}
        interruptLocalGeneration={localModel.interruptLocalGeneration}
      />
    );
  }, [
    localModel.isLocal,
    localModel.setIsLocal,
    localModel.isLocalModelReady,
    localModel.isLocalModelGenerating,
    localModel.interruptLocalGeneration,
  ]);
  
  // ============ Pass Props to Children ============
  
  const childProps: LocalModelChildProps = {
    isLocal: localModel.isLocal,
    setIsLocal: localModel.setIsLocal,
    isLocalModelReady: localModel.isLocalModelReady,
    isLocalModelGenerating: localModel.isLocalModelGenerating,
    handleSend,
    stopGeneration,
    renderToggle,
  };
  
  return <>{children(childProps)}</>;
}

const styles = StyleSheet.create({
  // Styles if needed
});

export default LocalModelIntegration;

