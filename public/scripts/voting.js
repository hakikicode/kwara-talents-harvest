import { db } from "../firebase/setup.js";
import { ref, onValue } from
"https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const list = document.getElementById("contestants");

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

      <a href="contestant.html?id=${id}" class="btn">
        View & Vote
      </a>

      <div class="share-box">
        <button onclick="copyLink('${link}')">🔗 Copy Link</button>
        <a target="_blank"
          href="https://wa.me/?text=Vote for ${c.stage_name} on Kwara Talent Harvest ${link}">
          WhatsApp
        </a>
        <a target="_blank"
          href="https://www.facebook.com/sharer/sharer.php?u=${link}">
          Facebook
        </a>
      </div>
    `;
    list.appendChild(card);
  });
});

window.copyLink = link => {
  navigator.clipboard.writeText(link);
  alert("Contestant link copied!");
};
