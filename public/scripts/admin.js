import { db } from "../firebase/setup.js";
import {
  ref,
  onValue,
  set,
  update,
  get,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const VOTE_PRICE = 350;
const AUTH_KEY = "kth_admin_token";
const apiBaseMeta = document.querySelector('meta[name="api-base-url"]');
const API_BASE_URL = (["127.0.0.1", "localhost"].includes(window.location.hostname)
  ? "http://localhost:5000"
  : apiBaseMeta?.content?.trim() || "");

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
const statZeroVotes = document.getElementById("statZeroVotes");
const statZeroVotesCard = document.getElementById("statZeroVotesCard");

const contestantList = document.getElementById("contestantList");
const manualPaymentsList = document.getElementById("manualPaymentsList");
const zeroVoteList = document.getElementById("zeroVoteList");
const transactionList = document.getElementById("transactionList");
const ticketsList = document.getElementById("ticketsList");
const ticketCountLabel = document.getElementById("ticketCountLabel");

const contestantCountLabel = document.getElementById("contestantCountLabel");
const manualCountLabel = document.getElementById("manualCountLabel");
const zeroVoteCountLabel = document.getElementById("zeroVoteCountLabel");
const transactionCountLabel = document.getElementById("transactionCountLabel");
const zeroVoteSearch = document.getElementById("zeroVoteSearch");

const modal = document.getElementById("modal");
const modalContent = document.getElementById("modalContent");

let contestantData = {};
let manualPaymentsData = {};
let transactionsData = {};
let eventTicketsData = {};
let lastGeneratedTicketCodes = [];
const loadedSections = {
  contestants: false,
  manualPayments: false,
  transactions: false,
  eventTickets: false
};
let zeroVoteFilterActive = false;
let zeroVoteSearchTerm = "";

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

function buildApiUrl(path) {
  if (!API_BASE_URL) return path;
  return `${API_BASE_URL}${path}`;
}

async function apiPost(url, body) {
  const res = await fetch(buildApiUrl(url), {
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
  const res = await fetch(buildApiUrl("/api/admin/login"), {
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
      if (zeroVoteFilterActive && Number(contestant.votes || 0) > 0) {
        return false;
      }

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

function getZeroVoteContestants() {
  return Object.entries(contestantData)
    .filter(([, contestant]) => Number(contestant.votes || 0) <= 0)
    .filter(([id, contestant]) => {
      if (!zeroVoteSearchTerm) return true;

      const name = `${contestant.stage_name || ""} ${contestant.full_name || ""}`.toLowerCase();
      const query = zeroVoteSearchTerm.toLowerCase();
      return id.toLowerCase().includes(query) || name.includes(query);
    })
    .sort(([, a], [, b]) => {
      const aName = (a.stage_name || a.full_name || "").toString();
      const bName = (b.stage_name || b.full_name || "").toString();
      return aName.localeCompare(bName);
    });
}

function renderStats() {
  const contestants = Object.values(contestantData);
  const manualPayments = Object.values(manualPaymentsData);
  const votes = contestants.reduce((sum, contestant) => sum + (contestant.votes || 0), 0);
  const approved = contestants.filter(contestant => contestant.status === "approved").length;
  const pending = contestants.length - approved;
  const manualPending = manualPayments.filter(payment => (payment.status || "pending") === "pending").length;
  const zeroVotes = contestants.filter(contestant => Number(contestant.votes || 0) <= 0).length;

  statTotal.textContent = contestants.length;
  statApproved.textContent = approved;
  statPending.textContent = pending;
  statVotes.textContent = votes.toLocaleString();
  statManualPending.textContent = manualPending;
  statRevenue.textContent = formatCurrency(votes * VOTE_PRICE);
  if (statZeroVotes) statZeroVotes.textContent = zeroVotes;
}

function renderContestants() {
  const filtered = getFilteredContestants();
  contestantCountLabel.textContent = zeroVoteFilterActive
    ? `${filtered.length} loaded (zero votes)`
    : `${filtered.length} loaded`;

  if (statZeroVotesCard) {
    statZeroVotesCard.classList.toggle("active", zeroVoteFilterActive);
    statZeroVotesCard.setAttribute("aria-pressed", zeroVoteFilterActive ? "true" : "false");
  }

  if (!filtered.length) {
    renderEmpty(
      contestantList,
      zeroVoteFilterActive
        ? "No contestants with zero votes match the current filters."
        : "No contestants match the current search or status filter."
    );
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

function renderZeroVoteContestants() {
  const zeroVotes = getZeroVoteContestants();
  if (zeroVoteCountLabel) {
    zeroVoteCountLabel.textContent = `${zeroVotes.length} loaded`;
  }

  if (!zeroVotes.length) {
    renderEmpty(zeroVoteList, "No contestants with zero votes right now.");
    return;
  }

  zeroVoteList.innerHTML = `
    <div class="zero-vote-table">
      <div class="zero-vote-row zero-vote-head">
        <span>Name</span>
        <span>ID</span>
      </div>
      ${zeroVotes.map(([id, contestant]) => `
        <div
          class="zero-vote-row zero-vote-row-clickable"
          role="button"
          tabindex="0"
          onclick="openContestantModal('${id}')"
          onkeydown="if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openContestantModal('${id}'); }"
        >
          <span>${contestant.stage_name || contestant.full_name || id}</span>
          <span>${id}</span>
        </div>
      `).join("")}
    </div>
  `;
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
      <p class="meta-line">Contestant: ${payment.contestantId || "N/A"} | ${payment.type === "event-ticket" ? `Tickets: ${payment.ticketQty || 0}` : `Votes: ${payment.votes || 0}`} | Amount: ₦${Number(payment.amount || 0).toLocaleString()}</p>
      <div class="card-meta">
        <span class="mini-pill ${statusClass(payment.status || "pending")}">${payment.status || "pending"}</span>
        <span class="mini-pill">${payment.type || "manual"}</span>
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

function renderEventTickets() {
  const tickets = [];
  
  // Flatten the nested structure: eventTickets/{contestantId}/tickets/{ticketId}
  Object.entries(eventTicketsData).forEach(([contestantId, contestantTickets]) => {
    if (contestantTickets && typeof contestantTickets === 'object' && contestantTickets.tickets) {
      Object.entries(contestantTickets.tickets).forEach(([ticketId, ticket]) => {
        if (ticket && (ticket.status === "pending" || !ticket.adminApproved)) {
          tickets.push({
            id: ticketId,
            contestantId,
            ...ticket
          });
        }
      });
    }
  });

  tickets.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  ticketCountLabel.textContent = `${tickets.length} pending`;

  if (!tickets.length) {
    renderEmpty(ticketsList, "No pending ticket approvals at this time.");
    return;
  }

  ticketsList.innerHTML = tickets.map(ticket => `
    <article class="ticket-card">
      <h4>${ticket.name || "Unknown"}</h4>
      <p class="meta-line">${ticket.email || "N/A"} | ${ticket.phone || "N/A"}</p>
      <div class="card-meta">
        <span class="mini-pill">${ticket.quantity || 1} ticket${ticket.quantity > 1 ? 's' : ''}</span>
        <span class="mini-pill">${formatCurrency(ticket.amount || 0)}</span>
        <span class="mini-pill">${formatDate(ticket.timestamp)}</span>
        <span class="mini-pill ${ticket.adminApproved ? 'status-approved' : 'status-pending'}">${ticket.adminApproved ? 'Approved' : 'Pending'}</span>
      </div>
      <div class="detail-row">
        <span><b>Ticket Code:</b> <code>${ticket.ticketCode || 'N/A'}</code></span>
      </div>
      <div class="detail-row">
        <span><b>Reference:</b> ${ticket.paymentRef || 'N/A'}</span>
      </div>
      <div class="actions">
        ${!ticket.adminApproved ? `
          <button class="success-button" onclick="approveTicket('${ticket.contestantId}', '${ticket.id}')">✅ Approve Ticket</button>
          <button class="danger-button" onclick="rejectTicket('${ticket.contestantId}', '${ticket.id}')">❌ Reject Ticket</button>
        ` : `<span class="mini-pill status-approved">Already approved</span>`}
      </div>
    </article>
  `).join("");
}

function renderAll() {
  renderStats();
  renderContestants();
  renderManualPayments();
  renderZeroVoteContestants();
  renderTransactions();
  renderEventTickets();
}

window.loadContestantsData = function loadContestantsData() {
  if (loadedSections.contestants) return;
  loadedSections.contestants = true;

  onValue(ref(db, "contestants"), snap => {
    contestantData = snap.val() || {};
    renderContestants();
    renderStats();
    renderZeroVoteContestants();
  });
};

window.loadManualPaymentsData = function loadManualPaymentsData() {
  if (loadedSections.manualPayments) return;
  loadedSections.manualPayments = true;

  onValue(ref(db, "manual_payments"), snap => {
    manualPaymentsData = snap.val() || {};
    renderManualPayments();
    renderStats();
  });
};

window.loadTransactionsData = function loadTransactionsData() {
  if (loadedSections.transactions) return;
  loadedSections.transactions = true;

  onValue(ref(db, "transactions"), snap => {
    transactionsData = snap.val() || {};
    renderTransactions();
  });
};

window.loadEventTicketsData = function loadEventTicketsData() {
  if (loadedSections.eventTickets) return;
  loadedSections.eventTickets = true;

  onValue(ref(db, "eventTickets"), snap => {
    eventTicketsData = snap.val() || {};
    renderEventTickets();
  });
};

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
    setMessage(`Signed in as ${data.username}. Click a section button to load its data.`);
  } catch (err) {
    loginError.textContent = err.message;
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Login";
  }
};

if (loginButton) {
  loginButton.addEventListener("click", window.login);
}

// Add Enter key support for login
if (usernameInput) {
  usernameInput.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      window.login();
    }
  });
}

if (passwordInput) {
  passwordInput.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      window.login();
    }
  });
}

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
    <p><b>Type:</b> ${payment.type || "manual"}</p>
    ${payment.type === "event-ticket" ? `<p><b>Tickets:</b> ${payment.ticketQty || 0}</p>` : `<p><b>Votes:</b> ${payment.votes || 0}</p>`}
    <p><b>Amount:</b> ₦${Number(payment.amount || 0).toLocaleString()}</p>
    <p><b>Reference:</b> ${payment.reference || "N/A"}</p>
    <p><b>Status:</b> ${payment.status || "pending"}</p>
    <p><b>Submitted:</b> ${formatDate(payment.created_at)}</p>
    ${payment.email ? `<p><b>Email:</b> ${payment.email}</p>` : ""}
    ${payment.phone ? `<p><b>Phone:</b> ${payment.phone}</p>` : ""}
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
    setMessage("Manual payment approved and event ticket created.");
    // Reload event tickets to show the newly created ticket
    loadEventTicketsData();
    renderManualPayments();
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

window.generateManualTickets = async function generateManualTickets() {
  const contestantId = document.getElementById("ticketContestantId").value.trim();
  const name = document.getElementById("ticketBuyerName").value.trim();
  const email = document.getElementById("ticketBuyerEmail").value.trim();
  const phone = document.getElementById("ticketBuyerPhone").value.trim();
  const quantity = Number(document.getElementById("ticketQuantity").value) || 1;

  if (!contestantId || !name || !email || !phone || quantity < 1) {
    setMessage("Fill all manual ticket fields before generating codes.", true);
    return;
  }

  const generatedCodes = [];
  try {
    for (let i = 0; i < quantity; i += 1) {
      const ticketCode = `KTH-${contestantId}-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;
      const ticketId = `${contestantId}-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;
      const tableNumber = Math.floor(Math.random() * 100) + 1;
      const ticketData = {
        email,
        name,
        phone,
        quantity: 1,
        amount: 5000,
        timestamp: Date.now(),
        status: "pending",
        adminApproved: false,
        ticketCode,
        tableNumber,
        manual: true
      };

      await set(ref(db, `eventTickets/${contestantId}/tickets/${ticketId}`), ticketData);
      generatedCodes.push(ticketCode);
    }

    await runTransaction(ref(db, `eventTickets/${contestantId}/reserved`), current => (current || 0) + quantity);

    lastGeneratedTicketCodes = generatedCodes;
    document.getElementById("manualTicketOutput").value = generatedCodes.join("\n");
    setMessage(`${generatedCodes.length} manual ticket code(s) created and saved to Firebase.`);
    loadEventTicketsData();
  } catch (err) {
    console.error("Generate manual tickets error:", err);
    setMessage("Failed to create manual ticket codes.", true);
  }
};

window.downloadManualTicketCodes = function downloadManualTicketCodes() {
  if (!lastGeneratedTicketCodes.length) {
    setMessage("Generate ticket codes first before downloading.", true);
    return;
  }

  const content = lastGeneratedTicketCodes.join("\n");
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "kth-generated-ticket-codes.txt";
  link.click();
  URL.revokeObjectURL(url);
};

window.generateBulkTickets = async function generateBulkTickets() {
  const contestantIdsInput = document.getElementById("bulkContestantId").value.trim();
  const selectAllContestants = document.getElementById("selectAllContestants").checked;
  const quantityPerContestant = Number(document.getElementById("bulkQuantity").value) || 1;
  const name = document.getElementById("bulkBuyerName").value.trim() || "Bulk Buyer";
  const email = document.getElementById("bulkBuyerEmail").value.trim() || "bulk@example.com";
  const phone = document.getElementById("bulkBuyerPhone").value.trim() || "0000000000";
  const customCodesInput = document.getElementById("bulkCustomCodes").value.trim();

  let contestantIds = [];

  if (selectAllContestants) {
    // Load all contestants if "select all" is checked
    if (!loadedSections.contestants) {
      await loadContestantsData();
    }
    contestantIds = Object.keys(contestantData).map(id => id.toString()).sort((a, b) => parseInt(a) - parseInt(b));
    if (contestantIds.length === 0) {
      setMessage("No contestants found. Please load contestants first.", true);
      return;
    }
  } else {
    if (!contestantIdsInput) {
      setMessage("Enter contestant IDs or select 'Select all contestants'.", true);
      return;
    }
    contestantIds = parseContestantIds(contestantIdsInput);
    if (contestantIds.length === 0) {
      setMessage("Invalid contestant ID format.", true);
      return;
    }
  }

  if (quantityPerContestant < 1 || quantityPerContestant > 100) {
    setMessage("Quantity must be between 1 and 100 per contestant.", true);
    return;
  }

  const totalTickets = contestantIds.length * quantityPerContestant;
  if (totalTickets > 500) {
    setMessage("Maximum 500 tickets total. Reduce quantity or contestant range.", true);
    return;
  }

  // Parse custom codes if provided
  let customCodes = [];
  if (customCodesInput) {
    customCodes = customCodesInput.split(',').map(code => code.trim()).filter(code => code.length > 0);
    if (customCodes.length !== totalTickets) {
      setMessage(`Number of custom codes (${customCodes.length}) must match total tickets needed (${totalTickets}).`, true);
      return;
    }
  }

  const generatedCodes = [];
  let totalGenerated = 0;
  let customCodeIndex = 0;

  try {
    for (const contestantId of contestantIds) {
      for (let i = 0; i < quantityPerContestant; i += 1) {
        const ticketCode = customCodes.length > 0 
          ? customCodes[customCodeIndex++]
          : `KTH-${contestantId}-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;
        const ticketId = `${contestantId}-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;
        const tableNumber = Math.floor(Math.random() * 100) + 1;
        const ticketData = {
          email,
          name,
          phone,
          quantity: 1,
          amount: 5000,
          timestamp: Date.now(),
          status: "pending",
          adminApproved: false,
          ticketCode,
          tableNumber,
          manual: true,
          bulk: true
        };

        await set(ref(db, `eventTickets/${contestantId}/tickets/${ticketId}`), ticketData);
        generatedCodes.push(ticketCode);
        totalGenerated++;
      }

      await runTransaction(ref(db, `eventTickets/${contestantId}/reserved`), current => (current || 0) + quantityPerContestant);
    }

    lastGeneratedTicketCodes = generatedCodes;
    document.getElementById("manualTicketOutput").value = generatedCodes.join("\n");
    setMessage(`${totalGenerated} bulk ticket code(s) created across ${contestantIds.length} contestant(s).`);
    loadEventTicketsData();
  } catch (err) {
    console.error("Generate bulk tickets error:", err);
    setMessage("Failed to create bulk ticket codes.", true);
  }
};

function parseContestantIds(input) {
  const ids = new Set();

  // Handle comma-separated values
  const parts = input.split(',').map(p => p.trim());

  for (const part of parts) {
    if (part.includes('-')) {
      // Handle ranges like "1-5"
      const [start, end] = part.split('-').map(n => parseInt(n.trim()));
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          ids.add(i.toString());
        }
      }
    } else {
      // Handle single numbers
      const num = parseInt(part);
      if (!isNaN(num)) {
        ids.add(num.toString());
      }
    }
  }

  return Array.from(ids).sort((a, b) => parseInt(a) - parseInt(b));
}

window.downloadBulkTicketCodes = function downloadBulkTicketCodes() {
  if (!lastGeneratedTicketCodes.length) {
    setMessage("Generate ticket codes first before downloading.", true);
    return;
  }

  const content = lastGeneratedTicketCodes.join("\n");
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `kth-bulk-tickets-${Date.now()}.txt`;
  link.click();
  URL.revokeObjectURL(url);
};

// Handle select all contestants checkbox
document.addEventListener('DOMContentLoaded', function() {
  const selectAllCheckbox = document.getElementById("selectAllContestants");
  const contestantIdInput = document.getElementById("bulkContestantId");
  
  if (selectAllCheckbox && contestantIdInput) {
    selectAllCheckbox.addEventListener('change', function() {
      contestantIdInput.disabled = this.checked;
      if (this.checked) {
        contestantIdInput.value = '';
        contestantIdInput.placeholder = 'All contestants selected';
      } else {
        contestantIdInput.placeholder = 'Contestant ID (e.g., 1,2,3 or 1-5)';
      }
    });
  }
});

window.approveTicket = async function approveTicket(contestantId, ticketId) {
  try {
    // Update Firebase directly for tickets
    const ticketRef = ref(db, `eventTickets/${contestantId}/tickets/${ticketId}`);
    const updatedData = {
      adminApproved: true,
      status: "approved"
    };
    await update(ticketRef, updatedData);
    
    // Increment sold counter
    const soldRef = ref(db, `eventTickets/${contestantId}/sold`);
    const soldsnapshot = await get(soldRef);
    const currentSold = soldsnapshot.val() || 0;
    await set(soldRef, currentSold + 1);
    
    // Decrement reserved counter
    const reservedRef = ref(db, `eventTickets/${contestantId}/reserved`);
    const reservedSnapshot = await get(reservedRef);
    const currentReserved = Math.max(0, (reservedSnapshot.val() || 1) - 1);
    await set(reservedRef, currentReserved);
    
    setMessage(`✅ Ticket approved and activated.`);
  } catch (err) {
    console.error("Approve ticket error:", err);
    setMessage(err.message || "Failed to approve ticket.", true);
  }
};

window.rejectTicket = async function rejectTicket(contestantId, ticketId) {
  if (!window.confirm("Are you sure you want to reject this ticket purchase?")) {
    return;
  }
  
  try {
    // Delete the ticket
    const ticketRef = ref(db, `eventTickets/${contestantId}/tickets/${ticketId}`);
    await set(ticketRef, null);
    
    // Decrement reserved counter
    const reservedRef = ref(db, `eventTickets/${contestantId}/reserved`);
    const reservedSnapshot = await get(reservedRef);
    const currentReserved = Math.max(0, (reservedSnapshot.val() || 1) - 1);
    await set(reservedRef, currentReserved);
    
    setMessage(`❌ Ticket rejected and removed.`);
  } catch (err) {
    console.error("Reject ticket error:", err);
    setMessage(err.message || "Failed to reject ticket.", true);
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

window.exportZeroVoteCSV = function exportZeroVoteCSV() {
  const rows = [["ID", "Name", "Votes"]];

  const zeroVoteContestants = Object.entries(contestantData).filter(([, contestant]) => {
    const votes = Number(contestant.votes || 0);
    return votes <= 0;
  });

  zeroVoteContestants.forEach(([id, contestant]) => {
    rows.push([
      id,
      contestant.stage_name || contestant.full_name || id,
      contestant.votes || 0
    ]);
  });

  const csv = rows
    .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "kth-contestants-no-votes.csv";
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

window.toggleZeroVoteFilter = function toggleZeroVoteFilter() {
  zeroVoteFilterActive = !zeroVoteFilterActive;
  setMessage(
    zeroVoteFilterActive
      ? "Filtering contestants with zero votes."
      : "Showing all contestants."
  );
  renderContestants();
};

if (zeroVoteSearch) {
  zeroVoteSearch.oninput = event => {
    zeroVoteSearchTerm = event.target.value.trim();
    renderZeroVoteContestants();
  };
}

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
  setMessage("Admin session restored. Click a section to load data.");
} else {
  showLogin();
}
