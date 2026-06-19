/**
 * Profiles data layer (Supabase).
 *
 * The `profiles` row is the app-level user record (1:1 with auth.users). Maps
 * to the existing `User` type so screens that read `user.first_name` etc. keep
 * working.
 */
import { supabase } from './client';
import { User } from '@/constants/Types';

interface ProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  created_at: string;
  updated_at: string;
}

function rowToUser(row: ProfileRow, fallbackEmail?: string): User {
  return {
    user_id: row.id,
    first_name: row.first_name ?? '',
    last_name: row.last_name ?? '',
    username: row.username ?? undefined,
    email: row.email ?? fallbackEmail ?? '',
    phone: row.phone ?? undefined,
    avatar_url: row.avatar_url ?? undefined,
    address: row.address ?? undefined,
    city: row.city ?? undefined,
    state: row.state ?? undefined,
    postal_code: row.postal_code ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Fetch the signed-in user's profile, mapped to the app `User` shape. */
export async function getProfile(): Promise<User | null> {
  const { data: auth } = await supabase.auth.getUser();
  const authUser = auth.user;
  if (!authUser) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (error) {
    // Profile row may not exist yet immediately after signup (trigger lag).
    // Fall back to a minimal user derived from auth metadata.
    const meta = (authUser.user_metadata ?? {}) as Record<string, any>;
    return {
      user_id: authUser.id,
      email: authUser.email ?? '',
      first_name: meta.first_name ?? '',
      last_name: meta.last_name ?? '',
      username: meta.username,
      phone: meta.phone,
    };
  }

  return rowToUser(data, authUser.email ?? undefined);
}

/** Update the signed-in user's profile and return the new `User`. */
export async function updateProfile(input: Partial<{
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  avatar_url: string;
}>): Promise<User> {
  const { data: auth } = await supabase.auth.getUser();
  const authUser = auth.user;
  if (!authUser) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .update(input)
    .eq('id', authUser.id)
    .select('*')
    .single();

  if (error) throw error;
  return rowToUser(data, authUser.email ?? undefined);
}
