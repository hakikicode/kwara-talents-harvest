import { db } from "../firebase/setup.js";
import {
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const VOTE_PRICE = 350;
const AUTH_KEY = "kth_admin_token";

const loginBox = document.getElementById("loginBox");
const dashboard = document.getElementById("dashboard");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("loginButton");
const loginError = document.getElementById("loginError");
const adminMessage = document.getElementById("adminMessage");

const searchInput = document.getElementById("search");
const statusFilter = document.getElementById("statusFilter");
const paymentFilter = document.getElementById("paymentFilter");

const statTotal = document.getElementById("statTotal");
const statApproved = document.getElementById("statApproved");
const statPending = document.getElementById("statPending");
const statVotes = document.getElementById("statVotes");
const statManualPending = document.getElementById("statManualPending");
const statRevenue = document.getElementById("statRevenue");

const contestantList = document.getElementById("contestantList");
const manualPaymentsList = document.getElementById("manualPaymentsList");
const transactionList = document.getElementById("transactionList");

const contestantCountLabel = document.getElementById("contestantCountLabel");
const manualCountLabel = document.getElementById("manualCountLabel");
const transactionCountLabel = document.getElementById("transactionCountLabel");

const modal = document.getElementById("modal");
const modalContent = document.getElementById("modalContent");

let contestantData = {};
let manualPaymentsData = {};
let transactionsData = {};
let listenersStarted = false;

function getToken() {
  return localStorage.getItem(AUTH_KEY) || "";
}

function setToken(token) {
  localStorage.setItem(AUTH_KEY, token);
}

function clearToken() {
  localStorage.removeItem(AUTH_KEY);
}

function setMessage(message, isError = false) {
  if (!adminMessage) return;
  adminMessage.textContent = message || "";
  adminMessage.style.color = isError ? "#fca5a5" : "#cbd5e1";
}

function formatCurrency(amount) {
  return `N${Number(amount || 0).toLocaleString()}`;
}

function formatDate(timestamp) {
  if (!timestamp) return "N/A";
  return new Date(timestamp).toLocaleString();
}

function statusClass(status) {
  return `status-${status || "pending"}`;
}

function apiHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : ""
  };
}

async function apiPost(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    logout();
    throw new Error("Your admin session expired. Please log in again.");
  }

  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

function showDashboard() {
  loginBox.classList.add("hidden");
  dashboard.classList.remove("hidden");
}

function showLogin() {
  dashboard.classList.add("hidden");
  loginBox.classList.remove("hidden");
}

async function loginRequest(username, password) {
  const res = await fetch("/api/admin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.token) {
    throw new Error(data.error || "Invalid login details");
  }

  return data;
}

function renderEmpty(target, message) {
  target.innerHTML = `<div class="empty-state">${message}</div>`;
}

function getFilteredContestants() {
  const search = searchInput.value.trim().toLowerCase();
  const filter = statusFilter.value;

  return Object.entries(contestantData)
    .filter(([, contestant]) => {
      if (filter !== "all" && (contestant.status || "pending") !== filter) {
        return false;
      }

      if (!search) return true;

      return [contestant.full_name, contestant.stage_name]
        .filter(Boolean)
        .some(value => value.toLowerCase().includes(search));
    })
    .sort(([, a], [, b]) => (b.votes || 0) - (a.votes || 0));
}

function getFilteredManualPayments() {
  const filter = paymentFilter.value;

  return Object.entries(manualPaymentsData)
    .filter(([, payment]) => {
      if (filter === "all") return true;
      return (payment.status || "pending") === filter;
    })
    .sort(([, a], [, b]) => (b.created_at || 0) - (a.created_at || 0));
}

function renderStats() {
  const contestants = Object.values(contestantData);
  const manualPayments = Object.values(manualPaymentsData);
  const votes = contestants.reduce((sum, contestant) => sum + (contestant.votes || 0), 0);
  const approved = contestants.filter(contestant => contestant.status === "approved").length;
  const pending = contestants.length - approved;
  const manualPending = manualPayments.filter(payment => (payment.status || "pending") === "pending").length;

  statTotal.textContent = contestants.length;
  statApproved.textContent = approved;
  statPending.textContent = pending;
  statVotes.textContent = votes.toLocaleString();
  statManualPending.textContent = manualPending;
  statRevenue.textContent = formatCurrency(votes * VOTE_PRICE);
}

function renderContestants() {
  const filtered = getFilteredContestants();
  contestantCountLabel.textContent = `${filtered.length} loaded`;

  if (!filtered.length) {
    renderEmpty(contestantList, "No contestants match the current search or status filter.");
    return;
  }

  contestantList.innerHTML = filtered.map(([id, contestant]) => `
    <article class="admin-card">
      <h4>${contestant.stage_name || id}</h4>
      <p class="meta-line">${contestant.full_name || "No full name"} | ${contestant.whatsapp || "No WhatsApp"}</p>
      <div class="card-meta">
        <span class="mini-pill ${statusClass(contestant.status || "pending")}">${contestant.status || "pending"}</span>
        <span class="mini-pill">${contestant.votes || 0} votes</span>
        <span class="mini-pill">${contestant.voting_enabled === false ? "Voting disabled" : "Voting enabled"}</span>
      </div>
      <div class="actions">
        <button class="ghost-button" onclick="openContestantModal('${id}')">View Details</button>
        ${contestant.status !== "approved"
          ? `<button class="success-button" onclick="approveContestant('${id}')">Approve</button>`
          : ""}
        <button class="warning-button" onclick="toggleVoting('${id}', ${contestant.voting_enabled === false})">
          ${contestant.voting_enabled === false ? "Enable Voting" : "Disable Voting"}
        </button>
        <button class="danger-button" onclick="deleteContestant('${id}')">Delete</button>
      </div>
      <div class="add-votes-row">
        <input type="number" min="1" id="add-${id}" placeholder="Add votes manually">
        <button class="primary-button" onclick="addVotes('${id}')">Add Votes</button>
      </div>
    </article>
  `).join("");
}

function renderManualPayments() {
  const filtered = getFilteredManualPayments();
  manualCountLabel.textContent = `${filtered.length} showing`;

  if (!filtered.length) {
    renderEmpty(manualPaymentsList, "No manual payments found for the selected filter.");
    return;
  }

  manualPaymentsList.innerHTML = filtered.map(([id, payment]) => `
    <article class="payment-card">
      <h4>${payment.payer || "Unknown payer"}</h4>
      <p class="meta-line">Contestant: ${payment.contestantId || "N/A"} | Votes: ${payment.votes || 0}</p>
      <div class="card-meta">
        <span class="mini-pill ${statusClass(payment.status || "pending")}">${payment.status || "pending"}</span>
        <span class="mini-pill">Ref: ${payment.reference || "N/A"}</span>
        <span class="mini-pill">${formatDate(payment.created_at)}</span>
      </div>
      ${payment.proof ? `<img class="proof-preview" src="${payment.proof}" alt="Payment proof">` : ""}
      <div class="actions">
        <button class="ghost-button" onclick="openPaymentModal('${id}')">View Details</button>
        ${(payment.status || "pending") === "pending"
          ? `<button class="success-button" onclick="approvePayment('${id}')">Approve</button>
             <button class="danger-button" onclick="rejectPayment('${id}')">Reject</button>`
          : ""}
      </div>
    </article>
  `).join("");
}

function renderTransactions() {
  const transactions = Object.entries(transactionsData)
    .sort(([, a], [, b]) => (b.created_at || 0) - (a.created_at || 0));

  transactionCountLabel.textContent = `${transactions.length} records`;

  if (!transactions.length) {
    renderEmpty(transactionList, "No Paystack transactions have been recorded yet.");
    return;
  }

  transactionList.innerHTML = transactions.map(([reference, tx]) => `
    <article class="tx-card">
      <h4>${reference}</h4>
      <p class="meta-line">Contestant: ${tx.contestantId || "N/A"} | Votes: ${tx.votes || 0}</p>
      <div class="card-meta">
        <span class="mini-pill status-approved">paid</span>
        <span class="mini-pill">${formatDate(tx.created_at)}</span>
      </div>
    </article>
  `).join("");
}

function renderAll() {
  renderStats();
  renderContestants();
  renderManualPayments();
  renderTransactions();
}

function listenForData() {
  if (listenersStarted) return;
  listenersStarted = true;

  onValue(ref(db, "contestants"), snap => {
    contestantData = snap.val() || {};
    renderAll();
  });

  onValue(ref(db, "manual_payments"), snap => {
    manualPaymentsData = snap.val() || {};
    renderAll();
  });

  onValue(ref(db, "transactions"), snap => {
    transactionsData = snap.val() || {};
    renderAll();
  });
}

window.login = async function login() {
  loginError.textContent = "";
  loginButton.disabled = true;
  loginButton.textContent = "Signing in...";

  try {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const data = await loginRequest(username, password);

    setToken(data.token);
    showDashboard();
    listenForData();
    setMessage(`Signed in as ${data.username}.`);
  } catch (err) {
    loginError.textContent = err.message;
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Login";
  }
};

window.logout = function logout() {
  clearToken();
  showLogin();
  loginError.textContent = "";
  setMessage("");
};

window.openContestantModal = function openContestantModal(id) {
  const contestant = contestantData[id];
  if (!contestant) return;

  modal.classList.remove("hidden");
  modalContent.innerHTML = `
    <h3>${contestant.stage_name || id}</h3>
    <p><b>Full Name:</b> ${contestant.full_name || "N/A"}</p>
    <p><b>Status:</b> ${contestant.status || "pending"}</p>
    <p><b>Votes:</b> ${contestant.votes || 0}</p>
    <p><b>Age:</b> ${contestant.age || "N/A"}</p>
    <p><b>Gender:</b> ${contestant.gender || "N/A"}</p>
    <p><b>WhatsApp:</b> ${contestant.whatsapp || "N/A"}</p>
    <p><b>Bio:</b><br>${contestant.bio || "No bio provided."}</p>
    <hr>
    <p><b>Talents:</b> ${(contestant.talents || []).join(", ") || "N/A"}</p>
    <p><b>Other Talent:</b> ${contestant.other_talent || "N/A"}</p>
    <hr>
    <p><b>Instagram:</b> ${contestant.social_tasks?.instagram?.username || "N/A"}</p>
    <p><a href="${contestant.social_tasks?.instagram?.proof || "#"}" target="_blank">Instagram proof</a></p>
    <p><b>TikTok:</b> ${contestant.social_tasks?.tiktok?.username || "N/A"}</p>
    <p><a href="${contestant.social_tasks?.tiktok?.proof || "#"}" target="_blank">TikTok proof</a></p>
    <p><b>YouTube:</b> ${contestant.social_tasks?.youtube?.username || "N/A"}</p>
    <p><a href="${contestant.social_tasks?.youtube?.proof || "#"}" target="_blank">YouTube proof</a></p>
  `;
};

window.openPaymentModal = function openPaymentModal(id) {
  const payment = manualPaymentsData[id];
  if (!payment) return;

  modal.classList.remove("hidden");
  modalContent.innerHTML = `
    <h3>Manual Payment Review</h3>
    <p><b>ID:</b> ${id}</p>
    <p><b>Payer:</b> ${payment.payer || "N/A"}</p>
    <p><b>Contestant:</b> ${payment.contestantId || "N/A"}</p>
    <p><b>Votes:</b> ${payment.votes || 0}</p>
    <p><b>Reference:</b> ${payment.reference || "N/A"}</p>
    <p><b>Status:</b> ${payment.status || "pending"}</p>
    <p><b>Submitted:</b> ${formatDate(payment.created_at)}</p>
    ${payment.proof ? `<img class="proof-preview" src="${payment.proof}" alt="Payment proof">` : "<p>No proof uploaded.</p>"}
  `;
};

window.closeModal = function closeModal() {
  modal.classList.add("hidden");
};

window.approveContestant = async function approveContestant(id) {
  try {
    await apiPost("/api/admin-update-contestant", {
      contestantId: id,
      updates: { status: "approved" }
    });
    setMessage("Contestant approved.");
  } catch (err) {
    setMessage(err.message || "Failed to approve contestant.", true);
  }
};

window.toggleVoting = async function toggleVoting(id, currentlyDisabled) {
  try {
    await apiPost("/api/admin-update-contestant", {
      contestantId: id,
      updates: {
        voting_enabled: currentlyDisabled
      }
    });
    setMessage(`Voting ${currentlyDisabled ? "enabled" : "disabled"} for contestant.`);
  } catch (err) {
    setMessage(err.message || "Failed to update voting state.", true);
  }
};

window.addVotes = async function addVotes(id) {
  const value = Number(document.getElementById(`add-${id}`)?.value || "0");

  if (!value || value < 1) {
    return setMessage("Enter a valid number of votes to add.", true);
  }

  try {
    await apiPost("/api/add-votes", {
      contestantId: id,
      votes: value
    });
    document.getElementById(`add-${id}`).value = "";
    setMessage("Votes added successfully.");
  } catch (err) {
    setMessage(err.message, true);
  }
};

window.approvePayment = async function approvePayment(id) {
  try {
    await apiPost("/api/approve-payment", { id });
    setMessage("Manual payment approved and votes credited.");
  } catch (err) {
    setMessage(err.message, true);
  }
};

window.rejectPayment = async function rejectPayment(id) {
  try {
    await apiPost("/api/reject-payment", { id });
    setMessage("Manual payment rejected.");
  } catch (err) {
    setMessage(err.message, true);
  }
};

window.exportCSV = function exportCSV() {
  const rows = [["Full Name", "Stage Name", "Age", "Talents", "Votes", "Status", "Voting Enabled"]];

  Object.values(contestantData).forEach(contestant => {
    rows.push([
      contestant.full_name || "",
      contestant.stage_name || "",
      contestant.age || "",
      (contestant.talents || []).join(" | "),
      contestant.votes || 0,
      contestant.status || "pending",
      contestant.voting_enabled === false ? "No" : "Yes"
    ]);
  });

  const csv = rows
    .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "kth-admin-export.csv";
  link.click();
  URL.revokeObjectURL(url);
};

window.deleteContestant = async function deleteContestant(id) {
  const contestant = contestantData[id];
  const label = contestant?.stage_name || contestant?.full_name || id;

  if (!window.confirm(`Delete contestant "${label}" permanently?`)) {
    return;
  }

  try {
    await apiPost("/api/delete-contestant", { contestantId: id });
    setMessage(`Deleted contestant ${label}.`);
  } catch (err) {
    setMessage(err.message || "Failed to delete contestant.", true);
  }
};

searchInput.oninput = renderContestants;
statusFilter.onchange = renderContestants;
paymentFilter.onchange = renderManualPayments;

modal.onclick = event => {
  if (event.target === modal) {
    window.closeModal();
  }
};

if (getToken()) {
  showDashboard();
  listenForData();
  setMessage("Admin session restored.");
} else {
  showLogin();
}
