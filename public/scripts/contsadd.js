const log = document.getElementById("log");

async function addVotes() {

  const contestantId =
    document.getElementById("contestant").value.trim();

  const votes =
    Number(document.getElementById("votes").value);

  if (!contestantId || !votes) {
    alert("Enter contestant id and votes");
    return;
  }

  log.textContent = "Adding votes...";

  try {

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
      "✅ Votes added\n" +
      JSON.stringify(data, null, 2);

  } catch (err) {
    console.error(err);
    log.textContent = "❌ Failed adding votes";
  }
}

async function recover() {

  log.textContent = "Recovering payments...";

  try {

    const res =
      await fetch("/api/recover-payments");

    const data = await res.json();

    log.textContent =
      "✅ Recovery Complete\n" +
      JSON.stringify(data, null, 2);

  } catch (err) {
    console.error(err);
    log.textContent = "❌ Recovery failed";
  }
}