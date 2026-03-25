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
      v => (v || 0) + Number(votes || 1)
    );

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: "Verification failed" });
  }
}

export default async function handler(req, res) {
  const { contestant_id, votes, txn_id, phone } = req.body;

  const ref = db.collection("contestants").doc(contestant_id);

  await db.runTransaction(async t => {
    const snap = await t.get(ref);
    const currentVotes = snap.data().votes || 0;
    t.update(ref, { votes: currentVotes + votes });
  });

  await db.collection("votes_log").add({
    contestant_id,
    votes,
    amount: votes * 350,
    txn_id,
    phone,
    created_at: new Date()
  });

  res.json({ success: true });
}
