const list = document.getElementById("contestants");
const VOTE_PRICE = 350;

async function loadContestants() {

  try {

    const res = await fetch("https://www.kwaratalentsharvest.com.ng/api/contestants");
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
       onerror="this.src='assets/default.png'">

  <p class="votes">🔥 0 Votes</p>

  <input type="number" min="1" value="1" id="qty-${c.id}" />

  <button class="btn vote-btn"
    onclick="startVote('${c.id}')">
    🗳 Vote Now — ₦${VOTE_PRICE}
  </button>

  <div class="share-box">
    <button onclick="copyLink('${location.origin}/contestant.html?id=${c.id}')">
      🔗 Copy
    </button>

    <a target="_blank"
      href="https://wa.me/?text=Vote for contestant ${c.id}">
      WhatsApp
    </a>
  </div>
`;

      list.appendChild(card);
    });

  } catch (err) {
    console.error("Failed loading contestants:", err);
  }
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