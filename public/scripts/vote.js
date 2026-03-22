import { db } from "../firebase/setup.js";
import {
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const list = document.getElementById("contestants");
const VOTE_PRICE = 350;

/* ===============================
   GLOBAL CARD STORE (PERFORMANCE)
================================ */
const cardsMap = {};

/* ===============================
   LOAD CONTESTANTS FROM GITHUB API
================================ */
async function loadContestants() {

  try {

    const res = await fetch(
      "https://www.kwaratalentsharvest.com.ng/api/contestants"
    );

    const contestants = await res.json();

    list.innerHTML = "";

    contestants.forEach(c => {

      const link =
        `${location.origin}/contestant.html?id=${c.id}`;

      const card = document.createElement("div");
      card.className = "vote-card";

      card.innerHTML = `
        <img src="${c.image}"
          class="contestant-img"
          loading="lazy"
          onerror="this.src='assets/default.png'">

        <p class="votes">🔥 0 Votes</p>

        <input type="number" min="1" value="1"
          id="qty-${c.id}" />

        <button class="btn vote-btn"
          onclick="startVote('${c.id}')">
          🗳 Vote Now — ₦${VOTE_PRICE}
        </button>

        <div class="share-box">
          <button onclick="copyLink('${link}')">🔗 Copy</button>

          <a target="_blank"
            href="https://wa.me/?text=Vote for contestant ${c.id} ${link}">
            WhatsApp
          </a>
        </div>
      `;

      // store references
      cardsMap[c.id] = {
        element: card,
        votesEl: card.querySelector(".votes")
      };

      list.appendChild(card);
    });

  } catch (err) {
    console.error("Failed loading contestants:", err);
  }
}

/* ===============================
   SINGLE LIVE VOTE LISTENER
   (EXTREMELY OPTIMIZED)
================================ */
function startLiveVotes() {

  onValue(ref(db, "contestants"), snap => {

    const data = snap.val();
    if (!data) return;

    const sortable = [];

    Object.entries(data).forEach(([id, c]) => {

      if (!cardsMap[id]) return;

      const votes = c.votes || 0;

      cardsMap[id].votesEl.textContent =
        `🔥 ${votes} Votes`;

      sortable.push({
        id,
        votes,
        element: cardsMap[id].element
      });
    });

    // AUTO LEADERBOARD SORT
    sortable
      .sort((a, b) => b.votes - a.votes)
      .forEach(item => list.appendChild(item.element));
  });
}

/* ===============================
   ANTI-FRAUD PROTECTION
================================ */

// device fingerprint (lightweight)
function getDeviceId() {

  let id = localStorage.getItem("device_id");

  if (!id) {
    id =
      crypto.randomUUID() +
      "-" +
      navigator.userAgent.length;

    localStorage.setItem("device_id", id);
  }

  return id;
}

/* ===============================
   START VOTE
================================ */
window.startVote = async (contestantId) => {

  const email = prompt("Enter your email:");
  if (!email) return;

  const qty =
    Number(document.getElementById(`qty-${contestantId}`).value) || 1;

  /* ---- Anti spam cooldown ---- */
  const lastVote = localStorage.getItem("last_vote_time");
  const now = Date.now();

  if (lastVote && now - lastVote < 15000) {
    alert("Please wait before voting again.");
    return;
  }

  localStorage.setItem("last_vote_time", now);

  try {

    const res = await fetch("/api/initialize-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        contestantId,
        votes: qty,
        deviceId: getDeviceId() // anti fraud signal
      })
    });

    const data = await res.json();

    if (!data.authorization_url) {
      alert("Payment initialization failed");
      console.error(data);
      return;
    }

    window.location.href = data.authorization_url;

  } catch (err) {
    alert("Payment failed");
    console.error(err);
  }
};

/* ===============================
   COPY LINK
================================ */
window.copyLink = link => {
  navigator.clipboard.writeText(link);
  alert("Link copied!");
};

/* ===============================
   INIT
================================ */
(async () => {
  await loadContestants();
  startLiveVotes();
})();