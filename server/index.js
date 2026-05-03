import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import xlsx from "xlsx";
import { fileURLToPath } from "url";
import adminLoginHandler from "../api/admin-login.js";
import approvePaymentHandler from "../api/approve-payment.js";
import rejectPaymentHandler from "../api/reject-payment.js";
import deleteContestantHandler from "../api/delete-contestant.js";
import { db } from "../api/firebase/admin.js";
import { requireAdmin } from "../api/_admin.js";

// Required for ES Modules to get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "password";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Path to JSON database
const dbPath = path.join(__dirname, "db.json");

// Ensure db.json exists
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify([]));
}

// Helper functions to read/write from db.json
const readDatabase = () => JSON.parse(fs.readFileSync(dbPath, "utf8"));
const writeDatabase = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

// Routes
app.get("/", (req, res) => res.send("Backend is running!"));

// Registration Endpoint
app.post("/api/registrations", (req, res) => {
  const {
    name,
    gender,
    email,
    age,
    school,
    stateOfOrigin,
    nationality,
    talentCategory,
    localGovernment,
    instagramHandle,
    facebookHandle,
    phoneNumber,
    stageName,
  } = req.body;

  // Validation checks
  if (
    !name ||
    !gender ||
    !email ||
    !age ||
    !talentCategory ||
    !school ||
    !stateOfOrigin ||
    !nationality ||
    !localGovernment ||
    !instagramHandle ||
    !facebookHandle ||
    !phoneNumber ||
    !stageName
  ) {
    return res.status(400).json({ message: "Please fill out all required fields." });
  }

  const db = readDatabase();
  db.push(req.body);
  writeDatabase(db);

  res.status(201).json({ message: "Registration successful!" });
});

// Admin Login Endpoint
app.post("/api/admin/login", adminLoginHandler);

app.post("/api/approve-payment", approvePaymentHandler);
app.post("/api/reject-payment", rejectPaymentHandler);
app.post("/api/delete-contestant", deleteContestantHandler);

app.post("/api/admin-update-contestant", async (req, res) => {
  if (!requireAdmin(req, res)) {
    return;
  }

  const { contestantId, updates } = req.body || {};

  if (!contestantId || !updates || typeof updates !== "object") {
    return res.status(400).json({ error: "Missing contestantId or updates" });
  }

  try {
    const contestantRef = db.ref(`contestants/${contestantId}`);
    const snap = await contestantRef.get();

    if (!snap.exists()) {
      return res.status(404).json({ error: "Contestant not found" });
    }

    await contestantRef.update(updates);
    return res.json({ success: true, contestantId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update contestant" });
  }
});

app.post("/api/add-votes", async (req, res) => {
  if (!requireAdmin(req, res)) {
    return;
  }

  const { contestantId, votes } = req.body || {};
  const voteCount = Number(votes || 0);

  if (!contestantId || voteCount <= 0) {
    return res.status(400).json({ error: "Missing contestantId or votes" });
  }

  try {
    const votesRef = db.ref(`contestants/${contestantId}/votes`);
    await votesRef.transaction(current => {
      const currentVotes = Number(current || 0);
      return currentVotes + voteCount;
    });

    return res.json({ success: true, contestantId, votes: voteCount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to add votes" });
  }
});

app.post("/api/admin-add-votes", async (req, res) => {
  if (!requireAdmin(req, res)) {
    return;
  }

  const { contestantId, votes } = req.body || {};
  const voteCount = Number(votes || 0);

  if (!contestantId || voteCount <= 0) {
    return res.status(400).json({ error: "Missing contestantId or votes" });
  }

  try {
    const votesRef = db.ref(`contestants/${contestantId}/votes`);
    await votesRef.transaction(current => {
      const currentVotes = Number(current || 0);
      return currentVotes + voteCount;
    });

    return res.json({ success: true, contestantId, votes: voteCount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to add votes" });
  }
});

// Fetch Registrations (Admin Only)
app.get("/api/admin/registrations", (req, res) => {
  if (!requireAdmin(req, res)) {
    return;
  }

  const registrationData = readDatabase();
  res.status(200).json(registrationData);
});

// Export Registrations as CSV or Excel (Admin Only)
app.get("/api/admin/registrations/export/:format", (req, res) => {
  if (!requireAdmin(req, res)) {
    return;
  }

  const { format } = req.params;
  const db = readDatabase();

  if (format === "csv") {
    const csvData = db.map((entry) =>
      Object.values(entry)
        .map((value) => `"${value}"`)
        .join(",")
    );
    const csvHeader = Object.keys(db[0]).join(",") + "\n";
    const csvContent = csvHeader + csvData.join("\n");

    res.setHeader("Content-Disposition", "attachment; filename=registrations.csv");
    res.setHeader("Content-Type", "text/csv");
    res.status(200).send(csvContent);
  } else if (format === "xlsx") {
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(db);
    xlsx.utils.book_append_sheet(workbook, worksheet, "Registrations");

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", "attachment; filename=registrations.xlsx");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.status(200).send(buffer);
  } else {
    res.status(400).json({ message: "Invalid export format. Use 'csv' or 'xlsx'." });
  }
});

// Start Server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
