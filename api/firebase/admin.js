import admin from "firebase-admin";

let db;

try {
  const projectId = process.env.FB_PROJECT_ID;
  const clientEmail = process.env.FB_CLIENT_EMAIL;
  const privateKey = process.env.FB_PRIVATE_KEY;
  const databaseURL = process.env.FB_DB_URL;

  if (!admin.apps.length) {
    if (!projectId || !clientEmail || !privateKey || !databaseURL) {
      throw new Error("Firebase Admin environment variables are not fully configured");
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
      databaseURL,
    });

    console.log("✅ Firebase Admin initialized");
  }

  db = admin.database();

} catch (err) {
  console.error("🔥 Firebase Admin Init Error:", err);
}

export { db };