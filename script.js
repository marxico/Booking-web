const header = document.getElementById("siteHeader");
const navLinks = document.querySelectorAll(".nav-links a");
const sections = document.querySelectorAll("main section");
const form = document.getElementById("appointmentForm");
const successMessage = document.getElementById("successMessage");
const revealItems = document.querySelectorAll(".reveal");
const dateInput = document.getElementById("date");

const today = new Date().toISOString().split("T")[0];
dateInput.min = today;

const syncHeaderState = () => {
  header.classList.toggle("scrolled", window.scrollY > 16);
};

const setActiveLink = () => {
  const scrollPosition = window.scrollY + 140;

  sections.forEach((section) => {
    const top = section.offsetTop;
    const bottom = top + section.offsetHeight;
    const id = section.getAttribute("id");
    const relatedLink = document.querySelector('.nav-links a[href="#' + id + '"]');

    if (scrollPosition >= top && scrollPosition < bottom) {
      navLinks.forEach((link) => link.classList.remove("active"));
      if (relatedLink) {
        relatedLink.classList.add("active");
      }
    }
  });
};

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.18 });

revealItems.forEach((item) => revealObserver.observe(item));

window.addEventListener("scroll", () => {
  syncHeaderState();
  setActiveLink();
});

window.addEventListener("load", () => {
  syncHeaderState();
  setActiveLink();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const name = formData.get("name");
  const email = formData.get("email");
  const date = formData.get("date");
  const time = formData.get("time");

  try {
    const response = await fetch('http://localhost:3000/book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, email, date, time })
    });

    const result = await response.json();

    if (response.ok) {
      successMessage.textContent = result.message;
      successMessage.classList.add("visible");
      form.reset();
      dateInput.min = today;
      window.setTimeout(() => {
        successMessage.classList.remove("visible");
      }, 5000);
    } else {
      successMessage.textContent = result.error;
      successMessage.classList.add("visible");
      window.setTimeout(() => {
        successMessage.classList.remove("visible");
      }, 5000);
    }
  } catch (error) {
    successMessage.textContent = "Error al conectar con el servidor.";
    successMessage.classList.add("visible");
    window.setTimeout(() => {
      successMessage.classList.remove("visible");
    }, 5000);
  }
});
