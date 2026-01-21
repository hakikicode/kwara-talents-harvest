import { db } from "../firebase/setup.js";
import { ref, get } from
"https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const id = new URLSearchParams(location.search).get("id");
const link = location.href;

const snap = await get(ref(db, "contestants/" + id));
const c = snap.val();

document.getElementById("profile").innerHTML = `
  <div class="profile-card">
    <img src="${c.image || 'assets/default.png'}">

    <h1>${c.stage_name}</h1>
    <p>${c.full_name}</p>
    <p class="bio">${c.bio || "No bio provided"}</p>

    <div class="stats">
      <div><b>${c.votes || 0}</b><span>Votes</span></div>
      <div><b>${c.talents?.length || 1}</b><span>Talents</span></div>
    </div>

    <div class="vote-box">
      <label>Number of Votes</label>
      <input type="number" id="count" min="1" value="1">

      <p class="price">
        Total: ₦<span id="amount">400</span>
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

document.getElementById("count").oninput = e => {
  const qty = Math.max(1, e.target.value);
  document.getElementById("amount").textContent = qty * 400;
};

window.copyLink = () => {
  navigator.clipboard.writeText(link);
  alert("Link copied!");
};

window.vote = () => {
  const qty = document.getElementById("count").value;
  alert(`Proceed to pay ₦${qty * 400} via Opay (coming next)`);
};
