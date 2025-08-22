import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Use service role key for server-side writes
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { userId, email } = await req.json();
  if (!userId || !email) {
    return new Response(JSON.stringify({ error: 'Missing userId or email' }), { status: 400 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[stripe/create-customer] Missing SUPABASE_SERVICE_ROLE_KEY');
  }
  try {
    // Create Stripe customer
    const customer = await stripe.customers.create({ email });
    // Update user in Supabase
    const { error } = await supabase
      .from('users')
      .update({ stripe_customer_id: customer.id })
      .eq('id', userId);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    return new Response(JSON.stringify({ stripe_customer_id: customer.id }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
} 