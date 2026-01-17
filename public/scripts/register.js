import { db } from "../firebase/setup.js";
import { ref, push } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

/* ================= QUESTIONS ================= */

const questions = [
  { q: "What is your full name?", id: "fullName", type: "text", required: true },
  { q: "Stage name (optional)", id: "stageName", type: "text" },
  { q: "How old are you?", id: "age", type: "number", required: true },

  {
    q: "Select your gender (optional)",
    id: "gender",
    type: "select",
    options: ["Male", "Female", "Other"]
  },

  {
    q: "WhatsApp number (Nigeria only, 11-14 digits)",
    id: "whatsapp",
    type: "tel",
    required: true
  },

  {
    q: "Select your talent category (you may choose more than one)",
    id: "talents",
    type: "select-multi",
    required: true,
    options: [
      "Music",
      "Dance",
      "Comedy",
      "Modelling",
      "Chant",
      "Art",
      "Acting",
      "Spoken Word",
      "DJing",
      "Magic",
      "Others"
    ]
  },

  { q: "Briefly tell us about yourself (optional)", id: "bio", type: "text" },

  /* ===== SOCIAL TASKS ===== */
  {
    q: "Instagram Task",
    id: "instagram",
    type: "social",
    follow: "https://instagram.com/kwaratalentsharvest",
    required: true
  },
  {
    q: "TikTok Task",
    id: "tiktok",
    type: "social",
    follow: "https://www.tiktok.com/@kwaratalentsharvest",
    required: true
  },
  {
    q: "YouTube Task",
    id: "youtube",
    type: "social",
    follow: "https://youtube.com/@parantiproduction",
    required: true
  }
];

/* ================= STATE ================= */

let current = 0;
const answers = {};

const questionEl = document.getElementById("question");
const inputArea = document.getElementById("input-area");
const bar = document.getElementById("bar");

document.getElementById("backBtn").onclick = prev;
document.getElementById("nextBtn").onclick = next;

render();

/* ================= RENDER ================= */

function render() {
  const step = questions[current];
  questionEl.textContent = step.q;
  inputArea.innerHTML = "";

  let input;

  /* ===== SELECT ===== */
  if (step.type === "select") {
    input = document.createElement("select");
    input.innerHTML = `<option value="">Select</option>`;
    step.options.forEach(o => {
      input.innerHTML += `<option value="${o}">${o}</option>`;
    });
    input.value = answers[step.id] || "";
    input.oninput = e => answers[step.id] = e.target.value;
  }

  /* ===== MULTI SELECT ===== */
  else if (step.type === "select-multi") {
    input = document.createElement("div");
    step.options.forEach(o => {
      const label = document.createElement("label");
      label.style.display = "block";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = o;
      if (answers.talents?.includes(o)) checkbox.checked = true;

      checkbox.onchange = () => {
        answers.talents = answers.talents || [];
        if (checkbox.checked) answers.talents.push(o);
        else answers.talents = answers.talents.filter(v => v !== o);
        render(); // re-render to show "Others" input
      };

      label.appendChild(checkbox);
      label.append(" " + o);
      input.appendChild(label);
    });

    if (answers.talents?.includes("Others")) {
      const other = document.createElement("input");
      other.placeholder = "Specify your talent";
      other.value = answers.otherTalent || "";
      other.oninput = e => answers.otherTalent = e.target.value;
      input.appendChild(other);
    }
  }

  /* ===== SOCIAL TASK ===== */
  else if (step.type === "social") {
    input = document.createElement("div");
    input.innerHTML = `
      <p>👉 <a href="${step.follow}" target="_blank"><strong>Follow & Engage Here</strong></a></p>
      <input placeholder="Your username" id="username">
      <input placeholder="Proof link (post/comment/video)" id="proof" type="url">
    `;
    input.querySelector("#username").oninput = e =>
      answers[step.id + "_username"] = e.target.value;
    input.querySelector("#proof").oninput = e =>
      answers[step.id + "_proof"] = e.target.value;
  }

  /* ===== TEXT / TEXTAREA ===== */
  else {
    input = document.createElement(step.type === "textarea" ? "textarea" : "input");
    input.type = step.type;
    input.value = answers[step.id] || "";
    input.oninput = e => answers[step.id] = e.target.value;
  }

  inputArea.appendChild(input);
  bar.style.width = ((current + 1) / questions.length) * 100 + "%";
}

/* ================= VALIDATION ================= */

function validate() {
  const step = questions[current];

  // Only required fields are validated
  if (step.required) {
    // Multi-select
    if (step.type === "select-multi" && (!answers.talents || answers.talents.length === 0)) {
      alert("Please select at least one talent category");
      return false;
    }

    if (answers.talents?.includes("Others") && !answers.otherTalent) {
      alert("Please specify your talent");
      return false;
    }

    // Social tasks
    if (step.type === "social") {
      if (!answers[step.id + "_username"] || !answers[step.id + "_proof"]) {
        alert("Please complete the social task before continuing");
        return false;
      }
    }

    // WhatsApp number validation (Nigeria 11-14 digits)
    if (step.id === "whatsapp") {
      const regex = /^\d{11,14}$/;
      if (!regex.test(answers.whatsapp)) {
        alert("Please enter a valid Nigerian WhatsApp number (11-14 digits)");
        return false;
      }
    }

    // Other simple required text fields
    if (!answers[step.id] && step.type !== "select-multi" && step.type !== "social") {
      alert("This field is required");
      return false;
    }
  }

  return true;
}

/* ================= NAVIGATION ================= */

function next() {
  if (!validate()) return;

  if (current < questions.length - 1) {
    current++;
    render();
  } else {
    submit();
  }
}

function prev() {
  if (current > 0) {
    current--;
    render();
  }
}

/* ================= SUBMIT ================= */

async function submit() {
  try {
    await push(ref(db, "contestants"), {
      full_name: answers.fullName,
      stage_name: answers.stageName || "",
      age: answers.age,
      gender: answers.gender || "",
      whatsapp: answers.whatsapp,
      talents: answers.talents,
      other_talent: answers.otherTalent || "",
      bio: answers.bio || "",

      social_tasks: {
        instagram: {
          username: answers.instagram_username || "",
          proof: answers.instagram_proof || ""
        },
        tiktok: {
          username: answers.tiktok_username || "",
          proof: answers.tiktok_proof || ""
        },
        youtube: {
          username: answers.youtube_username || "",
          proof: answers.youtube_proof || ""
        }
      },

      status: "pending",
      votes: 0,
      created_at: Date.now()
    });

    // Redirect to thank-you page instead of whatsapp
    window.location.href = "thank-you.html";

  } catch (e) {
    alert("Submission failed. Please try again.");
    console.error(e);
  }
}
