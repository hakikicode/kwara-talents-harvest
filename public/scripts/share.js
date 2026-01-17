function share() {
  const text = `I just voted on Kwara Talent Harvest 6.0! 🇳🇬🔥
Vote your favorite now 👉 https://www.kwaratalentsharvest.com.ng`;

  if (navigator.share) {
    navigator.share({ text });
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  }
}
