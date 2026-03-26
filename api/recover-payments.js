import { db } from "../firebase/admin.js";

function sanitizeId(id) {
  return id
    ?.replace(/\.[^/.]+$/, "")
    ?.replace(/[.#$\[\]]/g, "");
}

export default async function handler(req,res){

  try {

    if (!db)
      throw new Error("Firebase not initialized");

    let page = 1;
    let recovered = 0;

    while(true){

      const r = await fetch(
        `https://api.paystack.co/transaction?status=success&page=${page}`,
        {
          headers:{
            Authorization:`Bearer ${process.env.PAYSTACK_SECRET_KEY}`
          }
        }
      );

      const result = await r.json();

      if(!result.data || result.data.length === 0)
        break;

      for(const tx of result.data){

        const reference = tx.reference;

        const contestantId =
          sanitizeId(tx.metadata?.contestantId);

        const votes =
          Number(tx.metadata?.votes || 1);

        if(!contestantId) continue;

        const logRef =
          db.ref(`transactions/${reference}`);

        const exists = await logRef.get();

        if(exists.exists()) continue;

        await logRef.set({
          contestantId,
          votes,
          recovered:true,
          created_at:Date.now()
        });

        await db
          .ref(`contestants/${contestantId}/votes`)
          .transaction(v => (v||0)+votes);

        recovered++;
      }

      page++;
    }

    res.json({ recovered });

  } catch(err){

    console.error("RECOVER ERROR:", err);

    res.status(500).json({
      error: err.message
    });
  }
}