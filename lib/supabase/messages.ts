/**
 * Messages data layer (Supabase).
 *
 * Replaces the FastAPI `/conversation/:id/logs` calls. `role` is stored as a
 * smallint matching the existing Role enum (User=0, Bot=1).
 */
import { supabase } from './client';
import { Message, Role } from '@/utils/Interfaces';

interface MessageRow {
  id: string;
  conversation_id: string;
  role: number;
  content: string;
  metadata: Record<string, any> | null;
  created_at: string;
}

function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    chat_id: row.id,
    role: row.role === Role.User ? Role.User : Role.Bot,
    content: row.content,
    timestamp: row.created_at ? new Date(row.created_at) : undefined,
    ...(row.metadata ?? {}),
  };
}

/** Load all messages for a conversation in chronological order. */
export async function listMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(rowToMessage);
}

/** Insert a message and return its server id (for later content updates). */
export async function insertMessage(input: {
  conversationId: string;
  role: Role;
  content: string;
  metadata?: Record<string, any>;
}): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: input.conversationId,
      role: input.role,
      content: input.content,
      metadata: input.metadata ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return rowToMessage(data);
}

/** Update a streaming assistant message once generation completes. */
export async function updateMessageContent(id: string, content: string): Promise<void> {
  const { error } = await supabase.from('messages').update({ content }).eq('id', id);
  if (error) throw error;
}
