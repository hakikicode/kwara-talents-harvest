const popupKey = "kth_flash_seen";

window.onload = () => {
  if (!localStorage.getItem(popupKey)) {
    document.getElementById("flashPopup").style.display = "flex";
    localStorage.setItem(popupKey, "true");
  }
};

function closeFlash() {
  document.getElementById("flashPopup").style.display = "none";
}

const slides = document.querySelectorAll(".hero-slide");
const nextBtn = document.querySelector(".hero-nav.next");
const prevBtn = document.querySelector(".hero-nav.prev");

let index = 0;
let timer;

function showSlide(i, dir = "next") {
  slides.forEach(s => s.classList.remove("active", "exit-left"));

  if (dir === "next" && index > 0) {
    slides[index - 1]?.classList.add("exit-left");
  }

  slides[i].classList.add("active");
}

function nextSlide() {
  index = (index + 1) % slides.length;
  showSlide(index, "next");
}

function prevSlide() {
  index = (index - 1 + slides.length) % slides.length;
  showSlide(index, "prev");
}

nextBtn.onclick = () => {
  clearInterval(timer);
  nextSlide();
  auto();
};

prevBtn.onclick = () => {
  clearInterval(timer);
  prevSlide();
  auto();
};

function auto() {
  timer = setInterval(nextSlide, 4000);
}

auto();


// ======= REGISTRATION COUNTDOWN =======
const registrationDeadline = new Date("2026-02-10T00:00:00").getTime(); // Feb 10, 2026 midnight

function updateRegistrationStatus() {
  const now = new Date().getTime();
  const timeLeft = registrationDeadline - now;

  // Select all registration buttons
  const registerButtons = document.querySelectorAll('a[href="register.html"]');

  if (timeLeft <= 0) {
    // Registration closed
    registerButtons.forEach(btn => {
      btn.href = "#"; // disable link
      btn.classList.remove("primary");
      btn.classList.add("disabled"); // optional: add a disabled style
      btn.onclick = (e) => {
        e.preventDefault();
        alert("Registration is closed. Shortlisted candidates will be contacted and voting will open soon.");
      };
      btn.innerText = "Registration Closed";
    });
  } else {
    // Optional: Show countdown in console or on page
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    console.log(`Registration opens in ${days}d ${hours}h ${minutes}m ${seconds}s`);
  }
}

// Update every second
setInterval(updateRegistrationStatus, 1000);
updateRegistrationStatus(); // initial check
