import { NextRequest } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const { customerId, priceId = 'price_1RbW0F2LODbcMK9PyEJ0ySCO' } = await req.json();

  // Get the origin from the request headers, fallback to localhost
  const origin = req.headers.get('origin') || 'https://recflux.com.br/';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', // One-time payment instead of subscription
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer: customerId,
      success_url: `${origin}/pages/planos/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pages/planos`,
      metadata: {
        type: 'credits',
        credits_amount: '200'
      }
    });

    return new Response(JSON.stringify({ url: session.url }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
} 