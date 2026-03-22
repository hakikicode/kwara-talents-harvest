import { db } from "../firebase/setup.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";


async function loadContestants() {

  const res = await fetch("/api/contestants");
  const contestants = await res.json();

  list.innerHTML = "";

  contestants.forEach(c => {

    const card = document.createElement("div");
    card.className = "vote-card";

    card.innerHTML = `
      <img src="${c.image}"
           onerror="this.src='assets/default.png'">

      <p class="votes">🔥 0 Votes</p>

      <input type="number" min="1" value="1" id="qty-${c.id}" />

      <button class="btn vote-btn"
        onclick="startVote('${c.id}')">
        🗳 Vote Now — ₦${VOTE_PRICE}
      </button>

      <div class="share-box">
      <button onclick="copyLink('${location.origin}/contestant.html?id=${id}')">
       🔗 Copy
      </button>
    </div>

        <a target="_blank"
          href="https://wa.me/?text=Vote for ${id} ${link}">
          WhatsApp
        </a>
      </div>
    `;

    list.appendChild(card);
  });
}

loadContestants();

window.startVote = async (contestantId) => {

  const email = prompt("Enter your email:");
  if (!email) return;

  const qty = document.getElementById(`qty-${contestantId}`).value || 1;

  try {
    const res = await fetch("/api/initialize-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        contestantId,
        votes: Number(qty)
      })
    });

    const data = await res.json();

    // 🔥 PAYSTACK POPUP (better UX)
    window.location.href = data.authorization_url;

  } catch (err) {
    alert("Payment failed");
    console.error(err);
  }
};

window.copyLink = link => {
  navigator.clipboard.writeText(link);
  alert("Link copied!");
};