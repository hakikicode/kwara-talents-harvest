export default async function handler(req, res) {

  const { reference } = req.body;

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
      }
    }
  );

  const data = await response.json();

  if (!data.status) {
    return res.status(400).json({ error: "Verification failed" });
  }

  const tx = data.data;

  if (tx.status !== "success") {
    return res.status(400).json({ error: "Payment not successful" });
  }

  const contestantId = tx.metadata.contestantId;
  const votes = Number(tx.metadata.votes || 1);

  const db = (await import("../firebase/admin.js")).db;

  await db.ref(`contestants/${contestantId}/votes`)
    .transaction(v => (v || 0) + votes);

  res.json({ success: true });
}