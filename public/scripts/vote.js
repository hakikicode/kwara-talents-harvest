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
   LOAD + SYNC GITHUB → FIREBASE
================================ */
async function loadContestants() {
  try {
    const res = await fetch("https://www.kwaratalentsharvest.com.ng/api/contestants");
    const contestants = await res.json();

    // ✅ Sync to Firebase
    for (const c of contestants) {

      const dbRef = ref(db, `contestants/${c.id}`);
      const snap = await get(dbRef);

      if (!snap.exists()) {
        await set(dbRef, {
          image: c.image,
          votes: 0,
          created_at: Date.now()
        });
      }
    }

  } catch (err) {
    console.error("Error loading contestants:", err);
  }
}

/* ===============================
   LIVE RENDER FROM FIREBASE
================================ */
function startLiveVotes() {

  onValue(ref(db, "contestants"), snap => {

    const data = snap.val();
    if (!data) return;

    list.innerHTML = "";

    let maxVotes = 0;

    // find max votes
    Object.values(data).forEach(c => {
      if ((c.votes || 0) > maxVotes) {
        maxVotes = c.votes;
      }
    });

    // render cards
    Object.entries(data)
      .sort((a, b) => (b[1].votes || 0) - (a[1].votes || 0))
      .forEach(([id, c]) => {

        const percent =
          maxVotes === 0 ? 0 : (c.votes / maxVotes) * 100;

        const card = document.createElement("div");
        card.className = "vote-card";

        card.innerHTML = `
          <img src="${c.image}" 
            onerror="this.src='assets/default.png'">

          <p class="votes">🔥 ${c.votes || 0} Votes</p>

          <div class="progress">
            <div class="bar" id="bar-${id}" style="width:${percent}%"></div>
          </div>

          <input type="number" min="1" value="1" id="qty-${id}" />

          <button onclick="startVote('${id}')">
            🗳 Vote — ₦${VOTE_PRICE}
          </button>
        `;

        list.appendChild(card);
      });

  });
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
        email,
        contestantId,
        votes: qty
      })
    });

    const data = await res.json();

    if (!data.authorization_url) {
      console.error(data);
      alert("Payment initialization failed");
      return;
    }

    window.location.href = data.authorization_url;

  } catch (err) {
    alert("Payment failed");
    console.error(err);
  }
};

/* ===============================
   SUCCESS MESSAGE
================================ */
if (new URLSearchParams(location.search).get("success")) {
  alert("✅ Payment successful! Votes added.");
}

/* ===============================
   INIT
================================ */
(async () => {
  await loadContestants();   // sync first
  startLiveVotes();          // then listen
})();