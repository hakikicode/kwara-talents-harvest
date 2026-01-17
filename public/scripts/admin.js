const token = localStorage.getItem("adminToken");

const loginBox = document.getElementById("loginBox");
const dashboard = document.getElementById("dashboard");
const list = document.getElementById("list");
const statusText = document.getElementById("status");

async function login() {
  statusText.textContent = "Signing in...";

  const res = await fetch("/api/admin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: username.value,
      password: password.value
    })
  });

  const data = await res.json();

  if (data.token) {
    localStorage.setItem("adminToken", data.token);
    location.reload();
  } else {
    statusText.textContent = "❌ Invalid login";
  }
}

async function loadContestants() {
  loginBox.style.display = "none";
  dashboard.style.display = "block";
  statusText.textContent = "Loading contestants...";

  const res = await fetch("/api/contestants", {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();
  list.innerHTML = "";

  const pending = data.filter(c => c.status === "pending");

  if (!pending.length) {
    list.innerHTML = "<p>No pending contestants</p>";
    return;
  }

  pending.forEach(c => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h4>${c.stage_name || "No Stage Name"}</h4>
      <p><b>Name:</b> ${c.full_name}</p>
      <p><b>Talent:</b> ${c.talents?.join(", ")}</p>
      <button onclick="approve('${c.id}')">Approve</button>
    `;

    list.appendChild(card);
  });

  statusText.textContent = "";
}

async function approve(id) {
  await fetch("/api/approve", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ id })
  });

  loadContestants();
}

function logout() {
  localStorage.removeItem("adminToken");
  location.reload();
}

if (token) loadContestants();
