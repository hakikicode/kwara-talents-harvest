import { db } from "../firebase/setup.js";
import {
  ref,
  push,
  set,
  onValue,
  update,
  remove
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

import {
  getStorage,
  ref as sRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-storage.js";

let selected = {};
const storage = getStorage();
const list = document.getElementById("list");


// ================= ADD =================
window.addContestant = async () => {

  const file = document.getElementById("imageUpload").files[0];
  const githubInput = document.getElementById("githubImage").value.trim();

  let imageUrl = "";
  let filename = "";

  try {

    // ================= FILE UPLOAD =================
    if (file) {
    console.log("Uploading file:", file.name);

    const imageRef = sRef(storage, `contestants/${Date.now()}_${file.name}`);

    const snapshot = await uploadBytes(imageRef, file);

    console.log("Upload success:", snapshot);

    imageUrl = await getDownloadURL(snapshot.ref);

    console.log("Download URL:", imageUrl);
    }

// ================= GITHUB =================
else if (githubInput) {

  if (githubInput.includes("github.com")) {

    // convert blob → raw safely
    imageUrl = githubInput
      .replace("https://github.com/", "https://raw.githubusercontent.com/")
      .replace("/blob/", "/");

  } else if (githubInput.startsWith("http")) {

    imageUrl = githubInput;

  } else {
    alert("Enter full GitHub RAW link");
    return;
  }
}

    // ================= EXTRACT NAME =================
    // extract name from filename
    let filename = file ? file.name : githubInput.split("/").pop();

    let cleanName = filename
    .replace(/\.[^/.]+$/, "")
    .replace(/%20/g, " ")
    .replace(/_/g, " ")
    .trim();

    const newRef = push(ref(db, "contestants"));

    await set(newRef, {
      image: imageUrl,
      votes: 0,
      status: "approved",
      created_at: Date.now()
    });

    alert("✅ Contestant Added Successfully");

    // reset inputs
    document.getElementById("imageUpload").value = "";
    document.getElementById("githubImage").value = "";

  } catch (err) {
    console.error(err);
    alert("❌ Error adding contestant");
  }
};


// ================= LOAD =================
onValue(ref(db, "contestants"), snap => {

  list.innerHTML = "";
  selected = {}; // reset selection

  const data = snap.val() || {};

  Object.entries(data).forEach(([id, c]) => {

    const div = document.createElement("div");
    div.className = "vote-card";

    div.innerHTML = `
      <input type="checkbox" class="selectBox" data-id="${id}">

      <img src="${c.image}" width="100">

      <p>Votes: ${c.votes || 0}</p>
      <p>Status: ${c.status}</p>

      <button onclick="toggle('${id}', '${c.status}')">
        ${c.status === "approved" ? "⛔ Disable" : "✅ Approve"}
      </button>

      <button onclick="del('${id}')">
        🗑 Delete
      </button>
    `;

    list.appendChild(div);
  });

  // ✅ Attach checkbox listeners AFTER render
  document.querySelectorAll(".selectBox").forEach(cb => {
    cb.addEventListener("change", e => {
      const id = e.target.dataset.id;

      if (e.target.checked) {
        selected[id] = true;
      } else {
        delete selected[id];
      }
    });
  });

});


// ================= TOGGLE =================
window.toggle = async (id, current) => {
  const newStatus = current === "approved" ? "pending" : "approved";

  await update(ref(db, `contestants/${id}`), {
    status: newStatus
  });
};


// ================= DELETE SINGLE =================
window.del = async (id) => {
  if (!confirm("Delete contestant?")) return;

  await remove(ref(db, `contestants/${id}`));
};


// ================= SELECT ALL =================
window.selectAll = () => {

  const checkboxes = document.querySelectorAll(".selectBox");

  if (checkboxes.length === 0) return;

  const allChecked = [...checkboxes].every(cb => cb.checked);

  // toggle behavior
  checkboxes.forEach(cb => {
    cb.checked = !allChecked;

    const id = cb.dataset.id;

    if (!allChecked) {
      selected[id] = true;
    } else {
      delete selected[id];
    }
  });
};


// ================= DELETE SELECTED =================
window.deleteSelected = async () => {

  const ids = Object.keys(selected);

  if (ids.length === 0) {
    alert("No contestants selected");
    return;
  }

  if (!confirm(`Delete ${ids.length} contestants?`)) return;

  for (let id of ids) {
    await remove(ref(db, `contestants/${id}`));
  }

  selected = {};

  alert("✅ Selected deleted");
};