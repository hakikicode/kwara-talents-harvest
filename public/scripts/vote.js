async function loadContestants() {
  const res = await fetch("/api/contestants-public");
  const data = await res.json();

  data.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.stage_name} (${c.votes} votes)`;
    contestant.appendChild(opt);
  });
}

async function pay() {
  const payload = {
    contestant_id: contestant.value,
    votes: Number(votes.value),
    phone: phone.value
  };

  const res = await fetch("/api/payment-create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  // OPAY POPUP / REDIRECT HERE
  window.location.href = `https://opaywebpay.com/pay?amount=${data.amount}`;
}

loadContestants();
