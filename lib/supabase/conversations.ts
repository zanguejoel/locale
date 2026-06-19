/**
 * Conversations data layer (Supabase).
 *
 * Replaces the FastAPI `/conversation` calls. Rows map to the existing
 * `Conversations` shape in hooks/useChat.tsx so callers need minimal changes.
 */
import { supabase } from './client';
import type { Conversations } from '@/hooks/useChat';

interface ConversationRow {
  id: string;
  user_id: string;
  title: string | null;
  model_type: string | null;
  created_at: string;
  updated_at: string;
}

function rowToConversation(row: ConversationRow): Conversations {
  return {
    id: row.id,
    title: row.title ?? undefined,
    model_type: row.model_type ?? undefined,
    time_created: row.created_at ? new Date(row.created_at) : undefined,
    time_updated: row.updated_at ? new Date(row.updated_at) : undefined,
  };
}

/** List the signed-in user's conversations, newest first. RLS scopes to the user. */
export async function listConversations(limit = 20, search?: string): Promise<Conversations[]> {
  let query = supabase
    .from('conversations')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (search) {
    query = query.ilike('title', `%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(rowToConversation);
}

export async function createConversation(input: {
  title?: string;
  modelType?: string;
}): Promise<Conversations> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      title: input.title ?? null,
      model_type: input.modelType ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return rowToConversation(data);
}

export async function renameConversation(id: string, title: string): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .update({ title })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteConversation(id: string): Promise<void> {
  const { error } = await supabase.from('conversations').delete().eq('id', id);
  if (error) throw error;
}

/** Touch updated_at so a conversation bubbles to the top of the list. */
export async function touchConversation(id: string): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
