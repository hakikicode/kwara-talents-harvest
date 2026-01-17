import { db } from "../firebase/setup.js";
import {
  ref,
  get,
  update
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

/* ================= AUTH ================= */

window.login = function () {
  const u = document.getElementById("username").value;
  const p = document.getElementById("password").value;

  if (u === "admin" && p === "pass") {
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

function loadDashboard() {
  loginBox.style.display = "none";
  dashboard.style.display = "block";
  loadContestants();
}

/* ================= DATA ================= */

async function loadContestants() {
  pendingList.innerHTML = "";
  approvedList.innerHTML = "";

  const snap = await get(ref(db, "contestants"));
  if (!snap.exists()) return;

  const data = snap.val();

  Object.entries(data).forEach(([id, c]) => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h4>${c.stage_name || "No Stage Name"}</h4>
      <p><b>Name:</b> ${c.full_name}</p>
      <p><b>Talent:</b> ${(c.talents || []).join(", ")}</p>
    `;

    if (c.status === "pending") {
      const btn = document.createElement("button");
      btn.textContent = "Approve";
      btn.onclick = () => approve(id);
      card.appendChild(btn);
      pendingList.appendChild(card);
    }

    if (c.status === "approved") {
      approvedList.appendChild(card);
    }
  });
}

async function approve(id) {
  await update(ref(db, "contestants/" + id), {
    status: "approved"
  });
  loadContestants();
}

/* ================= INIT ================= */

if (localStorage.getItem("adminAuth")) {
  loadDashboard();
}
