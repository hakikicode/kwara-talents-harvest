import { db } from "./firebase/admin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { reference } = req.body || {};

  if (!reference) {
    return res.status(400).json({ error: "Missing reference" });
  }

  try {
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const data = await verifyRes.json();

    if (!verifyRes.ok || !data.status || data.data?.status !== "success") {
      return res.status(400).json({
        error: data.message || "Payment not successful"
      });
    }

    const meta = data.data.metadata || {};
    const contestantId = meta.contestantId
      ?.replace(/\.[^/.]+$/, "")
      ?.replace(/[.#$\[\]]/g, "");
    const votes = Number(meta.votes || 1);
    const refId = data.data.reference;

    if (!contestantId) {
      return res.status(400).json({ error: "Invalid metadata" });
    }

    const txRef = db.ref(`transactions/${refId}`);
    const snap = await txRef.get();

    if (snap.exists()) {
      return res.json({ success: true, alreadyProcessed: true });
    }

    await txRef.set({
      contestantId,
      votes,
      created_at: Date.now()
    });

    const voteRef = db.ref(`contestants/${contestantId}/votes`);
    await voteRef.transaction(current => {
      return (typeof current === "number" ? current : 0) + votes;
    });

    return res.json({
      success: true,
      contestantId,
      votes
    });
  } catch (err) {
    console.error("VERIFY ERROR:", err);
    return res.status(500).json({ error: "Verification failed" });
  }
}
