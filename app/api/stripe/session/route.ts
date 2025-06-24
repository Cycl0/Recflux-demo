import { NextRequest } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url!);
  const sessionId = searchParams.get('session_id');
  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'Missing session_id' }), { status: 400 });
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'line_items'],
    });
    let customerEmail = '';
    if (session.customer_details?.email) {
      customerEmail = session.customer_details.email;
    } else if (session.customer && typeof session.customer === 'object' && 'email' in session.customer && session.customer.email) {
      customerEmail = session.customer.email as string;
    }
    return new Response(
      JSON.stringify({
        id: session.id,
        amount_total: session.amount_total,
        currency: session.currency,
        customer_email: customerEmail,
        status: session.status,
        line_items: session.line_items?.data,
      }),
      { status: 200 }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
} 