/**
 * POST /api/auth/register
 * Create a new user account with Supabase Auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Create user in Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm in development
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Registration failed' },
        { status: 400 }
      );
    }

    // Create user record in database
    if (data.user) {
      await supabaseAdmin
        .from('users')
        .insert([
          {
            id: data.user.id,
            email: data.user.email,
            email_verified: true,
          },
        ])
        .single();
    }

    return NextResponse.json(
      { success: true, user: data.user },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}