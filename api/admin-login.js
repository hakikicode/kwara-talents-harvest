import { db } from "../firebase/setup.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { username, password } = req.body;

  const snap = await db
    .collection("admin")
    .where("username", "==", username)
    .limit(1)
    .get();

  if (snap.empty) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const admin = snap.docs[0].data();

  const valid = bcrypt.compareSync(password, admin.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { username: admin.username, role: admin.role },
    process.env.ADMIN_JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.json({ token });
}
