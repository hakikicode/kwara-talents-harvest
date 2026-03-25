export default async function handler(req, res) {

  const { reference } = req.query;

  if (!reference) {
    return res.status(400).json({ error: "No reference" });
  }

  try {

    const verify = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const data = await verify.json();

    if (data.data.status !== "success") {
      return res.status(400).json({ error: "Payment not successful" });
    }

    const { contestantId, votes } = data.data.metadata;

    await runTransaction(
      ref(db, `contestants/${contestantId}/votes`),
      v => (v || 0) + Number(votes)
    );

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: "Verification failed" });
  }
}