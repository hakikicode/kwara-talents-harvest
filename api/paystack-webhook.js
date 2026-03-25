import crypto from "crypto";
import { db } from "../firebase/setup.js";
import { ref, runTransaction, get } from "firebase/database";

export default async function handler(req, res) {

  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (hash !== req.headers["x-paystack-signature"]) {
    return res.status(401).send("Invalid signature");
  }

  const event = req.body;

  if (event.event === "charge.success") {

    const { contestantId, votes } = event.data.metadata || {};

    console.log("Webhook:", contestantId, votes);

    if (!contestantId) return res.sendStatus(200);

    const dbRef = ref(db, `contestants/${contestantId}`);

    const snap = await get(dbRef);

    // ✅ auto-create contestant if missing
    if (!snap.exists()) {
      await set(dbRef, {
        votes: 0
      });
    }

    await runTransaction(
      ref(db, `contestants/${contestantId}/votes`),
      v => (v || 0) + Number(votes || 1)
    );

    console.log("Votes updated successfully");
  }

  res.sendStatus(200);
}