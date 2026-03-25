import { db } from "../firebase/setup.js";
import {
  ref,
  get, 
  set,
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

    for (const c of contestants) {

      // 🔥 STEP 1: Ensure contestant exists in Firebase
      const dbRef = ref(db, `contestants/${c.id}`);
      const snap = await get(dbRef);

      if (!snap.exists()) {
        await set(dbRef, {
          image: c.image,
          votes: 0,
          created_at: Date.now()
        });
      }

      const safeId = c.id
        .replace(/\.[^/.]+$/, "")
        .replace(/[.#$\[\]]/g, "");

      // 🔥 STEP 2: Render UI
      const link = `${location.origin}/contestant.html?id=${safeId}`;

      const card = document.createElement("div");
      card.className = "vote-card";

      card.innerHTML = `
        <img src="${c.image}"
          class="contestant-img"
          loading="lazy"
          onerror="this.src='assets/default.png'">

        <p class="votes">🔥 0 Votes</p>

        <div class="progress">
          <div class="bar" id="bar-${safeId}" style="width:0%"></div>
        </div>

        <input type="number" min="1" value="1" id="qty-${safeId}" />

        <button class="btn vote-btn"
          onclick="startVote('${safeId}')">
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

      cardsMap[c.id] = {
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
   SINGLE LIVE VOTE LISTENER
   (EXTREMELY OPTIMIZED)
================================ */
function startLiveVotes() {

  onValue(ref(db, "contestants"), snap => {

    const data = snap.val();
    if (!data) return;

    let maxVotes = 0;

    // find highest votes (for scaling)
    Object.values(data).forEach(c => {
      if ((c.votes || 0) > maxVotes) {
        maxVotes = c.votes;
      }
    });

    const sortable = [];

    Object.entries(data).forEach(([id, c]) => {

      if (!cardsMap[id]) return;

      const votes = c.votes || 0;

      // ✅ Update text
      cardsMap[id].votesEl.textContent =
        `🔥 ${votes} Votes`;

      // ✅ Update progress bar
      const bar = document.getElementById(`bar-${id}`);

      if (bar) {
        const percent =
          maxVotes === 0 ? 0 : (votes / maxVotes) * 100;

        bar.style.width = percent + "%";
      }

      sortable.push({
        id,
        votes,
        element: cardsMap[id].element
      });
    });

    // ✅ AUTO SORT (leaderboard)
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

  // Anti-spam
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
        email, // ✅ FIXED
        contestantId,
        votes: qty
      })
    });

    const data = await res.json();

    if (!data.authorization_url) {

      console.error(data);

      const manual = confirm(
        "Payment failed.\n\nDo you want to pay manually?"
      );

      if (manual) {
        window.location.href =
          `/manual-payment.html?contestantId=${contestantId}&votes=${qty}`;
      }

      return;
    }

    // ✅ Redirect to Paystack
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

