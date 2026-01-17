import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getDatabase, ref, set, push } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDRbvwZQJSRPXeQW9JkPTi7EZZ3a6wRwYg",
  authDomain: "talenthunt-e6d1e.firebaseapp.com",
  databaseURL: "https://talenthunt-e6d1e-default-rtdb.firebaseio.com/",
  projectId: "talenthunt-e6d1e",
  storageBucket: "talenthunt-e6d1e.firebasestorage.app",
  messagingSenderId: "8652169622",
  appId: "1:8652169622:web:fed5cdc93e95bc279c3db7",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Form submission handler
const form = document.getElementById("participantForm");
const statusMessage = document.getElementById("statusMessage");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get form values
  const name = document.getElementById("name").value.trim();
  const talent = document.getElementById("talent").value.trim();
  const profilePic = document.getElementById("profilePic").value.trim();

  if (!name || !talent || !profilePic) {
    statusMessage.textContent = "All fields are required!";
    statusMessage.className = "error";
    return;
  }

  try {
    // Create participant object
    const participant = {
      name,
      talent,
      votes: 0, // Initial vote count
      profilePic,
    };

    // Push to Firebase Realtime Database
    const participantsRef = ref(db, "participants");
    await push(participantsRef, participant);

    statusMessage.textContent = "Participant added successfully!";
    statusMessage.className = "success";

    // Clear the form
    form.reset();
  } catch (error) {
    console.error("Error adding participant:", error);
    statusMessage.textContent = "Failed to add participant. Try again.";
    statusMessage.className = "error";
  }
});
