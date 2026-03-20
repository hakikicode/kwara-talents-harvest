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
const registrationDeadline = new Date("2026-03-15T23:59:59").getTime(); // Tomorrow midnight 

function updateRegistrationStatus() {
  const now = new Date().getTime();
  const timeLeft = registrationDeadline - now;

  const registerButtons = document.querySelectorAll('a[href="register.html"]');
  const popupCountdown = document.getElementById("popupCountdown");
  const pageCountdown = document.getElementById("pageCountdown");
  const popupTitle = document.getElementById("popupTitle");

  if (timeLeft <= 0) {
    // ===== CLOSED STATE =====
    registerButtons.forEach(btn => {
      btn.href = "#";
      btn.classList.add("disabled");
      btn.onclick = (e) => {
        e.preventDefault();
        alert("Registration is closed. Shortlisted candidates will be contacted and voting will open soon.");
      };
      btn.innerText = "Registration Closed";
    });

    if (popupTitle) {
      popupTitle.innerText = "Registration Closed";
    }

    if (popupCountdown) {
      popupCountdown.innerText = "Shortlisted candidates will be contacted. Voting opens soon.";
    }

    if (pageCountdown) {
      pageCountdown.innerText = "Registration Closed • Voting opens soon";
    }

    return;
  }

  // ===== COUNTDOWN STATE =====
  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  const text = `Registration closes in ${days}d ${hours}h ${minutes}m ${seconds}s`;

  if (popupCountdown) popupCountdown.innerText = text;
  if (pageCountdown) pageCountdown.innerText = text;
}

// Run every second
setInterval(updateRegistrationStatus, 1000);
updateRegistrationStatus();


// ======= VOTING STATE =======

const votingStartDate = new Date("2026-03-16T00:00:00").getTime();
let votingOpen = false;

function checkVotingState() {
  const now = new Date().getTime();

  if (now >= votingStartDate) {
    votingOpen = true;

    // Change hero button
    document.querySelectorAll(".hero-actions a").forEach(btn => {
      if (btn.innerText.includes("Voting")) {
        btn.innerText = "Vote Now";
        btn.href = "#contestants";
        btn.classList.remove("outline");
        btn.classList.add("primary");
      }
    });

    loadContestants();
  }
}

checkVotingState();

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

  if (!votingOpen) {
    alert("Voting has not started yet");
    return;
  }

  // redirect to full voting page
  window.location.href = `vote.html`;
};