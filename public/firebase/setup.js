// public/firebase/setup.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCAGNGQra6nUp0IfiyKJEqpf9IfAwEPmt4",
  authDomain: "kwara-talent-harvest.firebaseapp.com",
  databaseURL: "https://kwara-talent-harvest-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "kwara-talent-harvest",
  storageBucket: "kwara-talent-harvest.firebasestorage.app",
  messagingSenderId: "947097502504",
  appId: "1:947097502504:web:f66e944e4e96eb1c25c61d"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);  // ✅ must export
