export default async function handler(req, res) {

  const { contestantId, votes, email } = req.body;

  if (!contestantId || !votes || !email) {
    return res.status(400).json({
      error: "Missing fields (email, contestantId, votes required)"
    });
  }

  const amount = Number(votes) * 350 * 100; // kobo

  const reference = `KTH-${Date.now()}-${contestantId}`;

  try {

    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          amount,
          reference,

          callback_url: `${process.env.BASE_URL}/vote.html?success=true`,

          metadata: {
            contestantId,
            votes
          },

          // ✅ FIXED SPLIT
          subaccount: process.env.ECOBANK_SUBACCOUNT,
          transaction_charge: 27500 * votes,
          bearer: "account"
        })
      }
    );

    const data = await response.json();

    if (!data.status) {
      console.error("PAYSTACK ERROR:", data);
      return res.status(400).json({
        error: data.message || "Initialization failed"
      });
    }

    res.json({
      reference,
      amount,
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
    });

  } catch (err) {
    console.error("INIT ERROR:", err);
    res.status(500).json({ error: "Payment init failed" });
  }
}