import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function ensureEnv(name: string) {
  if (!process.env[name]) {
    console.warn(`[stripe/webhook] Missing env var: ${name}`);
  }
}

ensureEnv('STRIPE_SECRET_KEY');
ensureEnv('STRIPE_WEBHOOK_SECRET');
ensureEnv('NEXT_PUBLIC_SUPABASE_URL');
ensureEnv('SUPABASE_SERVICE_ROLE_KEY');

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    console.error('[stripe/webhook] Missing stripe-signature header');
    return new Response('Missing stripe-signature', { status: 400 });
  }

  const rawBody = await req.text();
  let event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err: any) {
    console.error('[stripe/webhook] Signature verification failed:', err?.message || err);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Helper to find or link a user by Stripe customer
  const findUserByCustomer = async (customerId: string) => {
    // 1) Try direct match on stripe_customer_id
    const { data: directUser } = await supabase
      .from('users')
      .select('*')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    if (directUser) return directUser as any;

    // 2) Fetch customer from Stripe to get email
    try {
      const customer = await stripe.customers.retrieve(customerId);
      const email = (customer as any)?.email as string | undefined;
      if (!email) return null;

      // 3) Try to find user by email
      const { data: emailUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      if (!emailUser) return null;

      // 4) Link user with missing stripe_customer_id
      if (!(emailUser as any).stripe_customer_id) {
        await supabase
          .from('users')
          .update({ stripe_customer_id: customerId })
          .eq('id', (emailUser as any).id);
      }
      return emailUser as any;
    } catch (e) {
      console.error('[stripe/webhook] Failed to retrieve customer from Stripe:', e);
      return null;
    }
  };

  // Handle checkout session completed (initial payment)
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    console.log('[stripe/webhook] checkout.session.completed', {
      id: session.id,
      mode: session.mode,
      payment_status: session.payment_status,
      customer: session.customer,
      metadata: session.metadata,
    });

    if (session.customer && session.payment_status === 'paid') {
      // Find or link user by Stripe customer
      const user = await findUserByCustomer(session.customer as string);

      if (user) {
        // Check if this is a subscription or credit purchase
        if (session.mode === 'subscription') {
          // Handle subscription - get the subscription details
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const priceId = subscription.items.data[0]?.price.id;
          console.log('[stripe/webhook] subscription details', { status: subscription.status, priceId });
          
          // Check if this is the premium plan
          if (priceId === 'price_1RbUoL2LODbcMK9PfX6Ilsf3') {
            await supabase
              .from('users')
              .update({ 
                credits: (user.credits || 0) + 500,
                plan: 'premium'
              })
              .eq('id', user.id);
            
            console.log(`Updated user ${user.email} to premium plan with 500 credits`);
          }
        } else if (session.mode === 'payment' && session.metadata?.type === 'credits') {
          // Handle credit purchase
          const creditsToAdd = parseInt(session.metadata.credits_amount || '200');
          await supabase
            .from('users')
            .update({ credits: (user.credits || 0) + creditsToAdd })
            .eq('id', user.id);
          
          console.log(`Added ${creditsToAdd} credits to user ${user.email}`);
        }
      }
    }
  }

  // Handle subscription updates (renewals, plan changes)
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription;
    console.log('[stripe/webhook] customer.subscription.updated', { id: subscription.id, status: subscription.status, customer: subscription.customer });
    
    if (subscription.customer) {
      // Find or link user by Stripe customer ID
      const user = await findUserByCustomer(subscription.customer as string);

      if (user) {
        const priceId = subscription.items.data[0]?.price.id;
        
        // Update plan based on subscription status and price
        if (subscription.status === 'active' && priceId === 'price_1RbUoL2LODbcMK9PfX6Ilsf3') {
          await supabase
            .from('users')
            .update({ plan: 'premium' })
            .eq('id', user.id);
          
          console.log(`Updated user ${user.email} to premium plan (subscription updated)`);
        }
      }
    }
  }

  // Handle subscription cancellation/expiration
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    console.log('[stripe/webhook] customer.subscription.deleted', { id: subscription.id, customer: subscription.customer });
    
    if (subscription.customer) {
      // Find or link user by Stripe customer ID
      const user = await findUserByCustomer(subscription.customer as string);

      if (user) {
        // Revert to free plan when subscription is cancelled
        await supabase
          .from('users')
          .update({ plan: 'free' })
          .eq('id', user.id);
        
        console.log(`Reverted user ${user.email} to free plan (subscription cancelled)`);
      }
    }
  }

  return new Response('ok', { status: 200 });
} 