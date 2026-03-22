import { db } from "../firebase/setup.js";
import {
  ref,
  onValue,
  update
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

/* ================= AUTH ================= */

const ADMIN_USER = "admin";
const ADMIN_PASS = "pass";

window.login = function () {
  if (username.value === ADMIN_USER && password.value === ADMIN_PASS) {
    localStorage.setItem("adminAuth", "true");
    loadDashboard();
  } else {
    alert("Invalid login details");
  }
};

window.logout = function () {
  localStorage.removeItem("adminAuth");
  location.reload();
};

/* ================= UI ================= */

const loginBox = document.getElementById("loginBox");
const dashboard = document.getElementById("dashboard");
const pendingList = document.getElementById("pendingList");
const approvedList = document.getElementById("approvedList");
const searchInput = document.getElementById("search");

const statTotal = document.getElementById("statTotal");
const statApproved = document.getElementById("statApproved");
const statPending = document.getElementById("statPending");
const statVotes = document.getElementById("statVotes");

function loadDashboard() {
  loginBox.style.display = "none";
  dashboard.style.display = "block";
  listenContestants();
}

/* ================= REALTIME DATA ================= */

function listenContestants() {
  onValue(ref(db, "contestants"), snap => {
    const data = snap.val() || {};
    renderContestants(data);
    updateStats(data);
  });
}

function renderContestants(data) {
  pendingList.innerHTML = "";
  approvedList.innerHTML = "";

  const search = searchInput.value.toLowerCase();

  Object.entries(data).forEach(([id, c]) => {
    if (
      search &&
      !(
        c.full_name?.toLowerCase().includes(search) ||
        c.stage_name?.toLowerCase().includes(search)
      )
    ) return;

    const card = document.createElement("div");
    card.className = "admin-card";
    card.onclick = () => openModal(c);

    card.innerHTML = `
      <h4>${c.stage_name || "No Stage Name"}</h4>
      <p>${c.full_name}</p>
      <small>Status: ${c.status || "pending"}</small>

      <div class="actions">
        ${
          c.status !== "approved"
            ? `<button onclick="approve('${id}', event)">Approve</button>`
            : ""
        }
        <button onclick="toggleVoting('${id}', ${!!c.voting_enabled}, event)">
          ${c.voting_enabled ? "Disable Voting" : "Enable Voting"}
        </button>
      </div>
    `;

    (c.status === "approved" ? approvedList : pendingList).appendChild(card);
  });
}

/* ================= ACTIONS ================= */

window.approve = function (id, e) {
  e.stopPropagation();
  update(ref(db, "contestants/" + id), { status: "approved" });
};

window.toggleVoting = function (id, current, e) {
  e.stopPropagation();
  update(ref(db, "contestants/" + id), {
    voting_enabled: !current
  });
};

/* ================= STATS ================= */

function updateStats(data) {
  let total = 0, approved = 0, pending = 0, votes = 0;

  Object.values(data).forEach(c => {
    total++;
    votes += c.votes || 0;
    c.status === "approved" ? approved++ : pending++;
  });

  statTotal.textContent = total;
  statApproved.textContent = approved;
  statPending.textContent = pending;
  statVotes.textContent = votes;
}

/* ================= CSV EXPORT ================= */

window.exportCSV = function () {
  const rows = [
    ["Full Name", "Stage Name", "Age", "Talents", "Votes", "Status"]
  ];

  onValue(ref(db, "contestants"), snap => {
    Object.values(snap.val() || {}).forEach(c => {
      rows.push([
        c.full_name,
        c.stage_name,
        c.age,
        (c.talents || []).join(" | "),
        c.votes || 0,
        c.status
      ]);
    });

    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "contestants.csv";
    a.click();
  }, { onlyOnce: true });
};

/* ================= MODAL ================= */

const modal = document.getElementById("modal");
const modalContent = document.getElementById("modalContent");

window.openModal = function (c) {
  modal.classList.remove("hidden");

  modalContent.innerHTML = `
    <h3>${c.stage_name || "No Stage Name"}</h3>
    <p><b>Full Name:</b> ${c.full_name}</p>
    <p><b>Age:</b> ${c.age}</p>
    <p><b>Gender:</b> ${c.gender || "—"}</p>
    <p><b>WhatsApp:</b> ${c.whatsapp}</p>

    <hr>

    <p><b>Talents:</b> ${(c.talents || []).join(", ")}</p>
    ${c.other_talent ? `<p><b>Other:</b> ${c.other_talent}</p>` : ""}

    <p><b>Bio:</b><br>${c.bio || "—"}</p>

    <hr>

    <h4>Social Tasks</h4>

    <p>📷 Instagram: ${c.social_tasks?.instagram?.username || "—"}<br>
      <a href="${c.social_tasks?.instagram?.proof}" target="_blank">View Proof</a>
    </p>

    <p>🎵 TikTok: ${c.social_tasks?.tiktok?.username || "—"}<br>
      <a href="${c.social_tasks?.tiktok?.proof}" target="_blank">View Proof</a>
    </p>

    <p>▶️ YouTube: ${c.social_tasks?.youtube?.username || "—"}<br>
      <a href="${c.social_tasks?.youtube?.proof}" target="_blank">View Proof</a>
    </p>
  `;
};

window.closeModal = function () {
  modal.classList.add("hidden");
};

/* ================= INIT ================= */

if (localStorage.getItem("adminAuth")) {
  loadDashboard();
}

searchInput.oninput = () => listenContestants();

await runTransaction(
  ref(db, `contestants/${contestantId}/votes`),
  v => (v || 0) + votes
);
