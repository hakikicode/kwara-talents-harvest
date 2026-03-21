const popupKey = "kth_flash_seen";

window.onload = () => {
  if (!localStorage.getItem(popupKey)) {
    document.getElementById("flashPopup").style.display = "flex";
    localStorage.setItem(popupKey, "true");
  }
};

function closeFlash() {
  document.getElementById("flashPopup").style.display = "none";
}

const slides = document.querySelectorAll(".hero-slide");
const nextBtn = document.querySelector(".hero-nav.next");
const prevBtn = document.querySelector(".hero-nav.prev");

let index = 0;
let timer;

function showSlide(i, dir = "next") {
  slides.forEach(s => s.classList.remove("active", "exit-left"));

  if (dir === "next" && index > 0) {
    slides[index - 1]?.classList.add("exit-left");
  }

  slides[i].classList.add("active");
}

function nextSlide() {
  index = (index + 1) % slides.length;
  showSlide(index, "next");
}

function prevSlide() {
  index = (index - 1 + slides.length) % slides.length;
  showSlide(index, "prev");
}

nextBtn.onclick = () => {
  clearInterval(timer);
  nextSlide();
  auto();
};

prevBtn.onclick = () => {
  clearInterval(timer);
  prevSlide();
  auto();
};

function auto() {
  timer = setInterval(nextSlide, 4000);
}

auto();


// ======= REGISTRATION COUNTDOWN =======
function updateRegistrationStatus() {
  const registerButtons = document.querySelectorAll('a[href="register.html"]');
  const popupCountdown = document.getElementById("popupCountdown");
  const pageCountdown = document.getElementById("pageCountdown");
  const popupTitle = document.getElementById("popupTitle");

  registerButtons.forEach(btn => {
    btn.href = "#";
    btn.classList.add("disabled");

    btn.onclick = (e) => {
      e.preventDefault();
      alert("Registration is closed. Voting is now live.");
    };

    btn.innerText = "Registration Closed";
  });

  if (popupTitle) popupTitle.innerText = "Registration Closed";
  if (popupCountdown) popupCountdown.innerText = "Voting is now LIVE 🔥";
  if (pageCountdown) pageCountdown.innerText = "Voting is LIVE 🔥";
}

// Run every second
updateRegistrationStatus();


// ======= VOTING STATE =======

let votingOpen = true;

function checkVotingState() {
  votingOpen = true;
  loadContestants();
}

checkVotingState();

    // Change hero button
document.querySelectorAll(".hero-actions a").forEach(btn => {
  if (btn.getAttribute("href") === "vote.html") {
    btn.innerText = "Vote Now";
    btn.classList.remove("outline");
    btn.classList.add("primary");
    }
  });

import { db } from "../firebase/setup.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

function loadContestants() {
  const container = document.getElementById("contestants");

  if (!container) return;

  onValue(ref(db, "contestants"), snap => {
    container.innerHTML = "";

    const data = snap.val() || {};

    Object.entries(data).forEach(([id, c]) => {
      if (c.status !== "approved") return;

      const card = document.createElement("div");
      card.className = "vote-card";

      card.innerHTML = `
        <img src="${c.image || 'assets/default.png'}">

        <h4>${c.stage_name}</h4>
        <p>${c.full_name}</p>

        <p>🔥 ${c.votes || 0} Votes</p>

        <button class="btn vote-btn"
          onclick="voteFromLanding('${id}', '${c.stage_name}')">
        🗳 Vote Now
      </button>
      `;

      container.appendChild(card);
    });
  });
}

window.voteFromLanding = (id, name) => {
  window.location.href = `vote.html`;
};