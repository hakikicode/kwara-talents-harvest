const MAX_VOTES_TARGET = 210;
const VOTE_PRICE = 350;
const VOTING_END_AT = new Date("2026-04-07T23:59:59+01:00");
const COUNTDOWN_TIMEZONE = "Africa/Lagos";

import { db } from "../firebase/setup.js";
import {
  ref,
  get,
  set,
  onValue,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const list = document.getElementById("contestants");
const statusBanner = document.getElementById("votingStatusBanner");
const countdownText = document.getElementById("votingCountdownText");

const cardsMap = {};
const lastVotesSnapshot = {};

let selectedContestant = null;
let votingClosed = false;

function safeId(id) {
  return id
    .replace(/\.[^/.]+$/, "")
    .replace(/[.#$\[\]]/g, "");
}

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

function showToast(msg) {
  const el = document.getElementById("toast");
  if (!el) {
    alert(msg);
    return;
  }

  el.textContent = msg;
  el.style.display = "block";
  setTimeout(() => {
    el.style.display = "none";
  }, 3000);
}

function updateVotingStatusUI() {
  votingClosed = isVotingClosed();
  const deadlineLabel = formatDeadline(VOTING_END_AT);

  if (statusBanner && countdownText) {
    if (votingClosed) {
      statusBanner.style.background = "#2f1313";
      countdownText.textContent = ` Voting closed at ${deadlineLabel}. Payments are disabled.`;
    } else {
      statusBanner.style.background = "";
      countdownText.textContent = ` Voting closes in ${formatTimeLeft(VOTING_END_AT.getTime() - Date.now())}. Deadline: ${deadlineLabel}.`;
    }
  }

  document.querySelectorAll(".vote-btn").forEach(button => {
    button.disabled = votingClosed;
    button.textContent = votingClosed ? "Voting Closed" : `Vote Now - ₦${VOTE_PRICE}`;
  });

  document.querySelectorAll('input[id^="qty-"]').forEach(input => {
    input.disabled = votingClosed;
  });

  if (votingClosed) {
    window.closeModal();
  }
}

async function loadContestants() {
  try {
    const [apiRes, dbSnap] = await Promise.all([
      fetch("https://www.kwaratalentsharvest.com.ng/api/contestants"),
      get(ref(db, "contestants"))
    ]);

    if (!apiRes.ok) throw new Error("API failed");

    const contestants = await apiRes.json();
    const dbData = dbSnap.val() || {};

    list.innerHTML = "";

    for (const contestant of contestants) {
      const id = safeId(contestant.id);

      if (!dbData[id]) {
        await set(ref(db, `contestants/${id}`), {
          image: contestant.image,
          votes: 0,
          created_at: Date.now()
        });
      }

      const link = `${location.origin}/contestant.html?id=${id}`;
      const card = document.createElement("div");
      card.className = "vote-card";

      card.innerHTML = `
        <img src="${contestant.image}" class="contestant-img"
          loading="lazy"
          onerror="this.src='assets/default.png'">

        <p class="votes" id="percent-${id}">0%</p>

        <div class="progress">
          <div class="bar" id="bar-${id}"></div>
        </div>

        <input type="number" min="1" value="1" id="qty-${id}" ${isVotingClosed() ? "disabled" : ""} />

        <button class="btn vote-btn"
          onclick="startVote('${id}')"
          ${isVotingClosed() ? "disabled" : ""}>
          ${isVotingClosed() ? "Voting Closed" : `Vote Now - ₦${VOTE_PRICE}`}
        </button>

        <div class="badge" id="badge-${id}"></div>

        <div class="share-box">
          <button onclick="copyLink('${link}')">Copy</button>
          <p class="urgency" id="urgency-${id}"></p>

          <a target="_blank"
           href="https://wa.me/?text=Vote for contestant ${id} ${link}">
           WhatsApp
          </a>

          <a target="_blank"
            href="https://www.facebook.com/sharer/sharer.php?u=${link}">
            Facebook
          </a>
        </div>
      `;

      cardsMap[id] = { element: card };
      list.appendChild(card);
    }

    updateVotingStatusUI();
  } catch (err) {
    console.error("Load error:", err);
    showToast("Failed to load contestants");
  }
}

function startLiveVotes() {
  onValue(ref(db, "contestants"), snap => {
    const data = snap.val();
    if (!data) return;

    const sortable = [];

    Object.entries(data).forEach(([id, contestant]) => {
      if (!cardsMap[id]) return;

      const votes = contestant.votes || 0;
      const percent = Math.min((votes / MAX_VOTES_TARGET) * 100, 100);

      const percentEl = document.getElementById(`percent-${id}`);
      const bar = document.getElementById(`bar-${id}`);
      const badge = document.getElementById(`badge-${id}`);
      const urgencyEl = document.getElementById(`urgency-${id}`);

      if (percentEl) percentEl.textContent = `${percent.toFixed(1)}%`;
      if (bar) bar.style.width = `${percent}%`;

      const prevVotes = lastVotesSnapshot[id] || 0;
      const growth = votes - prevVotes;
      lastVotesSnapshot[id] = votes;

      if (growth > 0) {
        showVotePop(growth);
        voteSound.currentTime = 0;
        voteSound.play().catch(() => {});
      }

      if (badge) {
        badge.style.display = growth > 20 ? "block" : "none";
        if (growth > 20) badge.textContent = "Trending";
      }

      if (urgencyEl) {
        urgencyEl.textContent =
          percent >= 90 ? "Almost full!" :
          percent >= 75 ? "Going fast!" :
          percent >= 50 ? "Halfway there!" : "";
      }

      if (bar) {
        bar.style.background =
          percent >= 75
            ? "linear-gradient(90deg, #facc15, #f59e0b)"
            : percent >= 50
            ? "linear-gradient(90deg, #3b82f6, #60a5fa)"
            : "linear-gradient(90deg, #22c55e, #4ade80)";
      }

      sortable.push({
        votes,
        element: cardsMap[id].element
      });
    });

    sortable
      .sort((a, b) => b.votes - a.votes)
      .forEach(item => list.appendChild(item.element));
  });
}

async function refreshVotesInstant(contestantId, qty) {
  await runTransaction(
    ref(db, `contestants/${contestantId}/votes`),
    currentVotes => (currentVotes || 0) + qty
  );
}

window.startVote = contestantId => {
  if (isVotingClosed()) {
    updateVotingStatusUI();
    showToast("Voting closes on April 6, 2026 at 11:59 PM.");
    return;
  }

  selectedContestant = contestantId;

  const qty = Number(document.getElementById(`qty-${contestantId}`)?.value) || 1;

  document.getElementById("voteQty").value = qty;
  document.getElementById("voteAmount").textContent = qty * VOTE_PRICE;

  document.getElementById("voteQty").oninput = event => {
    const value = Math.max(1, Number(event.target.value) || 1);
    event.target.value = value;
    document.getElementById("voteAmount").textContent = value * VOTE_PRICE;
  };

  const savedEmail = localStorage.getItem("user_email");
  if (savedEmail) {
    document.getElementById("voteEmail").value = savedEmail;
  }

  document.getElementById("voteModal").classList.remove("hidden");
};

async function startVoteBackend(contestantId, email, qty) {
  let data;

  try {
    const res = await fetch("/api/initialize-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, contestantId, votes: qty })
    });

    data = await res.json();
    if (!data.reference) throw new Error("Payment init failed");
  } catch {
    showToast("Payment failed. Switching to manual payment.");
    return window.goManual(contestantId, qty);
  }

  const handler = PaystackPop.setup({
    key: data.publicKey,
    email,
    amount: data.amount,
    ref: data.reference,
    callback: res => handlePaymentSuccess(res, contestantId, qty)
  });

  handler.openIframe();
}

async function handlePaymentSuccess(res, contestantId, qty) {
  try {
    const verify = await fetch("/api/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: res.reference })
    });

    const result = await verify.json();
    if (!result.success) throw new Error("Verification failed");

    await refreshVotesInstant(contestantId, qty);
    showToast("Votes added!");
  } catch {
    showToast("Verification failed");
  }
}

window.copyLink = link => {
  navigator.clipboard.writeText(link);
  showToast("Link copied!");
};

window.goManual = (id, qtyOverride) => {
  if (isVotingClosed()) {
    updateVotingStatusUI();
    showToast("Voting is closed.");
    return;
  }

  const qty = qtyOverride || Number(document.getElementById(`qty-${id}`)?.value) || 1;
  location.href = `./manual-payment.html?contestantId=${id}&votes=${qty}`;
};

window.closeModal = () => {
  document.getElementById("voteModal").classList.add("hidden");
};

window.payWithPaystack = () => {
  if (isVotingClosed()) {
    updateVotingStatusUI();
    return showToast("Voting is closed.");
  }

  const email = document.getElementById("voteEmail").value.trim();
  const qty = Math.max(1, Number(document.getElementById("voteQty").value) || 1);

  if (!email) return showToast("Enter email");

  localStorage.setItem("user_email", email);
  window.closeModal();
  startVoteBackend(selectedContestant, email, qty);
};

window.payManual = () => {
  if (isVotingClosed()) {
    updateVotingStatusUI();
    return showToast("Voting is closed.");
  }

  const email = document.getElementById("voteEmail").value.trim();

  if (!email) return showToast("Enter email");

  localStorage.setItem("user_email", email);
  window.closeModal();
  const qty = Math.max(1, Number(document.getElementById("voteQty").value) || 1);
  window.goManual(selectedContestant, qty);
};

function showVotePop(votes) {
  const feed = document.getElementById("live-feed");
  if (!feed) return;

  const el = document.createElement("div");
  el.className = "vote-pop";
  el.textContent = `Someone voted ${votes}`;

  feed.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

const voteSound = new Audio(
  "https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3"
);

(async () => {
  await loadContestants();
  startLiveVotes();
  updateVotingStatusUI();
  setInterval(updateVotingStatusUI, 1000);
})();
