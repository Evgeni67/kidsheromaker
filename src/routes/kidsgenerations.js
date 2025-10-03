const express = require("express");
const multer = require("multer");
const Replicate = require("replicate");
const auth = require("../middleware/auth"); // ⬅️ required for user scoping
const User = require("../models/User");
const Generation = require("../models/Generation");

// ---- HERO_PROMPTS loader ----
let HERO_PROMPTS = {};
try {
  const mod = require("../utils/constants");
  HERO_PROMPTS = mod.HERO_PROMPTS || mod.default || mod;
} catch (e) {
  console.warn("HERO_PROMPTS not found. Make sure ../utils/hero-prompts exports a map.");
}

const router = express.Router();
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const MODEL = process.env.REPLICATE_MODEL || "black-forest-labs/flux-kontext-pro";

/* ========================================================================================
 * 12-packs per gender (keys must exist in HERO_PROMPTS)
 * ====================================================================================== */
const BOY_KEYS = [
  "deadpool","wolverine","spider-man","miles-morales","iron-man","captain-america",
  "thor","venom","doctor-strange","black-panther","hulk","loki",
];
const GIRL_KEYS = [
  "elsa","moana","rapunzel","wonderwoman","ariel","belle",
  "cinderella","barbie","snow-white","aurora","strawberry","anna",
];

/* ========================================================================================
 * Upload + helpers
 * ====================================================================================== */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /image\/(jpeg|png|webp)/i.test(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error("Unsupported file type. Use JPG/PNG/WebP."), false);
  },
});

const toDataURI = (buf, mime) =>
  `data:${/^image\/(jpeg|png|webp)$/i.test(mime) ? mime : "image/jpeg"};base64,${buf.toString("base64")}`;

const normalizeReplicateOutput = (out) => {
  if (!out) return null;
  if (typeof out === "string") return out;
  if (Array.isArray(out)) {
    const s = out.find((x) => typeof x === "string");
    if (s) return s;
    if (out[0] && typeof out[0] === "object") {
      if (typeof out[0].url === "string") return out[0].url;
      if (out[0].image) return out[0].image;
      if (Array.isArray(out[0].images) && out[0].images[0]) return out[0].images[0];
    }
  }
  if (out.url && typeof out.url === "function") return out.url();
  if (typeof out.url === "string") return out.url;
  if (out.image) return out.image;
  if (Array.isArray(out.images) && out.images[0]) return out.images[0];
  return null;
};

async function runInBatches(items, worker, batchSize = 3) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const slice = items.slice(i, i + batchSize);
    const chunk = await Promise.allSettled(slice.map(worker));
    results.push(...chunk);
  }
  return results;
}

// persist helper
async function saveGenerations(userId, gender, entries) {
  if (!entries?.length) return;
  const docs = entries.map(e => ({
    userId,
    heroKey: e.key,
    gender,
    imageUrl: e.image_url,
  }));
  await Generation.insertMany(docs, { ordered: false });
}

/* ========================================================================================
 * CREDITS UTILS
 * ====================================================================================== */
async function ensureAndChargeCredits(userId, amountToCharge) {
  // We’ll deduct after success to avoid refund gymnastics; this fn only checks.
  const user = await User.findById(userId).select("credits");
  if (!user) throw new Error("User not found");
  if (user.credits < amountToCharge) {
    const needed = amountToCharge - user.credits;
    const msg = amountToCharge === 1
      ? `Not enough credits. Need 1 credit. You have ${user.credits}.`
      : `Not enough credits. Need ${amountToCharge} credits. You have ${user.credits}. Missing ${needed}.`;
    const err = new Error(msg);
    err.status = 402; // Payment Required-ish
    throw err;
  }
  return user; // caller will decrement by actual successes
}

async function decrementCredits(userId, by) {
  if (by <= 0) return;
  await User.updateOne({ _id: userId }, { $inc: { credits: -by } });
}

/* ========================================================================================
 * ROUTE: generate 12 images in one hit (costs up to 12 credits)
 *   - Query: ?gender=boy | girl   (defaults to 'boy')
 *   - Body:  form-data with `image` (file)
 *   - Auth:  required
 * ====================================================================================== */
router.post("/kids/generate", auth, upload.single("image"), async (req, res) => {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({ error: "Missing REPLICATE_API_TOKEN env." });
    }
    if (!MODEL) {
      return res.status(500).json({ error: "Missing REPLICATE_MODEL env (owner/model:version)." });
    }
    if (!req.file?.buffer) {
      return res.status(400).json({ error: "Missing image file under field 'image'." });
    }
    if (!HERO_PROMPTS || !Object.keys(HERO_PROMPTS).length) {
      return res.status(500).json({ error: "HERO_PROMPTS map not loaded. Ensure ../utils/hero-prompts exports { key: prompt }." });
    }

    const gender = (req.query.gender || req.body?.gender || "boy").toString().toLowerCase();
    const keys = gender === "girl" ? GIRL_KEYS : BOY_KEYS;

    const missing = keys.filter((k) => !HERO_PROMPTS[k]);
    if (missing.length) {
      return res.status(400).json({ error: "Missing prompts for some heroes.", missing, hint: "Add these keys to ../utils/hero-prompts" });
    }

    // Check user & credits (max possible charge = 12)
    await ensureAndChargeCredits(req.user.id, keys.length);

    let defaults = {};
    if (process.env.REPLICATE_DEFAULT_INPUT) {
      try { defaults = JSON.parse(process.env.REPLICATE_DEFAULT_INPUT); } catch {}
    }

    const input_image = toDataURI(req.file.buffer, req.file.mimetype);

    const worker = async (key) => {
      const prompt = HERO_PROMPTS[key];
      const input = { ...defaults, prompt, input_image, output_format: "jpg" };
      const out = await replicate.run(MODEL, { input });
      const url = normalizeReplicateOutput(out);
      if (!url) throw new Error("No URL in Replicate output");
      return { key, image_url: url };
    };

    const settled = await runInBatches(keys, worker, 3);
    const results = settled.map((r, i) =>
      r.status === "fulfilled"
        ? r.value
        : { key: keys[i], error: String(r.reason?.message || r.reason || "Generation failed") }
    );

    const success = results.filter(r => r.image_url);
    const successCount = success.length;

    // Charge only for successes
    await decrementCredits(req.user.id, successCount);

    // Persist successful generations
    await saveGenerations(req.user.id, gender, success);

    return res.json({
      gender,
      requested: keys.length,
      success: successCount,
      charged_credits: successCount, // 1 per generation
      results,
    });
  } catch (err) {
    const code = err.status || 500;
    console.error("POST /api/kids/generate error:", err);
    return res.status(code).json({ error: err.message || "Failed to generate images." });
  }
});

/* ========================================================================================
 * ROUTE: generate ONE image (costs 1 credit)
 *   - Query: ?hero=<key>&gender=boy|girl (gender optional; stored with record)
 *   - Body:  form-data with `image` (file)
 *   - Auth:  required
 * ====================================================================================== */
router.post("/kids/generate-one", auth, upload.single("image"), async (req, res) => {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({ error: "Missing REPLICATE_API_TOKEN env." });
    }
    if (!MODEL) {
      return res.status(500).json({ error: "Missing REPLICATE_MODEL env (owner/model:version)." });
    }
    const hero = (req.query.hero || req.body?.hero || "").toString().trim();
    if (!hero) return res.status(400).json({ error: "Missing ?hero=<key>." });
    const prompt = HERO_PROMPTS[hero];
    if (!prompt) return res.status(400).json({ error: `Unknown hero key '${hero}'.` });

    if (!req.file?.buffer) {
      return res.status(400).json({ error: "Missing image file under field 'image'." });
    }

    // Check 1 credit available
    await ensureAndChargeCredits(req.user.id, 1);

    let defaults = {};
    if (process.env.REPLICATE_DEFAULT_INPUT) {
      try { defaults = JSON.parse(process.env.REPLICATE_DEFAULT_INPUT); } catch {}
    }
    const gender = (req.query.gender || req.body?.gender || "boy").toString().toLowerCase();
    const input_image = toDataURI(req.file.buffer, req.file.mimetype);
    const input = { ...defaults, prompt, input_image, output_format: "jpg" };

    const out = await replicate.run(MODEL, { input });
    const url = normalizeReplicateOutput(out);
    if (!url) throw new Error("No URL in Replicate output");

    // Charge 1 credit (success)
    await decrementCredits(req.user.id, 1);

    // Save
    await Generation.create({
      userId: req.user.id,
      heroKey: hero,
      gender,
      imageUrl: url,
    });

    return res.json({
      hero,
      gender,
      charged_credits: 1,
      result: { key: hero, image_url: url },
    });
  } catch (err) {
    const code = err.status || 500;
    console.error("POST /api/kids/generate-one error:", err);
    return res.status(code).json({ error: err.message || "Failed to generate image." });
  }
});

/* ========================================================================================
 * ROUTE: list my generations (auth)
 *   - Query: ?limit=20&offset=0
 * ====================================================================================== */
router.get("/kids/generations", auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);
    const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);

    const [items, total] = await Promise.all([
      Generation.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      Generation.countDocuments({ userId: req.user.id }),
    ]);

    return res.json({
      total,
      limit,
      offset,
      items, // [{_id, userId, heroKey, gender, imageUrl, createdAt, ...}]
    });
  } catch (err) {
    console.error("GET /api/kids/generations error:", err);
    return res.status(500).json({ error: "Failed to load your generations." });
  }
});

module.exports = router;
