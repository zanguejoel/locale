export enum Role {
  User = 0,
  Bot = 1,
}

export interface File {
  file_path: string;
  file_type: string,
  id: number,
  name: string,
  s3_url: string
  data_type?: string
}
export enum MessageStatus {
  Sending = 'sending',
  Sent = 'sent',
  Delivered = 'delivered',
  Failed = 'failed',
}

export interface AdditionalData {
  data_type: string; // 'img', 'video', 'voice', 'stock', etc.
  data: string; // URL or data content
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[]; // User IDs who reacted
  hasReacted: boolean; // Whether current user has reacted
}

export interface Message {
  role: Role;
  content: string;
  imageUrl?: string;
  prompt?: string;
  category?: string;
  files?: File[];
  message_type?: string;
  timestamp?: Date | string;
  status?: MessageStatus;
  id?: string;
  imageData?: string;
  additional_data?: AdditionalData[];
  // New features
  reactions?: MessageReaction[];
  isPinned?: boolean;
  isEdited?: boolean;
  editedAt?: Date | string;
  replyToMessageId?: string; // For thread/reply system
  replyToContent?: string;
  replyToRole?: Role;
}

export interface Chat {
  id: number;
  title: string;
}
