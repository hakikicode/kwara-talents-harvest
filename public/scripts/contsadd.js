async function addVotes() {

  const contestantId =
    document.getElementById("contestant").value;

  const votes =
    Number(document.getElementById("votes").value);

  const res = await fetch("/api/admin-add-votes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contestantId,
      votes
    })
  });

  const data = await res.json();

  log.textContent =
    "Votes added ✅ " + JSON.stringify(data, null, 2);
}

async function recover() {

  const res =
    await fetch("/api/recover-payments");

  const data = await res.json();

  log.textContent =
    "Recovered payments ✅\n" +
    JSON.stringify(data, null, 2);
}