import { useEffect, useState } from "react";

const sectionIds = ["home", "services", "appointment", "promotions", "reviews", "area", "pricing", "contact"];

export const useActiveSection = () => {
  const [activeSection, setActiveSection] = useState("home");

  useEffect(() => {
    const onScroll = () => {
      let current = "home";

      sectionIds.forEach((id) => {
        const section = document.getElementById(id);

        if (section && window.scrollY >= section.offsetTop - 140) {
          current = id;
        }
      });

      setActiveSection(current);
    };

    window.addEventListener("scroll", onScroll);
    onScroll();

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return activeSection;
};
