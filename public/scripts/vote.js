const MAX_VOTES_TARGET = 250;

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

    if (!res.ok) {
      const text = await res.text();
      console.error("API ERROR:", text);
      throw new Error("Failed to load contestants");
    }

    const contestants = await res.json();

    list.innerHTML = "";

    for (const c of contestants) {

      const id = safeId(c.id);

      // ✅ Ensure exists in Firebase (ONLY ONCE PER CONTESTANT)
      const dbRef = ref(db, `contestants/${id}`);
      const snap = await get(dbRef);

      if (!snap.exists()) {
        await set(dbRef, {
          image: c.image,
          votes: 0,
          created_at: Date.now()
        });
      }

      const link = `${location.origin}/contestant.html?id=${id}`;

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

          <p class="urgency" id="urgency-${id}"></p>

          <a target="_blank"
           href="https://wa.me/?text=Vote for contestant ${id} ${link}">
           WhatsApp
          </a>

          <a target="_blank"
            href="https://www.facebook.com/sharer/sharer.php?u=${link}">
            Facebook
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
    console.error("❌ Failed loading contestants:", err);
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

      // ✅ Update percentage
      const percentEl = document.getElementById(`percent-${id}`);
      if (percentEl) {
        percentEl.textContent = percent.toFixed(1) + "%";
      }

      // ✅ Progress bar
      const bar = document.getElementById(`bar-${id}`);
      if (bar) {
        bar.style.width = percent + "%";
      }

      // ===============================
      // 🔥 TRENDING + GROWTH
      // ===============================
      const prevVotes = lastVotesSnapshot[id] || 0;
      const growth = votes - prevVotes;

      lastVotesSnapshot[id] = votes;

      // ✅ LIVE POP + SOUND
      if (growth > 0) {
        showVotePop(growth);

        voteSound.currentTime = 0;
        voteSound.play().catch(() => {});
      }

      // ===============================
      // 🏆 BADGE
      // ===============================
      const badge = document.getElementById(`badge-${id}`);

      if (badge) {
        if (growth > 20) {
          badge.style.display = "block";
          badge.textContent = "🔥 Trending";
        } else {
          badge.style.display = "none";
        }
      }

      // ===============================
      // 🚨 URGENCY
      // ===============================
      const urgencyEl = document.getElementById(`urgency-${id}`);

      if (urgencyEl) {
        if (percent >= 90) {
          urgencyEl.textContent = "⚡ Almost full!";
        } else if (percent >= 75) {
          urgencyEl.textContent = "🔥 Going fast!";
        } else if (percent >= 50) {
          urgencyEl.textContent = "🚀 Halfway there!";
        } else {
          urgencyEl.textContent = "";
        }
      }

      // ===============================
      // 🎯 COLOR
      // ===============================
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

      sortable.push({
        id,
        votes,
        element: cardsMap[id].element
      });

    });

    // ✅ Sort leaderboard
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
    Number(document.getElementById(`qty-${contestantId}`).value) || 1;

  try {

    const res = await fetch("/api/initialize-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        contestantId,
        votes: qty
      })
    });

    const data = await res.json().catch(() => ({}));

    if (!data.reference) {
      alert("Payment initialization failed");
      return;
    }

    // ✅ POPUP PAYMENT
    const handler = PaystackPop.setup({
      key: data.publicKey, // send this from backend
      email,
      amount: data.amount,
      ref: data.reference,

      callback: function (response) {

        // ✅ SUCCESS
        alert("✅ Payment successful! Updating votes...");

        refreshVotesInstant(contestantId, qty); // ✅ instant refresh for better UX

        // 🔥 WAIT for webhook to update DB
        setTimeout(() => {
            location.reload(); // safest sync with Firebase
        }, 3000);
      },

      onClose: function () {
        console.log("Payment window closed");
      }
    });

    handler.openIframe();

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

  const params = new URLSearchParams(location.search);

  if (params.get("success")) {
    alert("✅ Payment successful!");
  }
})();

/* ===============================
   POPUP
================================ */
function showVotePop(votes) {
  const feed = document.getElementById("live-feed");

  const el = document.createElement("div");
  el.className = "vote-pop";

  el.textContent = `🔥 Someone just voted ${votes} vote${votes > 1 ? "s" : ""}`;

  feed.appendChild(el);

  setTimeout(() => el.remove(), 5000);
}

/* ===============================
   SOUND
================================ */
const voteSound = new Audio("https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3");

setInterval(() => {
  const fakeVotes = Math.floor(Math.random() * 5) + 1;
  showVotePop(fakeVotes);
}, 15000);


function refreshVotesInstant(contestantId, qty) {

  const percentEl = document.getElementById(`percent-${contestantId}`);
  const bar = document.getElementById(`bar-${contestantId}`);

  if (!percentEl || !bar) return;

  // fake increase instantly
  const currentPercent = parseFloat(percentEl.textContent) || 0;

  const addedPercent = (qty / MAX_VOTES_TARGET) * 100;

  const newPercent = Math.min(currentPercent + addedPercent, 100);

  percentEl.textContent = newPercent.toFixed(1) + "%";
  bar.style.width = newPercent + "%";

  showVotePop(qty);
}