import { db } from "../firebase/setup.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const searchInput = document.getElementById("ticketSearch");
const searchBtn = document.getElementById("searchBtn");
const statusMessage = document.getElementById("statusMessage");
const ticketDetails = document.getElementById("ticketDetails");

searchBtn?.addEventListener("click", searchTicket);
searchInput?.addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    searchTicket();
  }
});

async function searchTicket() {
  const query = searchInput.value.trim();

  if (!query) {
    setStatus("Please enter your ticket code or payment reference.", true);
    return;
  }

  setStatus("Searching ticket status...", false);
  ticketDetails.classList.add("hidden");
  ticketDetails.innerHTML = "";

  try {
    const snapshot = await get(ref(db, "eventTickets"));
    const data = snapshot.val();

    if (!data) {
      setStatus("No tickets have been recorded yet.", true);
      return;
    }

    const lookup = query.toLowerCase();
    let foundTicket = null;

    Object.entries(data).some(([contestantId, contestantNode]) => {
      if (!contestantNode || typeof contestantNode !== "object") {
        return false;
      }

      const tickets = contestantNode.tickets || {};
      return Object.entries(tickets).some(([ticketId, ticket]) => {
        if (!ticket || typeof ticket !== "object") return false;

        const code = String(ticket.ticketCode || "").toLowerCase();
        const paymentRef = String(ticket.paymentRef || ticket.reference || "").toLowerCase();

        if (code === lookup || paymentRef === lookup) {
          foundTicket = { ...ticket, ticketId, contestantId };
          return true;
        }

        return false;
      });
    });

    if (!foundTicket) {
      setStatus("Ticket not found. Please check your code or reference and try again.", true);
      return;
    }

    renderTicket(foundTicket);
  } catch (error) {
    console.error("Ticket lookup failed:", error);
    setStatus("Unable to check ticket status right now. Please try again later.", true);
  }
}

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.style.color = isError ? "#f87171" : "#a3e635";
}

function renderTicket(ticket) {
  const approved = ticket.adminApproved === true || ticket.status === "approved";
  const approvedText = approved ? "Approved and activated" : "Pending admin approval";

  ticketDetails.innerHTML = `
    <h2>Ticket Details</h2>
    <dl>
      <div>
        <dt>Ticket Code</dt>
        <dd>${ticket.ticketCode || "N/A"}</dd>
      </div>
      <div>
        <dt>Contestant ID</dt>
        <dd>${ticket.contestantId || "N/A"}</dd>
      </div>
      <div>
        <dt>Name</dt>
        <dd>${ticket.name || "N/A"}</dd>
      </div>
      <div>
        <dt>Email</dt>
        <dd>${ticket.email || "N/A"}</dd>
      </div>
      <div>
        <dt>Phone</dt>
        <dd>${ticket.phone || "N/A"}</dd>
      </div>
      <div>
        <dt>Quantity</dt>
        <dd>${ticket.quantity || 1}</dd>
      </div>
      <div>
        <dt>Amount</dt>
        <dd>₦${Number(ticket.amount || 0).toLocaleString()}</dd>
      </div>
      <div>
        <dt>Table Number</dt>
        <dd>${ticket.tableNumber || "TBD"}</dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd>${approvedText}</dd>
      </div>
    </dl>
    <div class="ticket-actions">
      ${approved ? `<button id="downloadBtn" class="btn secondary">Download Approved Ticket</button>` : ""}
    </div>
  `;

  ticketDetails.classList.remove("hidden");
  setStatus(approved ? "Your ticket has been activated. Download it below." : "Your ticket is still pending approval. Check back once admin approves it.", approved ? false : true);

  if (approved) {
    document.getElementById("downloadBtn")?.addEventListener("click", () => {
      downloadTicketPDF(ticket);
    });
  }
}

function downloadTicketPDF(ticket) {
  const ticketNumber = ticket.ticketCode || ticket.ticketId || "PENDING";
  const html = `
    <div style="width:100%;max-width:900px;margin:0 auto;padding:20px;font-family:Arial,sans-serif;background:linear-gradient(135deg,#0f172a 0%,#1a2332 100%);color:#fff;border-radius:15px;border:2px solid #22c55e;">
      <div style="text-align:center;margin-bottom:30px;">
        <h1 style="color:#22c55e;margin:0;font-size:32px;">🎭 GRAND FINALE EVENT</h1>
        <h2 style="color:#4ade80;margin:10px 0 5px 0;">ELECTRONIC TICKET</h2>
        <p style="margin:0;opacity:0.8;">Kwara Talent Harvest 2026</p>
      </div>
      <div style="border-top:2px solid #22c55e;border-bottom:2px solid #22c55e;padding:20px;margin-bottom:20px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:10px 0;"><strong>Ticket Holder:</strong></td>
            <td style="padding:10px 0;color:#4ade80;">${ticket.name || "Guest"}</td>
            <td style="padding:10px 0;"><strong>Ticket #:</strong></td>
            <td style="padding:10px 0;color:#4ade80;font-weight:bold;font-size:14px;">${ticketNumber}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;"><strong>Email:</strong></td>
            <td style="padding:10px 0;color:#4ade80;font-size:13px;">${ticket.email || "N/A"}</td>
            <td style="padding:10px 0;"><strong>Contestant:</strong></td>
            <td style="padding:10px 0;color:#4ade80;font-weight:bold;font-size:14px;">${ticket.contestantId || "N/A"}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;"><strong>Quantity:</strong></td>
            <td style="padding:10px 0;color:#4ade80;">${ticket.quantity || 1}</td>
            <td style="padding:10px 0;"><strong>Amount Paid:</strong></td>
            <td style="padding:10px 0;color:#4ade80;font-weight:bold;font-size:18px;">₦${Number(ticket.amount || 0).toLocaleString()}</td>
          </tr>
          <tr style="border-top:1px solid #22c55e;">
            <td style="padding:15px 0;"><strong>Table #:</strong></td>
            <td style="padding:15px 0;color:#4ade80;">${ticket.tableNumber || "TBD"}</td>
            <td style="padding:15px 0;"><strong>Status:</strong></td>
            <td style="padding:15px 0;color:#4ade80;font-weight:bold;font-size:14px;">Activated</td>
          </tr>
        </table>
      </div>
      <div style="background:rgba(34,197,94,0.1);padding:15px;border-radius:8px;margin-bottom:20px;border-left:4px solid #22c55e;">
        <p style="margin:0;font-size:14px;"><strong>✓ VALID TICKET</strong> - Present this e-ticket at the event entrance</p>
      </div>
      <div style="text-align:center;color:#999;font-size:12px;">
        <p style="margin:0;">Thank you for supporting Kwara Talent Harvest!</p>
      </div>
    </div>
  `;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;

  html2pdf()
    .set({
      margin: 10,
      filename: `kth-ticket-${ticketNumber}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    })
    .from(wrapper)
    .save()
    .then(() => setStatus('Ticket downloaded successfully!', false))
    .catch((err) => {
      console.error('PDF download failed', err);
      setStatus('Ticket approved, but PDF could not be generated. Please try again.', true);
    });
}

