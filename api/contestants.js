import { db } from "../firebase/setup.js";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    jwt.verify(token, process.env.ADMIN_JWT_SECRET);

    const snap = await db
      .collection("contestants")
      .orderBy("created_at", "desc")
      .get();

    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(data);

  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

export default async function handler(req, res) {

  try {

    const response = await fetch(
      "https://api.github.com/repos/hakikicode/kwara-talents-harvest/contents/public/contestants"
    );

    const files = await response.json();

    // keep only images
    const contestants = files
      .filter(f =>
        f.name.match(/\.(jpg|jpeg|png|webp)$/i)
      )
      .map((file, index) => ({
        id: index + 1,
        image: file.download_url,
        votes: 0
      }));

    res.status(200).json(contestants);

  } catch (err) {
    res.status(500).json({ error: "Failed to load contestants" });
  }
}