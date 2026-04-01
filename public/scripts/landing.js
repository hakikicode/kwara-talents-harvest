import { db } from "../firebase/setup.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const popupKey = "kth_flash_seen";
const VOTING_END_AT = new Date("2026-04-01T01:00:00+01:00");
const COUNTDOWN_TIMEZONE = "Africa/Lagos";

const slides = document.querySelectorAll(".hero-slide");
const nextBtn = document.querySelector(".hero-nav.next");
const prevBtn = document.querySelector(".hero-nav.prev");
const popup = document.getElementById("flashPopup");
const popupTitle = document.getElementById("popupTitle");
const popupCountdown = document.getElementById("popupCountdown");
const pageCountdown = document.getElementById("pageCountdown");
const voteLinks = document.querySelectorAll('a[href="vote.html"], .vote-entry');
const registerButtons = document.querySelectorAll('a[href="register.html"]');
const timelineItems = document.querySelectorAll(".timeline li");

let index = 0;
let timer;
let countdownTimer;

function isVotingClosed() {
  return Date.now() >= VOTING_END_AT.getTime();
}

function formatTimeLeft(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  parts.push(`${hours}h`, `${minutes}m`, `${seconds}s`);
  return parts.join(" ");
}

function formatDeadline(date) {
  return new Intl.DateTimeFormat("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: COUNTDOWN_TIMEZONE
  }).format(date);
}

function setTimelineStage(stage) {
  timelineItems.forEach(item => {
    item.classList.toggle("active", item.dataset.stage === stage);
  });
}

function disableVoteLinks(message) {
  voteLinks.forEach(link => {
    link.setAttribute("href", "#");
    link.classList.add("disabled");
    link.setAttribute("aria-disabled", "true");
    link.onclick = event => {
      event.preventDefault();
      alert(message);
    };

    if (link.textContent.trim().toLowerCase().includes("vote")) {
      link.textContent = "Voting Closed";
    }
  });
}

function enableVoteLinks() {
  voteLinks.forEach(link => {
    link.setAttribute("href", "vote.html");
    link.classList.remove("disabled");
    link.removeAttribute("aria-disabled");
    link.onclick = null;
  });
}

function updateRegistrationStatus() {
  registerButtons.forEach(btn => {
    btn.href = "#";
    btn.classList.add("disabled");
    btn.onclick = event => {
      event.preventDefault();
      alert("Registration is closed. Voting is now live.");
    };
    btn.innerText = "Registration Closed";
  });
}

function updateVotingUI() {
  const closed = isVotingClosed();
  const deadlineLabel = formatDeadline(VOTING_END_AT);

  if (closed) {
    if (popupTitle) popupTitle.innerText = "Voting Closed";
    if (popupCountdown) {
      popupCountdown.innerText = `Voting closed at ${deadlineLabel}. Finale is the next stage.`;
    }
    if (pageCountdown) {
      pageCountdown.innerText = `Voting closed at ${deadlineLabel}.`;
    }

    disableVoteLinks("Voting closed at 1:00 AM on April 1, 2026. The event has moved to the next stage.");
    setTimelineStage("finale");
    return;
  }

  const timeLeft = VOTING_END_AT.getTime() - Date.now();
  const countdownText = `Voting closes in ${formatTimeLeft(timeLeft)}. Deadline: ${deadlineLabel}.`;

  if (popupTitle) popupTitle.innerText = "Registration Closed";
  if (popupCountdown) popupCountdown.innerText = countdownText;
  if (pageCountdown) pageCountdown.innerText = countdownText;

  enableVoteLinks();
  setTimelineStage("voting");
}

window.onload = () => {
  if (popup && !localStorage.getItem(popupKey)) {
    popup.style.display = "flex";
    localStorage.setItem(popupKey, "true");
  }
};

window.closeFlash = function closeFlash() {
  if (popup) popup.style.display = "none";
};

function showSlide(i, dir = "next") {
  slides.forEach(slide => slide.classList.remove("active", "exit-left"));

  if (dir === "next" && index > 0) {
    slides[index - 1]?.classList.add("exit-left");
  }

  slides[i]?.classList.add("active");
}

function nextSlide() {
  index = (index + 1) % slides.length;
  showSlide(index, "next");
}

function prevSlide() {
  index = (index - 1 + slides.length) % slides.length;
  showSlide(index, "prev");
}

if (nextBtn) {
  nextBtn.onclick = () => {
    clearInterval(timer);
    nextSlide();
    auto();
  };
}

if (prevBtn) {
  prevBtn.onclick = () => {
    clearInterval(timer);
    prevSlide();
    auto();
  };
}

function auto() {
  timer = setInterval(nextSlide, 4000);
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getContestantDisplay(contestant, id) {
  const stageName = String(contestant.stage_name || "").trim();
  const fullName = String(contestant.full_name || "").trim();

  return {
    stageName: stageName || id,
    fullName: fullName || `Contestant ID: ${id}`
  };
}

function loadContestants() {
  const container = document.getElementById("contestants");
  if (!container) return;

  onValue(ref(db, "contestants"), snap => {
    container.innerHTML = "";

    const data = snap.val() || {};
    const seenApproved = new Set();

    Object.entries(data).forEach(([id, contestant]) => {
      if (contestant.status !== "approved") return;

      const identityKey = [
        normalizeText(contestant.stage_name) || id,
        normalizeText(contestant.full_name) || id
      ].join("|");

      if (seenApproved.has(identityKey)) return;
      seenApproved.add(identityKey);

      const card = document.createElement("div");
      card.className = "contestant-card landing-contestant-card";

      const actionLabel = isVotingClosed() ? "Voting Closed" : "Vote Now";
      const display = getContestantDisplay(contestant, id);

      card.innerHTML = `
        <img src="${contestant.image || "assets/default.png"}" alt="${display.stageName}">
        <div class="info">
          <h4>${display.stageName}</h4>
          <p>${display.fullName}</p>
          <p>${contestant.votes || 0} Votes</p>
          <button class="btn vote-btn" onclick="voteFromLanding('${id}')" ${isVotingClosed() ? "disabled" : ""}>
            ${actionLabel}
          </button>
        </div>
      `;

      container.appendChild(card);
    });
  });
}

window.voteFromLanding = contestantId => {
  if (isVotingClosed()) {
    alert("Voting closed at 1:00 AM on April 1, 2026. The event has moved to the next stage.");
    return;
  }

  window.location.href = `vote.html?id=${contestantId}`;
};

updateRegistrationStatus();
updateVotingUI();
loadContestants();
auto();

countdownTimer = setInterval(() => {
  updateVotingUI();
}, 1000);
