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
          email, // ✅ REQUIRED
          amount,
          contestantId,
          votes: qty,

          callback_url: `${process.env.BASE_URL}/vote.html?success=true`,

          metadata: {
            contestantId,
            votes
          },

          // ✅ SPLIT PAYMENT (REAL FIX)
          split: {
            type: "flat",
            currency: "NGN",
            subaccounts: [
              {
                subaccount: process.env.ECOBANK_SUBACCOUNT,
                share: 27500 * votes // ₦275
              },
              {
                subaccount: process.env.ACCESSBANK_SUBACCOUNT,
                share: 7500 * votes // ₦75
              }
            ]
          }
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
      authorization_url: data.data.authorization_url
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Payment init failed" });
  }
}