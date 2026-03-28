import { db } from "../firebase/admin.js";

export default async function handler(req, res) {

  // ✅ CORS FIX
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const response = await fetch(
    "https://api.github.com/repos/hakikicode/kwara-talents-harvest/contents/public/contestants"
  );

  const files = await response.json();

  const contestants = files
    .filter(file => file.name.match(/\.(jpg|jpeg|png|webp)$/i))
    .map(file => {

      const id = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/\s+/g, "_")
        .replace(/[.#$\[\]]/g, "")
        .toLowerCase();

      return {
        id,
        image: file.download_url
      };
    });

  // 🔥 AUTO SYNC TO FIREBASE
  for (const c of contestants) {

    const ref = db.ref(`contestants/${c.id}`);
    const snap = await ref.get();

    if (!snap.exists()) {
      await ref.set({
        image: c.image,
        votes: 0,
        created_at: Date.now()
      });
    }
  }

  res.json(contestants);
}