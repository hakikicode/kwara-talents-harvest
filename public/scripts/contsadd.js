const log = document.getElementById("log");

async function addVotes() {

  try {

    const contestantId =
      document.getElementById("contestant").value;

    const votes =
      Number(document.getElementById("votes").value);

    const res = await fetch("/api/admin-add-votes", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ contestantId, votes })
    });

    const data = await res.json();

    log.textContent =
      JSON.stringify(data,null,2);

  } catch(e) {

    log.textContent =
      "Network Error ❌\n" + e.message;
  }
}

async function recover() {

  const res = await fetch("/api/recover-payments");

  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    log.textContent =
      "Server Error ❌\n\n" + text;
    return;
  }

  log.textContent =
    "Recovered ✅\n" +
    JSON.stringify(data, null, 2);
}