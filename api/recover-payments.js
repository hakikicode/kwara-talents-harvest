import { db } from "../firebase/admin.js";

export default async function handler(req,res){

  let page = 1;
  let recovered = 0;

  while(true){
      const r = await fetch(
  `https://api.paystack.co/transaction?status=success&page=${page}&perPage=100`,
      {
        headers:{
          Authorization:`Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const result = await r.json();

    if(!result.data || result.data.length === 0) break;

    for(const tx of result.data){

      const reference = tx.reference;
      const contestantId =
  data.metadata?.contestantId
    ?.replace(/\.[^/.]+$/, "")
    ?.replace(/[.#$\[\]]/g, "");
      const votes = Number(tx.metadata?.votes || 1);

      if(!contestantId) continue;

      const logRef = db.ref(`transactions/${reference}`);
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
}