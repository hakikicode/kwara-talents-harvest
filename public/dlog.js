
// Store the precomputed SHA-256 hash of your password
    const validHash = "3e9360575161c1fe93bd894a3208d6ef4e84febc534e4153117ee5dbc4156b60";

    // Function to compute the SHA-256 hash of the entered password
    async function hashPassword(password) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hash = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Prompt user for a password and validate
    async function checkAccess() {
      const password = prompt("Enter the password to access this page:");

      // If the user cancels or enters nothing, redirect them
      if (!password) {
        alert("Access Denied!");
        window.location.href = "/"; // Redirect to another page
        return;
      }

      // Validate the hash of the entered password
      const hash = await hashPassword(password);
      if (hash !== validHash) {
        alert("Incorrect Password! Access Denied.");
        window.location.href = "/"; // Redirect to another page
      }
    }

    // Run the access check on page load
    window.onload = checkAccess;
