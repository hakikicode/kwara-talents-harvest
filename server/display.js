// Fetch data from db.json
const fetchData = async () => {
    try {
      const response = await fetch("/src/api/db.json");
      const data = await response.json();
      populateTable(data);
    } catch (error) {
      console.error("Failed to fetch data:", error.message);
    }
  };
  
  // Populate table with data
  const populateTable = (data) => {
    const tableBody = document.querySelector("#registrationTable tbody");
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
    const table = document.querySelector("#registrationTable");
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
    const table = document.querySelector("#registrationTable");
    const worksheet = XLSX.utils.table_to_sheet(table);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Registrations");
  
    XLSX.writeFile(workbook, "registrations.xlsx");
  };
  
  // Download as PDF
  const downloadPDF = async () => {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    const table = document.querySelector("#registrationTable");
  
    const rows = Array.from(table.rows).map((row) =>
      Array.from(row.cells).map((cell) => cell.textContent)
    );
  
    pdf.autoTable({
      head: [rows[0]],
      body: rows.slice(1),
    });
  
    pdf.save("registrations.pdf");
  };
  
  // Fetch data on load
  fetchData();
  