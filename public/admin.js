  import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
  import { getDatabase, ref, onValue, update, get } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
  
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
  
  // Table body reference
  const tableBody = document.getElementById("payment-body");
  
  // Fetch payment data
  const paymentRef = ref(db, "payments");
  onValue(paymentRef, (snapshot) => {
    const data = snapshot.val();
    tableBody.innerHTML = ""; // Clear existing rows
  
    if (data) {
      Object.entries(data).forEach(([key, payment]) => {
        const row = document.createElement("tr");
  
        row.innerHTML = `
          <td>${payment.userId}</td>
          <td>${payment.participantName}</td>
          <td>${payment.votes}</td>
          <td>${payment.amount} Naira</td>
          <td><a href="${payment.proofUrl}" target="_blank">View Proof</a></td>
          <td>${payment.status}</td>
          <td>
            <button class="btn btn-approve" data-id="${key}" data-action="approve" data-votes="${payment.votes}" data-participant="${payment.participantName}">Approve</button>
            <button class="btn btn-reject" data-id="${key}" data-action="reject">Reject</button>
          </td>
        `;
  
        tableBody.appendChild(row);
      });
    }
  });
  
  // Handle approve/reject actions
  tableBody.addEventListener("click", async (e) => {
    if (e.target.tagName === "BUTTON") {
      const { id, action, votes, participant } = e.target.dataset;
  
      const newStatus = action === "approve" ? "Approved" : "Rejected";
  
      try {
        // Update payment status
        const paymentStatusRef = ref(db, `payments/${id}`);
        await update(paymentStatusRef, { status: newStatus });
  
        if (action === "approve") {
          // Update participant vote count
          const participantsRef = ref(db, "participants");
          const snapshot = await get(participantsRef);
  
          if (snapshot.exists()) {
            const participants = snapshot.val();
  
            // Find participant by name
            const participantKey = Object.keys(participants).find(
              (key) => participants[key].name.toLowerCase() === participant.toLowerCase()
            );
  
            if (participantKey) {
              const currentVotes = participants[participantKey].votes || 0;
              const updatedVotes = currentVotes + parseInt(votes, 10);
  
              await update(ref(db, `participants/${participantKey}`), { votes: updatedVotes });
  
              alert(`Votes updated for ${participant}.`);
            } else {
              alert("Participant not found. Votes not updated.");
            }
          } else {
            alert("No participants found in the database.");
          }
        }
  
        alert(`Payment ${newStatus.toLowerCase()} successfully.`);
      } catch (error) {
        console.error("Error updating payment status or votes:", error);
        alert("Failed to update payment status or votes. Try again.");
      }
    }
  });
  