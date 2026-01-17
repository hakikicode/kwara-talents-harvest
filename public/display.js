// Firebase Realtime Database URL
const FIREBASE_URL = "https://talenthunt-e6d1e-default-rtdb.firebaseio.com/registrations.json";

// Fetch data from Firebase
const fetchData = async () => {
  try {
    const response = await fetch(FIREBASE_URL);
    const data = await response.json();

    if (data) {
      const formattedData = Object.values(data); // Convert Firebase object to array
      populateTable(formattedData); // Populate table with fetched data
    } else {
      console.warn("No data found in Firebase");
    }
  } catch (error) {
    console.error("Failed to fetch data:", error.message);
  }
};

// Populate the table with data
const populateTable = (data) => {
  const tableBody = document.getElementById("registrations-body");
  tableBody.innerHTML = ""; // Clear existing rows

  data.forEach((entry) => {
    const row = document.createElement("tr");

    Object.values(entry).forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });

    tableBody.appendChild(row);
  });
};

// Download as CSV
const downloadCSV = () => {
  const table = document.querySelector("#registrations-table");
  const rows = Array.from(table.rows);

  const csvContent = rows
    .map((row) =>
      Array.from(row.cells)
        .map((cell) => `"${cell.textContent}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "registrations.csv";
  link.click();
};

// Download as Excel
const downloadExcel = () => {
  const table = document.querySelector("#registrations-table");
  const worksheet = XLSX.utils.table_to_sheet(table);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Registrations");

  XLSX.writeFile(workbook, "registrations.xlsx");
};

// Fetch data on load
fetchData();
