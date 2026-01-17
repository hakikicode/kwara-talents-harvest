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

