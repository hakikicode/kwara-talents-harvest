import { db } from "../firebase/admin.js";

export default async function handler(req, res) {

  const paystack = await fetch(
    "https://api.paystack.co/transaction?status=success",
    {
      headers: {
        Authorization:
          `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
      }
    }
  );

  const result = await paystack.json();

  let recovered = 0;

  for (const tx of result.data) {

    const reference = tx.reference;
    const contestantId = tx.metadata?.contestantId;
    const votes = Number(tx.metadata?.votes || 1);

    if (!contestantId) continue;

    const logRef =
      db.ref(`transactions/${reference}`);

    const exists = await logRef.get();

    if (exists.exists()) continue;

    // restore missing vote
    await logRef.set({
      contestantId,
      votes,
      recovered: true,
      created_at: Date.now()
    });

    await db
      .ref(`contestants/${contestantId}/votes`)
      .transaction(v => (v || 0) + votes);

    recovered++;
  }

  res.json({
    recovered
  });
}