import { db } from "../firebase/setup.js";
import {
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const list = document.getElementById("list");

onValue(ref(db, "manual_payments"), snap => {

  const data = snap.val();
  list.innerHTML = "";

  if (!data) {
    list.innerHTML = "<p>No manual payments</p>";
    return;
  }

  Object.entries(data).reverse().forEach(([id, p]) => {

    if (p.status !== "pending") return;

    const el = document.createElement("div");
    el.className = "card";

    el.innerHTML = `
      <p><b>Contestant:</b> ${p.contestantId}</p>
      <p><b>Votes:</b> ${p.votes}</p>
      <p><b>Name:</b> ${p.payer}</p>
      <p><b>Reference:</b> ${p.reference}</p>

      <button class="approve" onclick="approve('${id}')">Approve</button>
      <button class="reject" onclick="reject('${id}')">Reject</button>
    `;

    list.appendChild(el);
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
    alert("✅ Payment approved & votes added");
  } else {
    alert("❌ Failed");
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

  alert("❌ Payment rejected");
};

onValue(ref(db, "transactions"), snap => {

  const data = snap.val();

  console.log("💰 Paystack Payments:", data);

});