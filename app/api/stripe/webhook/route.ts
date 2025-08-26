import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
  const buf = await req.arrayBuffer();
  let event;

  try {
    event = stripe.webhooks.constructEvent(Buffer.from(buf), sig!, endpointSecret);
  } catch (err: any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle checkout session completed (initial payment)
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.customer && session.payment_status === 'paid') {
      // Find user by Stripe customer ID
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('stripe_customer_id', session.customer)
        .single();

            if (user) {
        // Check if this is a subscription or credit purchase
        if (session.mode === 'subscription') {
          // Handle subscription - get the subscription details
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const priceId = subscription.items.data[0]?.price.id;
          
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
    
    if (subscription.customer) {
      // Find user by Stripe customer ID
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('stripe_customer_id', subscription.customer)
        .single();

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
    
    if (subscription.customer) {
      // Find user by Stripe customer ID
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('stripe_customer_id', subscription.customer)
        .single();

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