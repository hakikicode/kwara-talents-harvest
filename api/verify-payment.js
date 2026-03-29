export default async function handler(req, res) {
  const { reference } = req.body;

  if (!reference) {
    return res.status(400).json({ error: "Missing reference" });
  }

  try {
    // 🔍 Verify with Paystack
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const data = await verifyRes.json();

    if (!data.status || data.data.status !== "success") {
      return res.status(400).json({ error: "Payment not successful" });
    }

    const meta = data.data.metadata;

    const contestantId = meta?.contestantId
      ?.replace(/\.[^/.]+$/, "")
      ?.replace(/[.#$\[\]]/g, "");

    const votes = Number(meta?.votes || 1);

    const refId = data.data.reference;

    if (!contestantId) {
      return res.status(400).json({ error: "Invalid metadata" });
    }

    // ✅ Prevent duplicate processing
    const txRef = db.ref(`transactions/${refId}`);
    const snap = await txRef.get();

    if (snap.exists()) {
      return res.json({ success: true, alreadyProcessed: true });
    }

    // ✅ Save transaction
    await txRef.set({
      contestantId,
      votes,
      created_at: Date.now()
    });

    // ✅ Update votes instantly
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
    res.status(500).json({ error: "Verification failed" });
  }
}

const existing = await db.ref(`transactions/${reference}`).get();

if (existing.exists()) {
  return res.json({ success: true }); // prevent double credit
}