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
