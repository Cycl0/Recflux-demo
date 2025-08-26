import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for secure server-side writes
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json();
    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 });
    }

    // Check if already exists
    const { data: existing, error: fetchError } = await supabase
      .from('users')
      .select('id, stripe_customer_id')
      .eq('email', email)
      .single();

    if (existing && !fetchError) {
      return NextResponse.json({ user: existing, created: false }, { status: 200 });
    }

    // Create a clean username from email local part
    const emailLocal = email.split('@')[0] || 'user';
    const base = emailLocal
      .toLowerCase()
      .replace(/[^a-z0-9_\-]/gi, '')
      .slice(0, 24) || 'user';

    let username = base;
    let inserted: any = null;
    let lastError: any = null;

    // Try up to 3 attempts to avoid username conflicts
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabase
        .from('users')
        .insert([{ id: userId, email, username, plan: 'free', credits: 10 }])
        .select('id, stripe_customer_id')
        .single();

      if (!error) {
        inserted = data;
        break;
      }

      lastError = error;
      const code = (error as any)?.code || (error as any)?.details || (error as any)?.message || '';
      // Unique violation on username
      if (`${code}`.includes('23505') || `${code}`.toLowerCase().includes('duplicate')) {
        const suffix = Math.random().toString(36).slice(2, 6);
        username = `${base}-${suffix}`;
        continue;
      }
      break;
    }

    if (!inserted) {
      const message = lastError?.message || 'Failed to insert user';
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ user: inserted, created: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 });
  }
}


