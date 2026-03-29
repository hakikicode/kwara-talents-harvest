import { db } from "../firebase/setup.js";
import { ref, get } from
"https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const id = new URLSearchParams(location.search).get("id");
const link = location.href;

// 🔥 1. Fetch FULL contestant data (API)
const apiRes = await fetch("/api/contestants");
const allContestants = await apiRes.json();

const apiData = allContestants.find(c => 
  c.id.replace(/\.[^/.]+$/, "").replace(/[.#$\[\]]/g, "") === id
);

// 🔥 2. Fetch votes from Firebase
const snap = await get(ref(db, "contestants/" + id));
const fbData = snap.val() || {};

const c = {
  ...apiData,
  ...fbData
};

if (!c) {
  document.getElementById("profile").innerHTML =
    "<h2>Contestant not found</h2>";
  throw new Error("Invalid contestant");
}


document.getElementById("profile").innerHTML = `
  <div class="profile-card">
    <img src="${c.image || 'assets/default.png'}">

    <h1>${c.stage_name || id}</h1>
    <p>${c.full_name || ""}</p>
    <p class="bio">${c.bio || "No bio provided"}</p>

    <div class="stats">
      <div><b>${c.votes || 0}</b><span>Votes</span></div>
      <div><b>${c.talents?.length || 1}</b><span>Talents</span></div>
    </div>

    <div class="vote-box">
      <label>Number of Votes</label>
      <input type="number" id="count" min="1" value="1">

      <p class="price">
        Total: ₦<span id="amount">350</span>
      </p>

      <button onclick="vote()">
        Vote Now
      </button>
    </div>

    <h3>Share Contestant</h3>
    <div class="share-box">
      <button onclick="copyLink()">🔗 Copy Link</button>
      <a target="_blank"
        href="https://wa.me/?text=Vote for ${c.stage_name} ${link}">
        WhatsApp
      </a>
      <a target="_blank"
        href="https://twitter.com/intent/tweet?url=${link}">
        X
      </a>
      <a target="_blank"
        href="https://www.facebook.com/sharer/sharer.php?u=${link}">
        Facebook
      </a>
    </div>
  </div>
`;

const VOTE_PRICE = 350;

document.getElementById("count").oninput = e => {
  const qty = Math.max(1, e.target.value);
  document.getElementById("amount").textContent = qty * VOTE_PRICE;
};

window.copyLink = () => {
  navigator.clipboard.writeText(link);
  alert("Link copied!");
};

window.vote = async () => {

  const qty = Number(document.getElementById("count").value);
  const email = prompt("Enter your email:");

  if (!email) return;

  try {

    const res = await fetch("/api/initialize-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        contestantId: id,
        votes: qty
      })
    });

    const data = await res.json();

    if (!data.reference) {
      alert("Payment init failed");
      return;
    }

    const handler = PaystackPop.setup({
      key: data.publicKey,
      email,
      amount: data.amount,
      ref: data.reference,

      callback: async function (response) {

        alert("✅ Payment successful!");

        await fetch("/api/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reference: response.reference
          })
        });

        location.reload();
      }
    });

    handler.openIframe();

  } catch (err) {
    console.error(err);
    alert("Payment failed");
  }
};