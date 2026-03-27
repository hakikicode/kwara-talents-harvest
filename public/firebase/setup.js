// public/firebase/setup.js

// ✅ MUST be set BEFORE Firebase loads
self.FIREBASE_DATABASE_FORCE_LONG_POLLING = true;
self.FIREBASE_DATABASE_USE_FETCH_STREAMS = false;

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCAGNGQra6nUp0IfiyKJEqpf9IfAwEPmt4",
  authDomain: "kwara-talent-harvest.firebaseapp.com",

  // ✅ Use firebaseio.com for stability
  databaseURL: "https://kwara-talent-harvest-default-rtdb.europe-west1.firebasedatabase.app",

  projectId: "kwara-talent-harvest",
  storageBucket: "kwara-talent-harvest.firebasestorage.app",
  messagingSenderId: "947097502504",
  appId: "1:947097502504:web:f66e944e4e96eb1c25c61d"
};

const app = initializeApp(firebaseConfig);

// ✅ Correct initialization
export const db = getDatabase(app);

