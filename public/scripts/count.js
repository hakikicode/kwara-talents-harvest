const message = document.getElementById("redirectMessage");

if (message) {
  message.textContent = "Redirecting to the unified admin panel...";
}

setTimeout(() => {
  window.location.replace("admin.html");
}, 700);
