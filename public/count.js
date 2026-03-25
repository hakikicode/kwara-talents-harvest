import { db } from "../firebase/setup.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const stats = document.getElementById("stats");

onValue(ref(db, "contestants"), snap => {

  const data = snap.val();
  if (!data) return;

  let totalVotes = 0;

  let html = "<h3>Leaderboard</h3>";

  Object.entries(data)
    .sort((a, b) => (b[1].votes || 0) - (a[1].votes || 0))
    .forEach(([id, c], index) => {

      totalVotes += c.votes || 0;

      html += `
        <p>
          ${index + 1}. ${id} — 🔥 ${c.votes || 0}
        </p>
      `;
    });

  html += `<hr><h3>Total Votes: ${totalVotes}</h3>`;

  stats.innerHTML = html;
});