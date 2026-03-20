import { db } from "../firebase/setup.js";
import { ref, onValue } from
"https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const list = document.getElementById("contestants");

const VOTE_PRICE = 350;

onValue(ref(db, "contestants"), snap => {
  list.innerHTML = "";
  const data = snap.val() || {};

  Object.entries(data).forEach(([id, c]) => {
    if (c.status !== "approved") return;

    const link = `${location.origin}/contestant.html?id=${id}`;

    const card = document.createElement("div");
    card.className = "vote-card";

    card.innerHTML = `
      <img src="${c.image || 'assets/default.png'}">

      <h3>${c.stage_name}</h3>
      <p>${c.full_name}</p>

      <p class="votes">Votes: ${c.votes || 0}</p>

      <button class="btn vote-btn"
        onclick="startVote('${id}','${c.stage_name}')">
        🗳 Vote Now — ₦${VOTE_PRICE}
      </button>

      <div class="share-box">
        <button onclick="copyLink('${link}')">🔗 Copy</button>

        <a target="_blank"
          href="https://wa.me/?text=Vote for ${c.stage_name} on Kwara Talent Harvest ${link}">
          WhatsApp
        </a>

        <a target="_blank"
          href="https://www.facebook.com/sharer/sharer.php?u=${link}">
          Facebook
        </a>

        <a target="_blank"
          href="https://twitter.com/intent/tweet?text=Vote for ${c.stage_name}&url=${link}">
          X
        </a>
      </div>
    `;

    list.appendChild(card);
  });
});
window.startVote = async (contestantId, name) => {

  const email = prompt("Enter your email to continue:");
  if (!email) return;

  try {
    const res = await fetch("/api/initialize-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        contestantId
      })
    });

    const data = await res.json();

    window.location.href = data.authorization_url;

  } catch (err) {
    alert("Payment failed");
    console.error(err);
  }
};