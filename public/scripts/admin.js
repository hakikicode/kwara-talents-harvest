let token = localStorage.getItem("adminToken");

async function login() {
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
    token = data.token;
    loadContestants();
  } else {
    alert("Login failed");
  }
}

async function loadContestants() {
  const res = await fetch("/api/contestants", {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();
  list.innerHTML = "";

  data
    .filter(c => c.status === "pending")
    .forEach(c => {
      const div = document.createElement("div");
      div.innerHTML = `
        <p><b>${c.stage_name}</b> (${c.full_name})</p>
        <button onclick="approve('${c.id}')">Approve</button>
        <hr>
      `;
      list.appendChild(div);
    });
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

if (token) loadContestants();
