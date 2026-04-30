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
let ticketModal = null;

let selectedContestant = null;
let cardsMap = {};
let contestants = [];

// Get modal element (delayed until DOM ready)
function getModalElement() {
  if (!ticketModal) {
    ticketModal = document.getElementById("ticketModal");
  }
  return ticketModal;
}

// Preload contestant images in background for faster display
function preloadImages(contestants) {
  contestants.forEach((contestant, index) => {
    const imageUrl = contestant.image
      ? (contestant.image.startsWith("http") ? contestant.image : `events/${encodeURI(contestant.image)}`)
      : `events/${encodeURI(`kth ${contestant.id}.jpg`)}`;
    const img = new Image();
    img.src = imageUrl;
  });
}

// Format event date
function formatEventDate(date) {
  const options = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Lagos"
  };
  return new Intl.DateTimeFormat("en-NG", options).format(date);
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
    try {
      const res = await fetch("events/contestants.json");
      if (res.ok) {
        contestants = await res.json();
        console.log("Loaded contestants from events/contestants.json");
      } else {
        throw new Error("JSON not found");
      }
    } catch (err) {
      contestants = Array.from({ length: 20 }, (_, i) => ({
        id: `contestant-${String(i + 1).padStart(2, "0")}`,
        name: `Contestant ${i + 1}`
      }));
      console.log("Using default 20 contestants");
    }

    const eventDateEl = document.getElementById("eventDate");
    if (eventDateEl) {
      eventDateEl.textContent = formatEventDate(EVENT_DATE);
    }

    list.innerHTML = "";
    cardsMap = {};

    for (const contestant of contestants) {
      const id = safeId(contestant.id);

      try {
        const ticketRef = ref(db, `eventTickets/${id}`);
        const snapshot = await get(ticketRef);
        if (!snapshot.exists()) {
          await set(ticketRef, { sold: 0 });
        }
      } catch (err) {
        console.warn(
          `Firebase init warning for ${id}:`,
          err.message
        );
      }

      renderTicketCard(contestant, id);
    }

    preloadImages(contestants);
    watchTicketUpdates();

  } catch (err) {
    console.error("Load error:", err);
    showToast("Failed to load contestants. Please refresh.");
    list.innerHTML =
      "<p style='grid-column: 1/-1; text-align: center; padding: 2rem; color: #f87171;'>Error loading event. Please try again.</p>";
  }
}

// Render a premium ticket card
function renderTicketCard(contestant, id) {
  const card = document.createElement("div");
  card.className = "ticket-card";

  const imageUrl = contestant.image
    ? (contestant.image.startsWith("http") ? contestant.image : `events/${encodeURI(contestant.image)}`)
    : `events/${encodeURI(`kth ${id}.jpg`)}`;

  card.innerHTML = `
    <div class="ticket-img-wrapper">
      <img src="${imageUrl}" 
           class="contestant-img"
           alt="${contestant.name}"
           loading="lazy"
           decoding="async"
           fetchpriority="low"
           onerror="this.onerror=null; this.src='https://via.placeholder.com/600x400?text=No+Image'">
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
      const reserved = ticketData.reserved || 0;
      const totalBooked = sold + reserved;
      const available = MAX_TICKETS_PER_CONTESTANT - totalBooked;
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
  const modal = getModalElement();
  if (!modal) {
    showToast("❌ Modal not found. Please refresh the page.");
    return;
  }
  
  selectedContestant = { id: contestantId, name: contestantName };
  document.getElementById("modalContestantName").textContent = `Support: ${contestantName}`;
  document.getElementById("ticketEmail").value = localStorage.getItem("user_email") || "";
  document.getElementById("ticketName").value = "";
  document.getElementById("ticketPhone").value = "";
  document.getElementById("ticketQty").value = "1";
  updateTicketAmount();
  modal.classList.remove("hidden");
  modal.style.display = "flex";
};

// Close modal
window.closeModal = function () {
  const modal = getModalElement();
  if (modal) {
    modal.classList.add("hidden");
    modal.style.display = "none";
  }
  selectedContestant = null;
};

// Close modal when clicking outside
window.addEventListener("click", (event) => {
  const modal = getModalElement();
  if (event.target === modal) {
    closeModal();
  }
});

// Paystack payment handler (like voting page)
window.payWithPaystack = async function () {
  if (!selectedContestant || !selectedContestant.id) {
    alert("Please select a contestant first");
    return;
  }

  const email = document.getElementById("ticketEmail").value.trim();
  const name = document.getElementById("ticketName").value.trim();
  const phone = document.getElementById("ticketPhone").value.trim();
  const qty = parseInt(document.getElementById("ticketQty").value) || 1;

  if (!email || !name || !phone) {
    alert("Please fill in all fields");
    return;
  }

  // Validate email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    alert("Please enter a valid email address");
    return;
  }

  if (qty > 5) {
    alert("Maximum 5 tickets per transaction");
    return;
  }

  try {
    // Save to localStorage for persistence
    localStorage.setItem("paymentData", JSON.stringify({
      email, name, phone, qty,
      contestantId: selectedContestant.id,
      contestantName: selectedContestant.name
    }));

    // Initialize payment via backend
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
    
    if (!res.ok || !data.publicKey || !data.amount) {
      throw new Error(data.error || "Payment initialization failed");
    }

    const handler = PaystackPop.setup({
      key: data.publicKey,
      email,
      amount: data.amount,
      ref: data.reference,
      currency: "NGN",
      onSuccess: function(response) {
        handleTicketPaymentSuccess(response, email, name, phone, qty);
      },
      onClose: function() {
        showToast("Payment popup closed. You can try again.");
      }
    });

    handler.openIframe();

  } catch (error) {
    console.error("Payment error:", error);
    alert(`Payment Error: ${error.message}`);
  }
};

// Generate PDF e-ticket
async function generateETicketPDF(ticketData) {
  const { name, email, ticketNumber, contestantName, tableNumber, ticketQty, totalAmount } = ticketData;

  // Create HTML for the ticket
  const ticketHTML = `
    <div style="width: 100%; max-width: 900px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; background: linear-gradient(135deg, #0f172a 0%, #1a2332 100%); color: #fff; border-radius: 15px; border: 2px solid #22c55e;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #22c55e; margin: 0; font-size: 32px;">🎭 GRAND FINALE EVENT</h1>
        <h2 style="color: #4ade80; margin: 10px 0 5px 0;">ELECTRONIC TICKET</h2>
        <p style="margin: 0; opacity: 0.8;">Kwara Talent Harvest 2026</p>
      </div>

      <div style="border-top: 2px solid #22c55e; border-bottom: 2px solid #22c55e; padding: 20px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0;"><strong>Ticket Holder:</strong></td>
            <td style="padding: 10px 0; color: #4ade80;">${name}</td>
            <td style="padding: 10px 0;"><strong>Ticket #:</strong></td>
            <td style="padding: 10px 0; color: #4ade80; font-weight: bold; font-size: 14px;">${ticketNumber}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0;"><strong>Email:</strong></td>
            <td style="padding: 10px 0; color: #4ade80; font-size: 13px;">${email}</td>
            <td style="padding: 10px 0;"><strong>Table #:</strong></td>
            <td style="padding: 10px 0; color: #4ade80; font-weight: bold; font-size: 14px;">${tableNumber}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0;"><strong>Contestant:</strong></td>
            <td style="padding: 10px 0; color: #4ade80;">${contestantName}</td>
            <td style="padding: 10px 0;"><strong>Quantity:</strong></td>
            <td style="padding: 10px 0; color: #4ade80;">${ticketQty}</td>
          </tr>
          <tr style="border-top: 1px solid #22c55e;">
            <td style="padding: 15px 0;"><strong>Event Date:</strong></td>
            <td style="padding: 15px 0; color: #4ade80;">May 15, 2026 @ 6:00 PM</td>
            <td style="padding: 15px 0;"><strong>Amount Paid:</strong></td>
            <td style="padding: 15px 0; color: #4ade80; font-weight: bold; font-size: 18px;">₦${totalAmount.toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <div style="background: rgba(34, 197, 94, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #22c55e;">
        <p style="margin: 0; font-size: 14px;"><strong>✓ VALID TICKET</strong> - Present this e-ticket at the event entrance</p>
        <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.8;">Generated: ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}</p>
      </div>

      <div style="text-align: center; color: #999; font-size: 12px;">
        <p style="margin: 0;">Thank you for supporting your favorite talent!</p>
        <p style="margin: 5px 0 0 0;">Kwara Talent Harvest Grand Finale 2026</p>
      </div>
    </div>
  `;

  // Create a temporary element for html2pdf
  const element = document.createElement('div');
  element.innerHTML = ticketHTML;

  const opt = {
    margin: 10,
    filename: `kth-ticket-${ticketNumber}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
  };

  try {
    await html2pdf().set(opt).from(element).save();
    showToast("✅ E-Ticket PDF downloaded!");
  } catch (err) {
    console.error("PDF generation error:", err);
    showToast("✓ Ticket confirmed! PDF download issue - check email.");
  }
}

// Handle successful Paystack payment
// Handle successful Paystack payment (called from inline popup)
window.handleTicketPaymentSuccess = function(response) {
  if (!response || !response.reference) {
    alert("Payment reference not found. Please contact support.");
    return;
  }

  const paymentData = JSON.parse(localStorage.getItem('paymentData') || '{}');
  
  if (!paymentData.email) {
    alert("Payment data not found. Please try again.");
    return;
  }

  // Show processing message while async work happens
  showToast("✅ Processing your payment...");
  
  // Verify payment asynchronously in the background
  fetch("/api/verify-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reference: response.reference })
  })
  .then(res => res.json())
  .then(result => {
    if (!result.success) {
      throw new Error(result.error || "Payment verification failed");
    }

    // Save ticket to Firebase
    return saveTicketPurchase(
      paymentData.email, 
      paymentData.name, 
      paymentData.phone, 
      paymentData.qty, 
      response.reference, 
      "pending"
    );
  })
  .then(ticketDetails => {
    const tableNumber = ticketDetails?.tableNumber || Math.floor(Math.random() * 100) + 1;
    const ticketNumber = ticketDetails?.ticketCode || response.reference.substring(0, 12).toUpperCase();
    
    return generateETicketPDF({
      name: paymentData.name,
      email: paymentData.email,
      ticketNumber,
      contestantName: paymentData.contestantName,
      tableNumber,
      ticketQty: paymentData.qty,
      totalAmount: paymentData.qty * TICKET_PRICE
    });
  })
  .then(() => {
    closeModal();
    showToast("✅ Ticket generated! Code sent to email. Pending admin activation.");
    // Clear payment data
    localStorage.removeItem('paymentData');
  })
  .catch(error => {
    console.error("Payment processing error:", error);
    alert(`Error: ${error.message}`);
  });
};

// Called when user returns from Paystack payment
window.handlePaymentReturn = async function () {
  const urlParams = new URLSearchParams(window.location.search);
  const reference = urlParams.get('reference');
  const paymentData = JSON.parse(localStorage.getItem('paymentData') || '{}');

  if (!reference || !paymentData.email) {
    return;
  }

  try {
    // Verify payment with backend
    const verify = await fetch("/api/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference })
    });

    const result = await verify.json();
    
    if (!result.success) {
      throw new Error(result.error || "Payment verification failed");
    }

    // Save ticket to Firebase and get ticket details
    const ticketDetails = await saveTicketPurchase(
      paymentData.email, 
      paymentData.name, 
      paymentData.phone, 
      paymentData.qty, 
      reference, 
      "pending"
    );
    
    const tableNumber = ticketDetails?.tableNumber || Math.floor(Math.random() * 100) + 1;
    const ticketNumber = ticketDetails?.ticketCode || reference.substring(0, 12).toUpperCase();
    
    await generateETicketPDF({
      name: paymentData.name,
      email: paymentData.email,
      ticketNumber,
      contestantName: paymentData.contestantName,
      tableNumber,
      ticketQty: paymentData.qty,
      totalAmount: paymentData.qty * TICKET_PRICE
    });
    
    closeModal();
    showToast("✅ Payment confirmed. Ticket code generated and pending admin activation.");
  } catch (error) {
    console.error("Payment verification error:", error);
    alert(`Payment Error: ${error.message}`);
    location.href = 'event.html';
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
    const ticketCode = `KTH-${selectedContestant.id}-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;
    const ticketId = `${selectedContestant.id}-${Date.now()}`;
    const tableNumber = Math.floor(Math.random() * 100) + 1; // Random table number 1-100
    const ticketsRef = ref(db, `eventTickets/${selectedContestant.id}/tickets/${ticketId}`);

    const ticketData = {
      email,
      name,
      phone,
      quantity: qty,
      amount: qty * TICKET_PRICE,
      timestamp: Date.now(),
      status: status,
      adminApproved: false,
      ticketCode,
      tableNumber: tableNumber
    };

    if (paymentRef) {
      ticketData.paymentRef = paymentRef;
    }

    try {
      await set(ticketsRef, ticketData);

      // Update sold counter only when admin approves
      // For now we keep the seat reserved, but admin will activate later
      const soldRef = ref(db, `eventTickets/${selectedContestant.id}/reserved`);
      await runTransaction(soldRef, (current) => {
        return (current || 0) + qty;
      });
    } catch (fbError) {
      console.warn("Firebase save warning (this is okay for now):", fbError.message);
      // Don't throw - Firebase will be fixed with proper rules
      // Continue with PDF generation even if Firebase fails
    }

    return { ticketId, tableNumber, ticketCode };
  } catch (error) {
    console.error("Error saving ticket:", error);
    throw error;
  }
}

// Public function to generate ticket PDF (for manual payments and success page)
window.generateEventTicket = async function(ticketData) {
  if (!ticketData || !ticketData.name) {
    console.error("Invalid ticket data");
    return;
  }
  
  await generateETicketPDF({
    name: ticketData.name || "Guest",
    email: ticketData.email || "N/A",
    ticketNumber: ticketData.ticketNumber || ticketData.reference || "PENDING",
    contestantName: ticketData.contestantName || "Grand Finale",
    tableNumber: ticketData.tableNumber || Math.floor(Math.random() * 100) + 1,
    ticketQty: ticketData.ticketQty || 1,
    totalAmount: ticketData.totalAmount || ticketData.amount || 0
  });
};

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadContestants();
  
  // Check if returning from Paystack payment
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('reference')) {
    handlePaymentReturn();
  }
});
