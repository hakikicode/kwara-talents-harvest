import crypto from "crypto";
import { db } from "../public/firebase/admin";

export const config = {
  api: {
    bodyParser: false, // ✅ REQUIRED
  },
};

// ✅ get raw body EXACTLY
async function getRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  try {
    const rawBody = await getRawBody(req);

    const signature = req.headers["x-paystack-signature"];

    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest("hex");

    // ❌ STOP if invalid
    if (hash !== signature) {
      console.log("❌ Invalid signature");
      return res.sendStatus(401);
    }

    const event = JSON.parse(rawBody.toString());

    if (event.event !== "charge.success") {
      return res.sendStatus(200);
    }

    const data = event.data;

    const reference = data.reference;

    const contestantId = data.metadata?.contestantId
      ?.replace(/\.[^/.]+$/, "")
      ?.replace(/[.#$\[\]]/g, "");

    const votes = Number(data.metadata?.votes || 1);

    if (!reference || !contestantId) {
      console.log("❌ Missing metadata");
      return res.sendStatus(200);
    }

    // =========================
    // 🔥 CRITICAL FIX HERE
    // =========================

    const logRef = db.ref(`transactions/${reference}`);
    const snapshot = await logRef.get();

    // ✅ prevent duplicates
    if (snapshot.exists()) {
      console.log("⚠️ Duplicate payment ignored");
      return res.sendStatus(200);
    }

    // ✅ SAVE TRANSACTION FIRST
    await logRef.set({
      contestantId,
      votes,
      created_at: Date.now(),
    });

    // ✅ FORCE UPDATE (NOT ONLY TRANSACTION)
    const voteRef = db.ref(`contestants/${contestantId}/votes`);

    await voteRef.transaction((current) => {
      return (typeof current === "number" ? current : 0) + votes;
    });

    console.log("✅ Votes added:", votes);

    return res.sendStatus(200);

  } catch (err) {
    console.error("🔥 Webhook error:", err);
    return res.sendStatus(500);
  }
}