const TICKET_PRICE = 5000;
const MAX_TICKETS_PER_CONTESTANT = 20;
const TICKETS_PER_PURCHASE = 5;
const EVENT_DATE = new Date("2026-05-15T18:00:00+01:00");
const API_BASE_URL = "/api"; // Relative path for backend API

import { db } from "../firebase/setup.js";
import {
  ref,
  get,
  set,
  onValue,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const list = document.getElementById("contestants");
const ticketModal = document.getElementById("ticketModal");
const ticketAmountSpan = document.getElementById("ticketAmount");
const ticketQtyInput = document.getElementById("ticketQty");
const eventDateEl = document.getElementById("eventDate");

let selectedContestant = null;
let ticketsSold = {}; // Track sold tickets per contestant

// Format event date
function formatEventDate(date) {
  return new Intl.DateTimeFormat("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Lagos"
  }).format(date);
}

// Safety function for Firebase keys
function safeId(id) {
  return id
    .replace(/\.[^/.]+$/, "")
    .replace(/[.#$\[\]]/g, "");
}

// Show toast notifications
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

// Update ticket amount when quantity changes
function updateTicketAmount() {
  const qty = parseInt(ticketQtyInput.value) || 1;
  const total = qty * TICKET_PRICE;
  ticketAmountSpan.textContent = total.toLocaleString();
}

ticketQtyInput.addEventListener("change", updateTicketAmount);
ticketQtyInput.addEventListener("input", updateTicketAmount);

// Load contestants from events folder
async function loadContestants() {
  try {
    // Try to load from contestants.json file first
    let contestants = [];
    
    try {
      const response = await fetch("events/contestants.json");
      if (response.ok) {
        contestants = await response.json();
        console.log("Loaded contestants from contestants.json");
      } else {
        throw new Error("contestants.json not found");
      }
    } catch (error) {
      console.warn("Could not load contestants.json, using defaults:", error.message);
      
      // Fallback to default contestant list if JSON file not found
      contestants = [
        { id: "contestant-01", name: "Contestant 1" },
        { id: "contestant-02", name: "Contestant 2" },
        { id: "contestant-03", name: "Contestant 3" },
        { id: "contestant-04", name: "Contestant 4" },
        { id: "contestant-05", name: "Contestant 5" },
        { id: "contestant-06", name: "Contestant 6" },
        { id: "contestant-07", name: "Contestant 7" },
        { id: "contestant-08", name: "Contestant 8" },
        { id: "contestant-09", name: "Contestant 9" },
        { id: "contestant-10", name: "Contestant 10" },
        { id: "contestant-11", name: "Contestant 11" },
        { id: "contestant-12", name: "Contestant 12" },
        { id: "contestant-13", name: "Contestant 13" },
        { id: "contestant-14", name: "Contestant 14" },
        { id: "contestant-15", name: "Contestant 15" },
        { id: "contestant-16", name: "Contestant 16" },
        { id: "contestant-17", name: "Contestant 17" },
        { id: "contestant-18", name: "Contestant 18" },
        { id: "contestant-19", name: "Contestant 19" },
        { id: "contestant-20", name: "Contestant 20" }
      ];
    }

    // Set event date
    if (eventDateEl) {
      eventDateEl.textContent = formatEventDate(EVENT_DATE);
    }

    // Load contestants and their ticket data
    await Promise.all(
      contestants.map(async (contestant) => {
        // Load sold tickets from Firebase
        const ticketRef = ref(db, `eventTickets/${safeId(contestant.id)}/sold`);
        try {
          const snapshot = await get(ticketRef);
          ticketsSold[contestant.id] = snapshot.exists() ? snapshot.val() : 0;
        } catch (error) {
          console.warn(`Could not load ticket count for ${contestant.id}:`, error);
          ticketsSold[contestant.id] = 0;
        }

        // Create and display card
        renderTicketCard(contestant);
      })
    );
  } catch (error) {
    console.error("Error loading contestants:", error);
    list.innerHTML = "<p style='grid-column: 1/-1; text-align: center; padding: 2rem;'>Error loading contestants. Please refresh the page.</p>";
  }
}

// Render a ticket card
function renderTicketCard(contestant) {
  const cardId = safeId(contestant.id);
  const sold = ticketsSold[contestant.id] || 0;
  const available = MAX_TICKETS_PER_CONTESTANT - sold;
  const isSoldOut = available <= 0;

  // Support both naming conventions: contestant-01.jpg or kth 1.jpg
  const imageUrl = checkImagePath(cardId);

  const card = document.createElement("div");
  card.className = "ticket-card";
  card.innerHTML = `
    <img src="${imageUrl}" alt="${contestant.name}" onerror="this.src='assets/placeholder.jpg'">
    <h3>${contestant.name}</h3>
    <p>Support your favorite talent at the Grand Finale</p>
    <div class="tickets-available ${isSoldOut ? 'sold-out' : ''}">
      ${isSoldOut ? '❌ SOLD OUT' : `✅ ${available} Tickets Left`}
    </div>
    <button onclick="openTicketModal('${cardId}', '${contestant.name}')" ${isSoldOut ? 'disabled' : ''}>
      ${isSoldOut ? 'SOLD OUT' : '🎟️ Buy Ticket'}
    </button>
  `;

  card.addEventListener("click", () => {
    if (!isSoldOut) {
      openTicketModal(cardId, contestant.name);
    }
  });

  list.appendChild(card);
}

// Helper function to find image path (supports multiple naming conventions)
function checkImagePath(cardId) {
  // Extract contestant number from id (e.g., "contestant-01" -> "1")
  const match = cardId.match(/contestant-(\d+)/);
  if (match) {
    const num = parseInt(match[1]);
    // Try both naming conventions
    // First try: contestant-01.jpg
    // Then try: kth 1.jpg (with space)
    return `events/${cardId}.jpg`; // Will fallback via onerror
  }
  return `events/${cardId}.jpg`;
}

// Open ticket purchase modal
window.openTicketModal = function (contestantId, contestantName) {
  selectedContestant = { id: contestantId, name: contestantName };
  document.getElementById("modalContestantName").textContent = `Support: ${contestantName}`;
  document.getElementById("ticketEmail").value = "";
  document.getElementById("ticketName").value = "";
  document.getElementById("ticketPhone").value = "";
  document.getElementById("ticketQty").value = "1";
  updateTicketAmount();
  ticketModal.classList.remove("hidden");
};

// Close modal
window.closeModal = function () {
  ticketModal.classList.add("hidden");
  selectedContestant = null;
};

// Close modal when clicking outside
window.addEventListener("click", (event) => {
  if (event.target === ticketModal) {
    closeModal();
  }
});

// Paystack payment handler
window.payWithPaystack = async function () {
  const email = document.getElementById("ticketEmail").value.trim();
  const name = document.getElementById("ticketName").value.trim();
  const phone = document.getElementById("ticketPhone").value.trim();
  const qty = parseInt(document.getElementById("ticketQty").value) || 1;

  if (!email || !name || !phone) {
    alert("Please fill in all fields");
    return;
  }

  if (qty > TICKETS_PER_PURCHASE) {
    alert(`Maximum ${TICKETS_PER_PURCHASE} tickets per transaction`);
    return;
  }

  try {
    // Initialize payment via your backend API
    const initRes = await fetch(`${API_BASE_URL}/initialize-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        amount: qty * TICKET_PRICE,
        contestantId: selectedContestant.id,
        ticketQty: qty,
        type: "event-ticket",
        buyerName: name,
        buyerPhone: phone
      })
    });

    const initData = await initRes.json();
    if (!initData.reference) throw new Error("Payment initialization failed");

    // Open Paystack
    const handler = PaystackPop.setup({
      key: initData.publicKey,
      email: email,
      amount: initData.amount,
      ref: initData.reference,
      onClose: () => showToast("Payment cancelled"),
      onSuccess: (response) => handleTicketPaymentSuccess(response, email, name, phone, qty)
    });

    handler.openIframe();
  } catch (error) {
    console.error("Payment init error:", error);
    showToast("Payment setup failed. Try manual payment.");
  }
};

// Handle successful ticket payment
async function handleTicketPaymentSuccess(response, email, name, phone, qty) {
  try {
    // Verify payment via your backend API
    const verifyRes = await fetch(`${API_BASE_URL}/verify-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: response.reference })
    });

    const verifyData = await verifyRes.json();
    if (!verifyData.success) throw new Error("Payment verification failed");

    // Save ticket to Firebase
    await saveTicketPurchase(response.reference, email, name, phone, qty);
    
    showToast("✅ Tickets purchased successfully!");
    setTimeout(() => location.reload(), 1500);
  } catch (error) {
    console.error("Verification error:", error);
    showToast("Payment verified but failed to save. Contact support.");
  }
}

// Manual payment handler
window.payManual = function () {
  const email = document.getElementById("ticketEmail").value.trim();
  const name = document.getElementById("ticketName").value.trim();
  const phone = document.getElementById("ticketPhone").value.trim();
  const qty = parseInt(document.getElementById("ticketQty").value) || 1;

  if (!email || !name || !phone) {
    alert("Please fill in all fields");
    return;
  }

  // Redirect to manual payment page with event ticket details
  const params = new URLSearchParams({
    contestantId: selectedContestant.id,
    contestantName: selectedContestant.name,
    ticketQty: qty,
    amount: qty * TICKET_PRICE,
    email: email,
    name: name,
    phone: phone,
    type: "event-ticket"
  });

  location.href = `./manual-payment.html?${params.toString()}`;
};

// Save ticket purchase to Firebase
async function saveTicketPurchase(paymentRef, email, name, phone, qty) {
  if (!selectedContestant) return;

  try {
    const ticketId = `${selectedContestant.id}-${Date.now()}`;
    const ticketsRef = ref(db, `eventTickets/${selectedContestant.id}/${ticketId}`);

    const ticketData = {
      email,
      name,
      phone,
      quantity: qty,
      amount: qty * TICKET_PRICE,
      paymentRef: paymentRef,
      timestamp: Date.now(),
      status: "completed"
    };

    await set(ticketsRef, ticketData);

    // Update sold counter
    const soldRef = ref(db, `eventTickets/${selectedContestant.id}/sold`);
    await runTransaction(soldRef, (current) => {
      return (current || 0) + qty;
    });

  } catch (error) {
    console.error("Error saving ticket purchase:", error);
    showToast("Error saving purchase. Please contact support.");
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadContestants();
});
