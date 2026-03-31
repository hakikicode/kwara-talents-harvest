import { db } from "../firebase/setup.js";
import {
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

onValue(ref(db, "contestants"), snap => {
  const data = snap.val();

  let totalVotes = 0;

  Object.values(data).forEach(c => {
    totalVotes += c.votes || 0;
  });

  document.getElementById("stats").innerHTML =
    `Total Votes: ${totalVotes}`;
});

onValue(ref(db, "manual_payments"), snap => {

  Object.values(snap.val() || {}).forEach(p => {

    if (p.status === "approved" && !p.notified) {

      showVotePop(p.votes);

      db.ref(`manual_payments/${p.id}`).update({
        notified: true
      });
    }

  });

});

const contestantsEl = document.getElementById("contestants");
const paymentsEl = document.getElementById("payments");

/* ===============================
   🔐 BASIC PROTECTION
================================ */
const password = prompt("Enter admin password");
if (password !== "admin123") {
  document.body.innerHTML = "<h2>Access denied</h2>";
  throw new Error("Unauthorized");
}

/* ===============================
   🏆 LOAD CONTESTANTS (LIVE)
================================ */
onValue(ref(db, "contestants"), snap => {

  const data = snap.val();
  contestantsEl.innerHTML = "";

  if (!data) return;

  Object.entries(data)
    .sort((a, b) => (b[1].votes || 0) - (a[1].votes || 0))
    .forEach(([id, c]) => {

      const el = document.createElement("div");
      el.className = "card";

      el.innerHTML = `
        <p><b>ID:</b> ${id}</p>
        <p><b>Votes:</b> ${c.votes || 0}</p>

        <input type="number" id="add-${id}" placeholder="Add votes" />

        <button onclick="addVotes('${id}')">➕ Add Votes</button>
      `;

      contestantsEl.appendChild(el);
    });

});

/* ===============================
   ➕ MANUAL ADD VOTES
================================ */
window.addVotes = async (contestantId) => {

  const qty = Number(
    document.getElementById(`add-${contestantId}`).value
  );

  if (!qty || qty <= 0) {
    alert("Enter valid votes");
    return;
  }

  const res = await fetch("/api/add-votes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contestantId,
      votes: qty
    })
  });

  const data = await res.json();

  if (data.success) {
    alert("✅ Votes added");
  } else {
    alert("❌ Failed");
  }
};

/* ===============================
   💳 MANUAL PAYMENTS
================================ */
onValue(ref(db, "manual_payments"), snap => {

  const data = snap.val();
  paymentsEl.innerHTML = "";

  if (!data) return;

  Object.entries(data).reverse().forEach(([id, p]) => {

    if (p.status !== "pending") return;

    const el = document.createElement("div");
    el.className = "card";

    el.innerHTML = `
        <p><b>Contestant:</b> ${p.contestantId}</p>
        <p><b>Votes:</b> ${p.votes}</p>
        <p><b>Name:</b> ${p.payer}</p>
        <p><b>Ref:</b> ${p.reference}</p>
        <img src="${p.proof}" style="width:100px;border-radius:8px">

        <p class="${p.status}">Status: ${p.status}</p>

        <button onclick="approve('${id}')">✅ Approve</button>
        <button onclick="reject('${id}')">❌ Reject</button>
    `;

    paymentsEl.appendChild(el);
  });

});

/* ===============================
   transactions (LIVE)
================================ */
onValue(ref(db, "transactions"), snap => {

  const data = snap.val();

  console.log("💰 Paystack Payments:", data);

});

/* ===============================
   Transactions (LIVE)
================================ */
const txEl = document.getElementById("transactions");

onValue(ref(db, "transactions"), snap => {

  const data = snap.val();
  txEl.innerHTML = "";

  if (!data) return;

  Object.entries(data).reverse().forEach(([refId, t]) => {

    const el = document.createElement("div");
    el.className = "card";

    el.innerHTML = `
        <p><b>Ref:</b> ${refId}</p>
        <p><b>Contestant:</b> ${t.contestantId}</p>
        <p><b>Votes:</b> ${t.votes}</p>
        <p style="color:#22c55e;">✔ Paid</p>
    `;

    txEl.appendChild(el);
  });

});
/* ===============================
   APPROVE
================================ */
window.approve = async (id) => {

  const res = await fetch("/api/approve-payment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ id })
  });

  const data = await res.json();

  if (data.success) {
    alert("✅ Approved & votes added");
  }
};

/* ===============================
   REJECT
================================ */
window.reject = async (id) => {

  await fetch("/api/reject-payment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ id })
  });

  alert("❌ Rejected");
};

if (p.reference === lastReferenceUsed) {
  el.style.border = "2px solid red";
}