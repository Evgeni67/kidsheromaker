// routes/stripe.js
const { Router } = require('express');
const Stripe = require('stripe');
const auth = require('../middleware/auth');
const User = require('../models/User');
const { sendPurchaseEmail } = require('../services/mailer'); // ⬅️ NEW

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET, { apiVersion: '2023-10-16' });

// Credit packs (one-time)
const CREDIT_PACKS = {
  c10:  { label: 'Credit Pack 10',  priceId: process.env.PRICE_CREDITS_10,  credits: 10  },
  c30:  { label: 'Credit Pack 30',  priceId: 'price_1SDrxzPsPa3YnSeqCdzuXAJF', credits: 30  }, // test price ok
  c100: { label: 'Credit Pack 100', priceId: process.env.PRICE_CREDITS_100, credits: 100 },
};

// Book materials (mutually exclusive — pick one)
const BOOK_MATERIALS = {
  basic:   { label: 'Book + Basic Painting Kit',   priceId: process.env.PRICE_BOOK_BASIC   },
  premium: { label: 'Book + Premium Painting Kit', priceId: process.env.PRICE_BOOK_PREMIUM },
  pro:     { label: 'Book + Pro Painting Kit',     priceId: process.env.PRICE_BOOK_PRO     },
};

async function ensureStripeCustomer(user) {
  let id = user.stripeCustomerId;
  if (id) {
    try {
      const existing = await stripe.customers.retrieve(id);
      if (!existing.deleted) return id;
    } catch (_) {}
  }
  const created = await stripe.customers.create({
    email: user.email,
    metadata: { userId: String(user._id) },
  });
  user.stripeCustomerId = created.id;
  await user.save();
  return created.id;
}

// Accept either price_… or prod_… ids; if prod_, resolve default_price
async function resolvePriceId(rawId) {
  if (!rawId) throw new Error('No price/product id configured');

  if (rawId.startsWith('price_')) {
    await stripe.prices.retrieve(rawId);
    return rawId;
  }
  if (rawId.startsWith('prod_')) {
    const product = await stripe.products.retrieve(rawId);
    const def = typeof product.default_price === 'string' ? product.default_price : product.default_price?.id;
    if (def) return def;
    const list = await stripe.prices.list({ product: rawId, active: true, limit: 1 });
    if (list.data[0]) return list.data[0].id;
    throw new Error(`Product ${rawId} has no default_price or active prices`);
  }
  throw new Error(`Expected a price_ or prod_ id, got "${rawId}"`);
}

// Small helper to clamp metadata values under Stripe limits
const meta = (v) => {
  const s = String(v ?? '').trim();
  return s.length > 480 ? s.slice(0, 480) : s;
};

// ----------------------------- BUY CREDITS -----------------------------
router.post('/stripe/buy-credits', auth, async (req, res) => {
  try {
    const packKey = String(req.body.pack || '').toLowerCase();
    const cfg = CREDIT_PACKS[packKey];
    if (!cfg || !cfg.priceId) return res.status(400).json({ error: 'Invalid credit pack' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const priceId = await resolvePriceId(cfg.priceId);
    const customer = await ensureStripeCustomer(user);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/billing/cancel`,
      metadata: {
        intent: 'credits',
        userId: String(user._id),
        userEmail: meta(user.email),
        creditsPurchased: String(cfg.credits),
        pack: packKey,
      },
    });

    res.json({ id: session.id, url: session.url });
  } catch (err) {
    console.error('buy-credits error:', err);
    res.status(500).json({ error: 'Failed to start checkout', detail: err.message });
  }
});

// ----------------------------- BUY BOOK -----------------------------
// Body: {
//   material: 'basic'|'premium'|'pro',
//   quantity: number,
//   paymentMethod: 'card'|'cod',
//   address: {
//     fullName, phone, country, city, zip, line1, line2?, notes?
//   }
// }
router.post('/stripe/buy-book', auth, async (req, res) => {
  try {
    const material = String(req.body.material || '').toLowerCase();
    const qty = Math.max(1, parseInt(req.body.quantity || '1', 10));
    const paymentMethod = (req.body.paymentMethod || 'card').toString().toLowerCase(); // default: card
    const address = req.body.address || {};

    const cfg = BOOK_MATERIALS[material];
    if (!cfg || !cfg.priceId) {
      return res.status(400).json({ error: 'Invalid material. Use: basic | premium | pro' });
    }

    // Basic address validation
    const required = ['fullName', 'phone', 'country', 'city', 'zip', 'line1'];
    const missing = required.filter(k => !address[k]);
    if (missing.length) {
      return res.status(400).json({ error: 'Missing address fields', missing });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // If COD: no Stripe; send admin email and return order ack
    if (paymentMethod === 'cod') {
      const order = {
        userId: String(user._id),
        userEmail: user.email,
        material,
        quantity: qty,
        paymentMethod: 'cod',
        address: {
          fullName: address.fullName,
          phone: address.phone,
          country: address.country,
          city: address.city,
          zip: address.zip,
          line1: address.line1,
          line2: address.line2 || '',
          notes: address.notes || '',
        },
        createdAt: new Date().toISOString(),
      };

      try {
        await sendPurchaseEmail({
          adminEmail: process.env.ADMIN_ORDERS_EMAIL || 'evgenigyurovtech@gmail.com',
          order,
          stripeSession: null,
        });
      } catch (e) {
        console.error('sendPurchaseEmail (COD) error:', e);
        // still acknowledge order; email failure shouldn't block
      }

      return res.json({ ok: true, order });
    }

    // paymentMethod === 'card' → Stripe Checkout (no shipping form; we pass address via metadata)
    const priceId = await resolvePriceId(cfg.priceId);
    const customer = await ensureStripeCustomer(user);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer,
      line_items: [{ price: priceId, quantity: qty }],
      // No shipping_address_collection (address is provided by user payload)
      success_url: `${process.env.FRONTEND_URL}/orders/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/orders/cancel`,
      metadata: {
        intent: 'book',
        payment_method: 'card',
        userId: String(user._id),
        userEmail: meta(user.email),
        material,
        quantity: String(qty),
        addr_fullName: meta(address.fullName),
        addr_phone: meta(address.phone),
        addr_country: meta(address.country),
        addr_city: meta(address.city),
        addr_zip: meta(address.zip),
        addr_line1: meta(address.line1),
        addr_line2: meta(address.line2 || ''),
        addr_notes: meta(address.notes || ''),
      },
    });

    return res.json({ id: session.id, url: session.url });
  } catch (err) {
    console.error('buy-book error:', err);
    res.status(500).json({ error: 'Failed to start checkout', detail: err.message });
  }
});

module.exports = router;
