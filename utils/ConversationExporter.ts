import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import { Message, Role } from './Interfaces';

export type ExportFormat = 'txt' | 'json' | 'markdown';

interface ExportOptions {
  conversationTitle?: string;
  includeTimestamps?: boolean;
  includeMetadata?: boolean;
}

/**
 * Formats a date for display in exports
 */
const formatDate = (date: Date | string | undefined): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Export conversation as plain text
 */
const exportAsText = (
  messages: Message[],
  options: ExportOptions
): string => {
  let output = '';

  // Add header
  if (options.conversationTitle) {
    output += `${options.conversationTitle}\n`;
    output += '='.repeat(options.conversationTitle.length) + '\n\n';
  }

  if (options.includeMetadata) {
    output += `Exported: ${formatDate(new Date())}\n`;
    output += `Total Messages: ${messages.length}\n\n`;
    output += '-'.repeat(50) + '\n\n';
  }

  // Add messages
  messages.forEach((message, index) => {
    const speaker = message.role === Role.User ? 'You' : 'Assistant';
    
    if (options.includeTimestamps && message.timestamp) {
      output += `[${formatDate(message.timestamp)}] `;
    }
    
    output += `${speaker}:\n${message.content}\n\n`;

    // Add separator between messages
    if (index < messages.length - 1) {
      output += '-'.repeat(30) + '\n\n';
    }
  });

  return output;
};

/**
 * Export conversation as JSON
 */
const exportAsJSON = (
  messages: Message[],
  options: ExportOptions
): string => {
  const exportData = {
    metadata: {
      title: options.conversationTitle || 'Conversation',
      exportedAt: new Date().toISOString(),
      totalMessages: messages.length,
      platform: Platform.OS,
    },
    messages: messages.map((msg) => ({
      role: msg.role === Role.User ? 'user' : 'assistant',
      content: msg.content,
      timestamp: msg.timestamp,
      ...(msg.imageUrl && { imageUrl: msg.imageUrl }),
      ...(msg.files && msg.files.length > 0 && { files: msg.files }),
      ...(msg.additional_data && msg.additional_data.length > 0 && { 
        additional_data: msg.additional_data 
      }),
    })),
  };

  return JSON.stringify(exportData, null, 2);
};

/**
 * Export conversation as Markdown
 */
const exportAsMarkdown = (
  messages: Message[],
  options: ExportOptions
): string => {
  let output = '';

  // Add header
  if (options.conversationTitle) {
    output += `# ${options.conversationTitle}\n\n`;
  }

  if (options.includeMetadata) {
    output += `**Exported:** ${formatDate(new Date())}  \n`;
    output += `**Total Messages:** ${messages.length}\n\n`;
    output += '---\n\n';
  }

  // Add messages
  messages.forEach((message, index) => {
    const speaker = message.role === Role.User ? '**You**' : '**Assistant**';
    
    output += `### ${speaker}\n`;
    
    if (options.includeTimestamps && message.timestamp) {
      output += `*${formatDate(message.timestamp)}*\n\n`;
    }
    
    output += `${message.content}\n\n`;

    // Add separator between messages
    if (index < messages.length - 1) {
      output += '---\n\n';
    }
  });

  return output;
};

/**
 * Main export function
 */
export const exportConversation = async (
  messages: Message[],
  format: ExportFormat,
  options: ExportOptions = {}
): Promise<void> => {
  try {
    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Error', 'Sharing is not available on this device');
      return;
    }

    // Generate content based on format
    let content: string;
    let mimeType: string;
    let fileExtension: string;

    switch (format) {
      case 'txt':
        content = exportAsText(messages, options);
        mimeType = 'text/plain';
        fileExtension = 'txt';
        break;
      case 'json':
        content = exportAsJSON(messages, options);
        mimeType = 'application/json';
        fileExtension = 'json';
        break;
      case 'markdown':
        content = exportAsMarkdown(messages, options);
        mimeType = 'text/markdown';
        fileExtension = 'md';
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    // Create filename
    const timestamp = new Date().getTime();
    const title = options.conversationTitle 
      ? options.conversationTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      : 'conversation';
    const filename = `${title}_${timestamp}.${fileExtension}`;

    // Write to file
    const fileUri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Share the file
    await Sharing.shareAsync(fileUri, {
      mimeType,
      dialogTitle: `Export Conversation (${format.toUpperCase()})`,
      UTI: mimeType,
    });

    // Clean up - delete the temporary file after sharing
    // Note: We wait a bit to ensure sharing is complete
    setTimeout(async () => {
      try {
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(fileUri, { idempotent: true });
        }
      } catch (error) {
        // Silent fail - file cleanup is not critical
        console.log('Failed to clean up temporary file:', error);
      }
    }, 5000);

  } catch (error) {
    console.error('Export error:', error);
    Alert.alert(
      'Export Failed',
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
  }
};

/**
 * Get file size estimate for messages
 */
export const getExportSizeEstimate = (
  messages: Message[],
  format: ExportFormat
): string => {
  let totalChars = 0;

  messages.forEach((msg) => {
    totalChars += msg.content.length;
  });

  // Add overhead for formatting
  const formatMultiplier = format === 'json' ? 3 : format === 'markdown' ? 1.5 : 1.2;
  const estimatedBytes = totalChars * formatMultiplier;

  // Convert to human-readable format
  if (estimatedBytes < 1024) {
    return `${Math.round(estimatedBytes)} B`;
  } else if (estimatedBytes < 1024 * 1024) {
    return `${Math.round(estimatedBytes / 1024)} KB`;
  } else {
    return `${(estimatedBytes / (1024 * 1024)).toFixed(2)} MB`;
  }
};

