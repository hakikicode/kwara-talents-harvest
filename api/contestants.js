import { db } from "../firebase/admin.js";

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");

  try {

    const response = await fetch(
      "https://api.github.com/repos/hakikicode/kwara-talents-harvest/contents/public/contestants"
    );

    const files = await response.json();

    const contestants = files
      .filter(file => file.name.match(/\.(jpg|jpeg|png|webp)$/i))
      .map(file => ({
        id: file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/\s+/g, "_")
          .replace(/[.#$\[\]]/g, "")
          .toLowerCase(),
        image: file.download_url
      }));

    // 🔥 BULK SYNC (FAST + SAFE)
    const updates = {};

    for (const c of contestants) {
      updates[`contestants/${c.id}`] = {
        image: c.image,
        votes: 0,
        created_at: Date.now()
      };
    }

    await db.ref().update(updates);

    res.status(200).json(contestants);

  } catch (err) {
    console.error("API ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}