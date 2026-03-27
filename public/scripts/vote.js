const MAX_VOTES_TARGET = 100000;

import { db } from "../firebase/setup.js";
import {
  ref,
  get,
  set,
  onValue
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const list = document.getElementById("contestants");
const VOTE_PRICE = 350;

const cardsMap = {};

/* ===============================
   SAFE ID HELPER
================================ */
function safeId(id) {
  return id
    .replace(/\.[^/.]+$/, "")
    .replace(/[.#$\[\]]/g, "");
}

/* ===============================
   LOAD CONTESTANTS
================================ */
async function loadContestants() {

  try {

    const res = await fetch(
      "https://www.kwaratalentsharvest.com.ng/api/contestants"
    );

    const contestants = await res.json();

    list.innerHTML = "";

    for (const c of contestants) {

      const id = safeId(c.id);

      // ✅ Ensure exists in Firebase
      const dbRef = ref(db, `contestants/${id}`);
      const snap = await get(dbRef);

      if (!snap.exists()) {
        await set(dbRef, {
          image: c.image,
          votes: 0,
          created_at: Date.now()
        });
      }

      const link =
        `${location.origin}/contestant.html?id=${id}`;

      const card = document.createElement("div");
      card.className = "vote-card";

      card.innerHTML = `
        <img src="${c.image}"
          class="contestant-img"
          loading="lazy"
          onerror="this.src='assets/default.png'">

          <p class="votes" id="percent-${id}">0%</p>

        <div class="progress">
          <div class="bar" id="bar-${id}"></div>
        </div>

        <input type="number" min="1" value="1" id="qty-${id}" />

        <button class="btn vote-btn"
          onclick="startVote('${id}')">
          🗳 Vote Now — ₦${VOTE_PRICE}
        </button>

        <div class="badge" id="badge-${id}"></div>

        <div class="share-box">
          <button onclick="copyLink('${link}')">🔗 Copy</button>

          <a target="_blank"
           href="https://wa.me/?text=Vote for contestant ${id} ${link}">
           WhatsApp
          </a>
        </div>
      `;

      cardsMap[id] = {
        element: card,
        votesEl: card.querySelector(".votes")
      };

      list.appendChild(card);
    }

  } catch (err) {
    console.error("Failed loading contestants:", err);
  }
}

/* ===============================
   LIVE VOTES LISTENER
================================ */
const lastVotesSnapshot = {};

function startLiveVotes() {

  onValue(ref(db, "contestants"), snap => {

    const data = snap.val();
    if (!data) return;

    const sortable = [];

    Object.entries(data).forEach(([id, c]) => {

    if (!cardsMap[id]) return;

    const votes = c.votes || 0;

    const percent = Math.min(
      (votes / MAX_VOTES_TARGET) * 100,
      100
    );

    // ✅ Update percentage text
    const percentEl = document.getElementById(`percent-${id}`);
    if (percentEl) {
      percentEl.textContent = percent.toFixed(1) + "%";
    }

    // ✅ Animate bar
    const bar = document.getElementById(`bar-${id}`);
    if (bar) {
      requestAnimationFrame(() => {
        bar.style.width = percent + "%";
      });
    }

    sortable.push({
      id,
      votes,
      element: cardsMap[id].element
    });
  });

    // leaderboard auto-sort
    sortable
      .sort((a, b) => b.votes - a.votes)
      .forEach(item =>
        list.appendChild(item.element)
      );

  });
}

/* ===============================
   DEVICE ID (ANTI FRAUD)
================================ */
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
window.startVote = async contestantId => {

  const email = prompt("Enter your email:");
  if (!email) return;

  const qty =
    Number(
      document.getElementById(`qty-${contestantId}`).value
    ) || 1;

  // anti spam
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        contestantId,
        votes: qty,
        deviceId: getDeviceId()
      })
    });

    const data = await res.json();

    if (!data.authorization_url) {

      const manual = confirm(
        "Payment failed.\nPay manually?"
      );

      if (manual) {
        window.location.href =
          `/manual-payment.html?contestantId=${contestantId}&votes=${qty}`;
      }

      return;
    }

    window.location.href =
      data.authorization_url;

  } catch (err) {
    console.error(err);
    alert("Payment failed");
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


/* ===============================
   Loop
================================ */
const prevVotes = lastVotesSnapshot[id] || 0;
const growth = votes - prevVotes;

lastVotesSnapshot[id] = votes;

// 🔥 trending logic
const badge = document.getElementById(`badge-${id}`);

if (badge) {
  if (growth > 20) {
    badge.style.display = "block";
    badge.textContent = "🔥 Trending";
  } else {
    badge.style.display = "none";
  }
}

if (bar) {
  if (percent >= 75) {
    bar.style.background =
      "linear-gradient(90deg, #facc15, #f59e0b)";
  } else if (percent >= 50) {
    bar.style.background =
      "linear-gradient(90deg, #3b82f6, #60a5fa)";
  } else {
    bar.style.background =
      "linear-gradient(90deg, #22c55e, #4ade80)";
  }
}