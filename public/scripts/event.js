const TICKET_PRICE = 5000;
const MAX_TICKETS_PER_CONTESTANT = 20;

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

// Load contestants from API (same as voting page)
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
    cardsMap = {};

    // Set event date
    const eventDateEl = document.getElementById("eventDate");
    if (eventDateEl) {
      eventDateEl.textContent = formatEventDate(new Date("2026-05-15T18:00:00+01:00"));
    }

    for (const contestant of contestants) {
      const id = safeId(contestant.id);

      // Initialize event ticket data in Firebase if not exists
      if (!dbData[id]) {
        await set(ref(db, `contestants/${id}`), {
          image: contestant.image,
          votes: 0,
          created_at: Date.now()
        });
      }

      // Initialize event tickets tracking
      const ticketsRef = ref(db, `eventTickets/${id}`);
      try {
        const ticketSnap = await get(ticketsRef);
        if (!ticketSnap.exists()) {
          await set(ticketsRef, { sold: 0 });
        }
      } catch (error) {
        console.warn(`Could not init tickets for ${id}:`, error);
      }

      renderTicketCard(contestant, id);
    }

    // Watch for live ticket updates
    startLiveTickets();
  } catch (err) {
    console.error("Load error:", err);
    showToast("Failed to load contestants");
  }
}

// Render a ticket card (using API image directly, like voting page)
function renderTicketCard(contestant, id) {
  const card = document.createElement("div");
  card.className = "ticket-card";

  card.innerHTML = `
    <img src="${contestant.image}" 
         class="contestant-img"
         loading="lazy"
         alt="${contestant.id}"
         onerror="this.src='assets/default.png'">
    <h3>${contestant.id}</h3>
    <p>Support your favorite talent at the Grand Finale</p>
    <div class="tickets-available" id="tickets-${id}">
      Loading tickets...
    </div>
    <button class="btn" id="btn-${id}" onclick="openTicketModal('${id}', '${contestant.id}')">
      🎟️ Buy Ticket
    </button>
  `;

  cardsMap[id] = { element: card, contestant };
  list.appendChild(card);
}

// Watch for live ticket updates
function startLiveTickets() {
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
        ticketsEl.className = `tickets-available ${isSoldOut ? 'sold-out' : ''}`;
        ticketsEl.innerHTML = isSoldOut 
          ? '❌ SOLD OUT' 
          : `✅ ${available} Tickets Left`;
      }

      if (button) {
        button.disabled = isSoldOut;
        button.textContent = isSoldOut ? 'SOLD OUT' : '🎟️ Buy Ticket';
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

// Paystack payment handler
window.payWithPaystack = async function () {
  const email = document.getElementById("ticketEmail").value.trim();
  const name = document.getElementById("ticketName").value.trim();
  const phone = document.getElementById("ticketPhone").value.trim();
  const qty = parseInt(document.getElementById("ticketQty").value) || 1;

  if (!email || !name || !phone) {
    showToast("Please fill in all fields");
    return;
  }

  if (qty > 5) {
    showToast("Maximum 5 tickets per transaction");
    return;
  }

  try {
    // Save ticket purchase to Firebase directly
    await saveTicketPurchase(email, name, phone, qty);
    showToast("✅ Ticket added! Redirecting to payment...");
    
    // Redirect to payment page
    setTimeout(() => {
      location.href = `/pay.html?type=event-ticket&amount=${qty * TICKET_PRICE}&contestantId=${selectedContestant.id}`;
    }, 1500);
  } catch (error) {
    console.error("Error:", error);
    showToast("Error processing ticket. Try again.");
  }
};

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
async function saveTicketPurchase(email, name, phone, qty) {
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
      status: "pending" // Will be updated to "completed" after payment
    };

    await set(ticketsRef, ticketData);

    // Update sold counter
    const soldRef = ref(db, `eventTickets/${selectedContestant.id}/sold`);
    await runTransaction(soldRef, (current) => {
      return (current || 0) + qty;
    });

    closeModal();
  } catch (error) {
    console.error("Error saving ticket:", error);
    throw error;
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadContestants();
});
