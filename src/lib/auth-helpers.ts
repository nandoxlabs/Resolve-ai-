/**
 * Helper functions for authentication and session validation.
 * Server-side only: used in API routes and middleware.
 */

import { cookies } from 'next/headers';
import { supabaseAdmin } from './supabase-server';

/**
 * Verify a Supabase Auth session from the request cookie.
 * Returns { user, error } tuple.
 */
export async function verifySession() {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('sb-auth-token')?.value;

    if (!authCookie) {
      return { user: null, error: 'No session cookie found' };
    }

    // Verify the session with Supabase
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(authCookie);

    if (error || !user) {
      return { user: null, error: error?.message || 'Invalid session' };
    }

    return { user, error: null };
  } catch (err) {
    return { user: null, error: (err as Error).message };
  }
}

/**
 * Get the current user's organization from the database.
 * Assumes verifySession() was already called and validated the user.
 */
export async function getUserOrgId(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.organization_id;
  } catch (err) {
    return null;
  }
}
