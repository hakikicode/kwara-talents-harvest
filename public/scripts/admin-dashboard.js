import { db } from "../firebase/setup.js";
import {
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const totalVotesEl = document.getElementById("totalVotes");
const totalRevenueEl = document.getElementById("totalRevenue");
const topContestantEl = document.getElementById("topContestant");
const leaderboard = document.getElementById("leaderboard");

let chart;

// 🔥 LIVE DATA
onValue(ref(db, "contestants"), snap => {

  const data = snap.val();
  if (!data) return;

  let totalVotes = 0;

  const arr = Object.entries(data).map(([id, c]) => {

    const votes = c.votes || 0;
    totalVotes += votes;

    return {
      id,
      votes,
      image: c.image
    };
  });

  // 🔥 SORT
  arr.sort((a, b) => b.votes - a.votes);

  // 🔥 TOTALS
  totalVotesEl.textContent = totalVotes;
  totalRevenueEl.textContent = "₦" + (totalVotes * 350).toLocaleString();

  // 🔥 TOP
  if (arr[0]) {
    topContestantEl.textContent = arr[0].id + " (" + arr[0].votes + ")";
  }

  // 🔥 LEADERBOARD UI
  leaderboard.innerHTML = "";

  arr.forEach((c, i) => {

    const div = document.createElement("div");
    div.className = "item";

    div.innerHTML = `
      <span>#${i + 1} ${c.id}</span>
      <strong>${c.votes} votes</strong>
    `;

    leaderboard.appendChild(div);
  });

  // 🔥 CHART
  const labels = arr.map(c => c.id);
  const votes = arr.map(c => c.votes);

  if (chart) chart.destroy();

  chart = new Chart(document.getElementById("chart"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Votes",
        data: votes
      }]
    }
  });

});