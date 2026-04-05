import { header, navLinks, sections, revealItems } from "./dom.js";

const syncHeaderState = () => {
  header.classList.toggle("scrolled", window.scrollY > 16);
};

const setActiveLink = () => {
  const scrollPosition = window.scrollY + 140;

  sections.forEach((section) => {
    const top = section.offsetTop;
    const bottom = top + section.offsetHeight;
    const id = section.getAttribute("id");
    const relatedLink = document.querySelector(`.nav-links a[href="#${id}"]`);

    if (scrollPosition >= top && scrollPosition < bottom) {
      navLinks.forEach((link) => link.classList.remove("active"));
      if (relatedLink) {
        relatedLink.classList.add("active");
      }
    }
  });
};

const setupRevealObserver = () => {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.18 });

  revealItems.forEach((item) => revealObserver.observe(item));
};

export const initializeNavigation = () => {
  setupRevealObserver();

  window.addEventListener("scroll", () => {
    syncHeaderState();
    setActiveLink();
  });

  window.addEventListener("load", () => {
    syncHeaderState();
    setActiveLink();
  });
};
