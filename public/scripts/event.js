const TICKET_PRICE = 5000;
const MAX_TICKETS_PER_CONTESTANT = 20;
const EVENT_DATE = new Date("2026-05-15T18:00:00+01:00");

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

let selectedContestant = null;
let cardsMap = {};
let contestants = [];

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
  const qtyInput = document.getElementById("ticketQty");
  const qtyValue = parseInt(qtyInput.value) || 1;
  const total = qtyValue * TICKET_PRICE;
  document.getElementById("ticketAmount").textContent = total.toLocaleString();
}

const ticketQtyInput = document.getElementById("ticketQty");
if (ticketQtyInput) {
  ticketQtyInput.addEventListener("change", updateTicketAmount);
  ticketQtyInput.addEventListener("input", updateTicketAmount);
}

// Load contestants from local JSON with event folder images
async function loadContestants() {
  try {
    // Try to load from contestants.json first
    try {
      const res = await fetch("events/contestants.json");
      if (res.ok) {
        contestants = await res.json();
        console.log("Loaded contestants from events/contestants.json");
      } else {
        throw new Error("JSON not found");
      }
    } catch (err) {
      // Fallback: Create default 20 contestants
      contestants = Array.from({ length: 20 }, (_, i) => ({
        id: `contestant-${String(i + 1).padStart(2, "0")}`,
        name: `Contestant ${i + 1}`
      }));
      console.log("Using default 20 contestants");
    }

    // Set event date
    const eventDateEl = document.getElementById("eventDate");
    if (eventDateEl) {
      eventDateEl.textContent = formatEventDate(EVENT_DATE);
    }

    list.innerHTML = "";
    cardsMap = {};

    // Load and render each contestant
    for (const contestant of contestants) {
      const id = safeId(contestant.id);

      // Initialize Firebase ticket tracking
      try {
        const ticketRef = ref(db, `eventTickets/${id}`);
        const snapshot = await get(ticketRef);
        if (!snapshot.exists()) {
          await set(ticketRef, { sold: 0 });
        }
      } catch (err) {
        console.warn(`Could not init firebase for ${id}:`, err);
      }

      renderTicketCard(contestant, id);
    }

    // Watch for live ticket updates
    watchTicketUpdates();
  } catch (err) {
    console.error("Load error:", err);
    showToast("Failed to load contestants. Please refresh.");
    list.innerHTML = "<p style='grid-column: 1/-1; text-align: center; padding: 2rem; color: #f87171;'>Error loading event. Please try again.</p>";
  }
}

// Render a premium ticket card
function renderTicketCard(contestant, id) {
  const card = document.createElement("div");
  card.className = "ticket-card";

  // Use local image from events folder
  const imageUrl = `events/${id}.jpg`;

  card.innerHTML = `
    <div class="ticket-img-wrapper">
      <img src="${imageUrl}" 
           class="contestant-img"
           alt="${contestant.name}"
           loading="lazy"
           onerror="this.src='assets/default.png'">
      <div class="ticket-overlay">
        <span class="ticket-badge">🎟️ Grand Finale</span>
      </div>
    </div>
    
    <div class="ticket-info">
      <h3>${contestant.name}</h3>
      <p class="description">Support this talent at the live event</p>
      
      <div class="ticket-stats">
        <div class="stat">
          <span class="stat-label">Price</span>
          <span class="stat-value">₦${TICKET_PRICE.toLocaleString()}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Available</span>
          <span class="stat-value" id="tickets-${id}">Loading...</span>
        </div>
      </div>
      
      <button class="btn-buy" id="btn-${id}" onclick="openTicketModal('${id}', '${contestant.name}')">
        🎟️ Buy Ticket
      </button>
    </div>
  `;

  cardsMap[id] = { element: card, contestant };
  list.appendChild(card);
}

// Watch for live ticket availability updates
function watchTicketUpdates() {
  onValue(ref(db, "eventTickets"), snap => {
    const data = snap.val();
    if (!data) return;

    Object.entries(data).forEach(([id, ticketData]) => {
      if (!cardsMap[id]) return;

      const sold = ticketData.sold || 0;
      const available = MAX_TICKETS_PER_CONTESTANT - sold;
      const isSoldOut = available <= 0;

      const ticketsEl = document.getElementById(`tickets-${id}`);
      const button = document.getElementById(`btn-${id}`);

      if (ticketsEl) {
        ticketsEl.innerHTML = isSoldOut 
          ? '<span style="color: #ef4444;">❌ SOLD OUT</span>' 
          : `<span style="color: #22c55e;">${available}</span>`;
      }

      if (button) {
        button.disabled = isSoldOut;
        button.innerHTML = isSoldOut ? '❌ SOLD OUT' : '🎟️ Buy Ticket';
        button.style.opacity = isSoldOut ? '0.6' : '1';
      }
    });
  });
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

// Paystack payment handler (like voting page)
window.payWithPaystack = async function () {
  const email = document.getElementById("ticketEmail").value.trim();
  const name = document.getElementById("ticketName").value.trim();
  const phone = document.getElementById("ticketPhone").value.trim();
  const qty = parseInt(document.getElementById("ticketQty").value) || 1;

  if (!email || !name || !phone) {
    showToast("❌ Please fill in all fields");
    return;
  }

  if (qty > 5) {
    showToast("⚠️ Maximum 5 tickets per transaction");
    return;
  }

  try {
    // Save to localStorage for persistence
    localStorage.setItem("user_email", email);

    // Initialize payment via backend (same as voting)
    const res = await fetch("/api/initialize-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        contestantId: selectedContestant.id,
        ticketQty: qty,
        amount: qty * TICKET_PRICE,
        type: "event-ticket",
        buyerName: name,
        buyerPhone: phone
      })
    });

    const data = await res.json();
    if (!data.publicKey || !data.reference) {
      throw new Error("Payment init failed");
    }

    // Open Paystack dialog
    const handler = PaystackPop.setup({
      key: data.publicKey,
      email: email,
      amount: data.amount,
      ref: data.reference,
      onClose: () => {
        showToast("Payment cancelled");
      },
      onSuccess: (response) => {
        handleTicketPaymentSuccess(response, email, name, phone, qty);
      }
    });

    handler.openIframe();
  } catch (error) {
    console.error("Payment error:", error);
    showToast("❌ Payment setup failed. Try manual payment.");
  }
};

// Handle successful Paystack payment
async function handleTicketPaymentSuccess(response, email, name, phone, qty) {
  try {
    // Verify payment with backend
    const verify = await fetch("/api/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: response.reference })
    });

    const result = await verify.json();
    if (!result.success) {
      throw new Error("Payment verification failed");
    }

    // Save ticket to Firebase
    await saveTicketPurchase(email, name, phone, qty, response.reference, "completed");
    
    showToast("✅ Payment successful! Ticket secured.");
    closeModal();
    
    setTimeout(() => {
      location.href = `success.html?ref=${response.reference}&amount=${qty * TICKET_PRICE}`;
    }, 1500);
  } catch (error) {
    console.error("Verification error:", error);
    showToast("⚠️ Payment verified but please contact support to confirm your ticket.");
  }
};

// Manual payment handler
window.payManual = function () {
  const email = document.getElementById("ticketEmail").value.trim();
  const name = document.getElementById("ticketName").value.trim();
  const phone = document.getElementById("ticketPhone").value.trim();
  const qty = parseInt(document.getElementById("ticketQty").value) || 1;

  if (!email || !name || !phone) {
    showToast("❌ Please fill in all fields");
    return;
  }

  // Save to localStorage
  localStorage.setItem("user_email", email);

  // Redirect to manual payment with event details
  const params = new URLSearchParams({
    type: "event-ticket",
    contestantId: selectedContestant.id,
    contestantName: selectedContestant.name,
    ticketQty: qty,
    amount: qty * TICKET_PRICE,
    email: email,
    name: name,
    phone: phone
  });

  location.href = `./manual-payment.html?${params.toString()}`;
};

// Save ticket purchase to Firebase
async function saveTicketPurchase(email, name, phone, qty, paymentRef = null, status = "pending") {
  if (!selectedContestant) throw new Error("No contestant selected");

  try {
    const ticketId = `${selectedContestant.id}-${Date.now()}`;
    const ticketsRef = ref(db, `eventTickets/${selectedContestant.id}/${ticketId}`);

    const ticketData = {
      email,
      name,
      phone,
      quantity: qty,
      amount: qty * TICKET_PRICE,
      timestamp: Date.now(),
      status: status
    };

    if (paymentRef) {
      ticketData.paymentRef = paymentRef;
    }

    await set(ticketsRef, ticketData);

    // Update sold counter
    const soldRef = ref(db, `eventTickets/${selectedContestant.id}/sold`);
    await runTransaction(soldRef, (current) => {
      return (current || 0) + qty;
    });

    return ticketId;
  } catch (error) {
    console.error("Error saving ticket:", error);
    throw error;
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadContestants();
});
