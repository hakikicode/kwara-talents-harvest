import admin from "firebase-admin";

let db;

try {

  if (!admin.apps.length) {

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FB_PROJECT_ID,
        clientEmail: process.env.FB_CLIENT_EMAIL,
        privateKey: process.env.FB_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
      databaseURL: process.env.FB_DB_URL,
    });

    console.log("✅ Firebase Admin initialized");
  }

  db = admin.database();

} catch (err) {
  console.error("🔥 Firebase Admin Init Error:", err);
}

export { db };