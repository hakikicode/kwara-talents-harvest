import { db } from "../public/firebase/setup.js";

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
    amount: votes * 375,
    txn_id,
    phone,
    created_at: new Date()
  });

  res.json({ success: true });
}
