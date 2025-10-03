// routes/webhook.js
const Stripe = require('stripe');
const User = require('../models/User');
const { sendPurchaseEmail } = require('../services/mailer'); // ⬅️ NEW

const stripe = new Stripe(process.env.STRIPE_SECRET, { apiVersion: '2023-10-16' });

async function addCredits(userId, amount) {
  const user = await User.findById(userId);
  if (!user) return;
  user.credits = (user.credits || 0) + Math.max(0, Number(amount || 0));
  await user.save();
  console.log(`[Webhook] Added ${amount} credits to ${user.email}`);
}

async function handleBookOrder({ session }) {
  // Build order payload from metadata (sent in /buy-book for card payments)
  const md = session.metadata || {};
  const order = {
    userId: md.userId || '',
    userEmail: md.userEmail || '',
    material: md.material || '',
    quantity: Number(md.quantity || 1),
    paymentMethod: md.payment_method || 'card',
    address: {
      fullName: md.addr_fullName || '',
      phone: md.addr_phone || '',
      country: md.addr_country || '',
      city: md.addr_city || '',
      zip: md.addr_zip || '',
      line1: md.addr_line1 || '',
      line2: md.addr_line2 || '',
      notes: md.addr_notes || '',
    },
    totals: {
      amount_total: session.amount_total || null,
      currency: session.currency || null,
    },
    stripeSessionId: session.id,
    createdAt: new Date().toISOString(),
  };

  // Send admin email
  try {
    await sendPurchaseEmail({
      adminEmail: process.env.ADMIN_ORDERS_EMAIL || 'evgenigyurovtech@gmail.com',
      order,
      stripeSession: session,
    });
    console.log('[Webhook] Purchase email sent for order');
  } catch (e) {
    console.error('sendPurchaseEmail (card) error:', e);
  }
}

module.exports = async (req, res) => {
  console.log('> got webhook',
    'isBuffer=', Buffer.isBuffer(req.body),
    'len=', Buffer.isBuffer(req.body) ? req.body.length : 'n/a',
    'sig starts=', (req.headers['stripe-signature'] || '').slice(0, 15),
    'whsec starts=', (process.env.STRIPE_WEBHOOK_SECRET || '').slice(0, 10)
  );

  const sig = req.headers['stripe-signature'];

  if (!Buffer.isBuffer(req.body)) {
    console.error('Stripe webhook error: req.body is not a Buffer. Mount express.raw() BEFORE express.json().');
    return res.status(400).send('Webhook Error: raw body required');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Invalid webhook signature:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    console.log('Stripe webhook event:', event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (session.mode === 'payment' && session.payment_status === 'paid') {
        const intent = session.metadata?.intent;

        if (intent === 'credits') {
          const userId = session.metadata?.userId;
          const credits = Number(session.metadata?.creditsPurchased || 0);
          await addCredits(userId, credits);
        }

        if (intent === 'book') {
          await handleBookOrder({ session }); // sends admin email
        }
      }
    }

    return res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return res.json({ received: true });
  }
};
