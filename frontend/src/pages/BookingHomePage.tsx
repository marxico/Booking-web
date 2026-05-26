import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, MouseEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { business, expectations, faqs, promotions, serviceAreas, services } from "../data/business";
import { useSquarePayment } from "../hooks/useSquarePayment";
import { loadAvailableTimes, loadBookingSetup, submitBooking } from "../services/bookingApi";
import {
  getBookingFieldError,
  getBookingFormErrors,
  sanitizePhoneInput,
  validateBookingFormData
} from "../services/validation";
import type { BookingFieldErrors, BookingFormData, BookingMessage, PricingItem, SquareConfig } from "../types/booking";

const today = new Date().toISOString().split("T")[0];
const maxBookingDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

const emptyFormData: BookingFormData = {
  name: "",
  phone: "",
  email: "",
  vehicle: "",
  service: "",
  date: "",
  time: "",
  company: ""
};

const seoByPath: Record<string, { title: string; description: string; canonicalPath: string }> = {
  "/": {
    title: "Lawson Mobile Mechanic | Mobile Auto Repair in Memphis",
    description: "Book mobile mechanic service in Memphis for diagnostics, brakes, battery, oil changes, and roadside help.",
    canonicalPath: "/"
  },
  "/mobile-mechanic-memphis": {
    title: "Mobile Mechanic Memphis | Lawson Mobile Mechanic",
    description: "On-site auto repair in Memphis, Germantown, Bartlett, Collierville, Cordova, Southaven, and Olive Branch.",
    canonicalPath: "/mobile-mechanic-memphis"
  },
  "/services": {
    title: "Mobile Auto Repair Services in Memphis | Lawson Mobile Mechanic",
    description: "Explore mobile brake repair, battery service, oil changes, diagnostics, and roadside assistance around Memphis.",
    canonicalPath: "/services"
  },
  "/brake-repair-memphis": {
    title: "Mobile Brake Repair Memphis | Lawson Mobile Mechanic",
    description: "Book mobile brake inspections, pads, rotors, and brake noise checks with Lawson Mobile Mechanic.",
    canonicalPath: "/brake-repair-memphis"
  },
  "/battery-replacement-memphis": {
    title: "Mobile Battery Replacement Memphis | Lawson Mobile Mechanic",
    description: "Get mobile battery testing, replacement planning, jump-start support, and charging system checks.",
    canonicalPath: "/battery-replacement-memphis"
  },
  "/oil-change-memphis": {
    title: "Mobile Oil Change Memphis | Lawson Mobile Mechanic",
    description: "Schedule mobile oil and filter service with fluid checks at home, work, or your parking location.",
    canonicalPath: "/oil-change-memphis"
  },
  "/car-diagnostics-memphis": {
    title: "Mobile Car Diagnostics Memphis | Lawson Mobile Mechanic",
    description: "Book mobile diagnostics for check engine lights, no-start issues, warning lights, leaks, and strange sounds.",
    canonicalPath: "/car-diagnostics-memphis"
  },
  "/roadside-assistance-memphis": {
    title: "Roadside Assistance Memphis | Lawson Mobile Mechanic",
    description: "Request mobile roadside mechanic help for urgent vehicle issues around Memphis and nearby areas.",
    canonicalPath: "/roadside-assistance-memphis"
  },
  "/promotions": {
    title: "Mobile Mechanic Promotions Memphis | Lawson Mobile Mechanic",
    description: "See current online booking offers for diagnostics, brake service, and mobile auto repair in Memphis.",
    canonicalPath: "/promotions"
  },
  "/book": {
    title: "Book a Mobile Mechanic in Memphis | Lawson Mobile Mechanic",
    description: "Reserve a mobile mechanic appointment online with secure payment and live appointment availability.",
    canonicalPath: "/book"
  }
};

const serviceUrlByTitle: Record<string, string> = {
  Brakes: "/brake-repair-memphis",
  Battery: "/battery-replacement-memphis",
  "Oil Change": "/oil-change-memphis",
  Diagnostics: "/car-diagnostics-memphis",
  Roadside: "/roadside-assistance-memphis"
};

const upsertMeta = (selector: string, createElement: () => HTMLMetaElement | HTMLLinkElement | HTMLScriptElement) => {
  const existing = document.head.querySelector(selector);
  const element = existing || createElement();

  if (!existing) {
    document.head.appendChild(element);
  }

  return element;
};

const loadTurnstileScript = () => new Promise<void>((resolve, reject) => {
  const scriptUrl = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  const existingScript = document.querySelector(`script[data-turnstile-sdk="${scriptUrl}"]`);

  if (existingScript) {
    if (window.turnstile) {
      resolve();
      return;
    }

    existingScript.addEventListener("load", () => resolve(), { once: true });
    existingScript.addEventListener("error", () => reject(new Error("Could not load human verification.")), { once: true });
    return;
  }

  const script = document.createElement("script");
  script.src = scriptUrl;
  script.async = true;
  script.defer = true;
  script.dataset.turnstileSdk = scriptUrl;
  script.addEventListener("load", () => resolve(), { once: true });
  script.addEventListener("error", () => reject(new Error("Could not load human verification.")), { once: true });
  document.head.appendChild(script);
});

export function BookingHomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [pricing, setPricing] = useState<PricingItem[]>([]);
  const [squareConfig, setSquareConfig] = useState<SquareConfig | null>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [timePlaceholder, setTimePlaceholder] = useState("Choose a date first");
  const [formData, setFormData] = useState<BookingFormData>(emptyFormData);
  const [fieldErrors, setFieldErrors] = useState<BookingFieldErrors>({});
  const [message, setMessage] = useState<BookingMessage>({ text: "", type: "success" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetRef = useRef<string>("");
  const { cardContainerRef, paymentStatusText, tokenizeCard } = useSquarePayment(squareConfig);

  const bookingFee = useMemo(
    () => pricing.find((item) => item.isBookingFee) || null,
    [pricing]
  );

  const visiblePricing = useMemo(
    () => pricing.filter((item) => !item.isBookingFee).slice(0, 4),
    [pricing]
  );
  const bookingUnavailable = Boolean(squareConfig && !squareConfig.enabled);

  const scrollToSection = (sectionId: string) => {
    window.requestAnimationFrame(() => {
      const section = document.getElementById(sectionId);

      if (!section) {
        return;
      }

      section.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handlePublicNav = (event: MouseEvent<HTMLAnchorElement>, path: string, sectionId: string) => {
    event.preventDefault();
    navigate(`${path}#${sectionId}`);
    scrollToSection(sectionId);
  };

  useEffect(() => {
    const seo = seoByPath[location.pathname] || seoByPath["/"];
    const canonicalUrl = `${window.location.origin}${seo.canonicalPath}`;

    document.title = seo.title;
    upsertMeta('meta[name="description"]', () => {
      const meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      return meta;
    }).setAttribute("content", seo.description);
    upsertMeta('meta[name="robots"]', () => {
      const meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      return meta;
    }).setAttribute("content", "index, follow");
    upsertMeta('link[rel="canonical"]', () => {
      const link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      return link;
    }).setAttribute("href", canonicalUrl);
    upsertMeta('meta[property="og:title"]', () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:title");
      return meta;
    }).setAttribute("content", seo.title);
    upsertMeta('meta[property="og:description"]', () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:description");
      return meta;
    }).setAttribute("content", seo.description);
    upsertMeta('meta[property="og:url"]', () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:url");
      return meta;
    }).setAttribute("content", canonicalUrl);
    upsertMeta('meta[property="og:type"]', () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:type");
      return meta;
    }).setAttribute("content", "website");

  }, [location.pathname]);

  useEffect(() => {
    if (location.hash) {
      scrollToSection(location.hash.replace("#", ""));
      return;
    }

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    });
  }, [location.hash, location.pathname]);

  useEffect(() => {
    const revealElements = Array.from(document.querySelectorAll<HTMLElement>(".customer-page .reveal"));
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    revealElements.forEach((element, index) => {
      element.style.setProperty("--reveal-index", String(index % 6));
    });

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealElements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.16
      }
    );

    revealElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [visiblePricing.length]);

  useEffect(() => {
    loadBookingSetup()
      .then((setup) => {
        setPricing(setup.pricing);
        setSquareConfig(setup.squareConfig);
      })
      .catch(() => {
        setPricing([]);
        setSquareConfig(null);
      });
  }, []);

  useEffect(() => {
    if (!formData.date) {
      setAvailableTimes([]);
      setTimePlaceholder("Choose a date first");
      return;
    }

    loadAvailableTimes(formData.date)
      .then((times) => {
        setAvailableTimes(times);
        setTimePlaceholder(times.length ? "Choose a time" : "No times available");
      })
      .catch(() => {
        setAvailableTimes([]);
        setTimePlaceholder("Could not load times");
      });
  }, [formData.date]);

  useEffect(() => {
    if (!message.text) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setMessage((current) => current.text ? { ...current, text: "" } : current);
    }, 4800);

    return () => window.clearTimeout(timeoutId);
  }, [message]);

  useEffect(() => {
    if (!squareConfig?.turnstileSiteKey || !turnstileContainerRef.current || turnstileWidgetRef.current) {
      return;
    }

    loadTurnstileScript()
      .then(() => {
        if (!window.turnstile || !turnstileContainerRef.current || turnstileWidgetRef.current) {
          return;
        }

        turnstileWidgetRef.current = window.turnstile.render(turnstileContainerRef.current, {
          sitekey: squareConfig.turnstileSiteKey || "",
          callback: (token) => setTurnstileToken(token),
          "expired-callback": () => setTurnstileToken(""),
          "error-callback": () => setTurnstileToken("")
        });
      })
      .catch((error) => {
        setMessage({
          text: error instanceof Error ? error.message : "Could not load human verification.",
          type: "error"
        });
      });
  }, [squareConfig?.turnstileSiteKey]);

  const handleFormChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    const normalizedValue = name === "phone" ? sanitizePhoneInput(value) : value;
    const nextFormData = {
      ...formData,
      [name]: normalizedValue,
      ...(name === "date" ? { time: "" } : {})
    };

    setFormData(nextFormData);
    setFieldErrors((current) => {
      const nextErrors = { ...current };
      const error = getBookingFieldError(name as keyof BookingFormData, nextFormData);

      if (error) {
        nextErrors[name as keyof BookingFormData] = error;
      } else {
        delete nextErrors[name as keyof BookingFormData];
      }

      if (name === "date") {
        delete nextErrors.time;
      }

      return nextErrors;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const nextFieldErrors = getBookingFormErrors(formData);
      setFieldErrors(nextFieldErrors);

      if (Object.keys(nextFieldErrors).length) {
        setMessage({ text: "Please complete the highlighted fields.", type: "error" });
        return;
      }

      validateBookingFormData(formData);

      if (!squareConfig?.enabled) {
        throw new Error("Online booking is temporarily unavailable until secure card payments are configured.");
      }

      if (squareConfig.turnstileSiteKey && !turnstileToken) {
        throw new Error("Please complete the human verification before booking.");
      }

      const sourceId = await tokenizeCard();

      const result = await submitBooking({
        formData,
        sourceId,
        turnstileToken
      });

      setMessage({ text: result.message || "Your booking request was sent.", type: "success" });
      setFormData(emptyFormData);
      setFieldErrors({});
      setAvailableTimes([]);
      setTimePlaceholder("Choose a date first");
      setTurnstileToken("");
      window.turnstile?.reset(turnstileWidgetRef.current);
    } catch (error) {
      window.turnstile?.reset(turnstileWidgetRef.current);
      setTurnstileToken("");
      setMessage({
        text: error instanceof Error ? error.message : "We could not send the booking request.",
        type: "error"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <header className="site-header">
        <nav className="nav-shell" aria-label="Main navigation">
          <a className="brand brand--logo" href="/mobile-mechanic-memphis">
            <img className="brand__mark" src={business.logo} alt="" />
            <span className="brand__text">
              <strong>{business.name}</strong>
              <span>{business.tagline}</span>
            </span>
          </a>
          <div className="nav-links">
            <a href="/services#services" onClick={(event) => handlePublicNav(event, "/services", "services")}>Services</a>
            <a href="/promotions#promotions" onClick={(event) => handlePublicNav(event, "/promotions", "promotions")}>Promotions</a>
            <a href="/book#appointment" onClick={(event) => handlePublicNav(event, "/book", "appointment")}>Book</a>
          </div>
          <a className="nav-phone" href={business.phoneHref}>{business.phone}</a>
        </nav>
      </header>

      <main className="customer-page">
        <section className="hero" id="home">
          <div className="container hero-panel">
            <div className="hero-copy" style={{ opacity: 1, transform: "none" }}>
              <span className="eyebrow">Mobile mechanic appointments</span>
              <h1>{business.name}</h1>
              <p>Book on-site auto service for brakes, batteries, diagnostics, oil changes, and roadside help around Memphis.</p>
              <ul className="hero-services" aria-label="Popular services">
                {services.slice(0, 5).map((service) => (
                  <li key={service.title}>
                    <a href={serviceUrlByTitle[service.title] || "/services"}>{service.title}</a>
                  </li>
                ))}
              </ul>
              <div className="hero-actions">
                <a className="btn btn-primary" href="/book#appointment" onClick={(event) => handlePublicNav(event, "/book", "appointment")}>Book Now</a>
                <a className="btn btn-secondary" href="/services#services" onClick={(event) => handlePublicNav(event, "/services", "services")}>View Services</a>
              </div>
              <div className="mobile-proof-strip" aria-label="Booking highlights">
                <span>Same-day windows</span>
                <span>Secure booking</span>
                <span>Memphis area</span>
              </div>
            </div>
            <div className="hero-photo reveal reveal--scale">
              <img src="/assets/mechanic-hero.jpg" alt="Mechanic inspecting a vehicle engine" width="900" height="600" />
              <div className="hero-proof">
                <strong>{bookingFee ? `${bookingFee.priceFormatted} booking visit` : "Fast booking online"}</strong>
                <span>Choose a service, pick a time, and we will confirm the details by phone or text.</span>
              </div>
            </div>
          </div>
        </section>

        <section id="services">
          <div className="container split">
            <div className="section-copy reveal reveal--slide-left">
              <span className="eyebrow">Services</span>
              <h2>Simple repairs, brought to your location.</h2>
              <p>Mobile service for routine maintenance, urgent issues, and clear diagnostics before bigger repairs.</p>
              <img className="section-image" src="/assets/mechanic-services-premium.png" alt="Mechanic performing a diagnostic check under the hood of a car" width="1680" height="960" loading="lazy" />
            </div>
            <div className="services-list reveal reveal--slide-right">
              {services.map((service) => (
                <article className="reveal reveal--item" key={service.title}>
                  <span>{service.initial}</span>
                  <div>
                    <h3><a href={serviceUrlByTitle[service.title] || "/services"}>{service.title}</a></h3>
                    <p>{service.copy}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="promotions">
          <div className="container">
            <div className="section-heading reveal">
              <span className="eyebrow">Promotions</span>
              <h2>Current offers.</h2>
              <p>Useful savings for new customers and common maintenance appointments.</p>
            </div>
            <div className="promo-grid">
              {promotions.map((promotion) => (
                <article className="promo-card reveal reveal--item reveal--lift" key={promotion.title}>
                  <span className="promo-label">{promotion.label}</span>
                  <h3>{promotion.title}</h3>
                  <p>{promotion.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="appointment">
          <div className="container">
            <div className="section-heading reveal">
              <span className="eyebrow">Booking</span>
              <h2>Request an appointment.</h2>
              <p>Send the basics and we will confirm the service details before the visit.</p>
            </div>
            <div className="appointment-layout reveal reveal--scale">
              <form className="form-card" noValidate onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="name">Name</label>
                    <input id="name" name="name" type="text" placeholder="Your name" autoComplete="name" value={formData.name} onChange={handleFormChange} />
                    {fieldErrors.name ? <p className="field-error">{fieldErrors.name}</p> : null}
                  </div>
                  <div className="field">
                    <label htmlFor="phone">Phone</label>
                    <input id="phone" name="phone" type="tel" placeholder="(901) 555-0123" autoComplete="tel" value={formData.phone} onChange={handleFormChange} />
                    {fieldErrors.phone ? <p className="field-error">{fieldErrors.phone}</p> : null}
                  </div>
                  <div className="field">
                    <label htmlFor="email">Email</label>
                    <input id="email" name="email" type="email" placeholder="name@example.com" autoComplete="email" value={formData.email} onChange={handleFormChange} />
                    {fieldErrors.email ? <p className="field-error">{fieldErrors.email}</p> : null}
                  </div>
                  <div className="field">
                    <label htmlFor="vehicle">Vehicle</label>
                    <input id="vehicle" name="vehicle" type="text" placeholder="2020 Toyota Camry" autoComplete="off" value={formData.vehicle} onChange={handleFormChange} />
                    {fieldErrors.vehicle ? <p className="field-error">{fieldErrors.vehicle}</p> : null}
                  </div>
                  <div className="booking-trap" aria-hidden="true">
                    <label htmlFor="company">Company</label>
                    <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" value={formData.company} onChange={handleFormChange} />
                  </div>
                  <div className="field">
                    <label htmlFor="service">Service</label>
                    <select id="service" name="service" value={formData.service} onChange={handleFormChange}>
                      <option value="" disabled>Choose a service</option>
                      {services.map((service) => (
                        <option key={service.title} value={service.title}>{service.title}</option>
                      ))}
                    </select>
                    {fieldErrors.service ? <p className="field-error">{fieldErrors.service}</p> : null}
                  </div>
                  <div className="field">
                    <label htmlFor="date">Date</label>
                    <input id="date" name="date" type="date" min={today} max={maxBookingDate} value={formData.date} onChange={handleFormChange} />
                    {fieldErrors.date ? <p className="field-error">{fieldErrors.date}</p> : null}
                  </div>
                  <div className="field">
                    <label htmlFor="time">Time</label>
                    <select id="time" name="time" value={formData.time} onChange={handleFormChange} disabled={!availableTimes.length}>
                      <option value="" disabled>{timePlaceholder}</option>
                      {availableTimes.map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                    {fieldErrors.time ? <p className="field-error">{fieldErrors.time}</p> : null}
                  </div>
                </div>
                <div className="form-footer">
                  <section className="payment-panel" aria-live="polite">
                    <div className="payment-panel__header">
                      <div>
                        <p className="payment-panel__eyebrow">Secure payment</p>
                        <h3>{squareConfig?.serviceCallOutFeeFormatted ? `Pay ${squareConfig.serviceCallOutFeeFormatted} to reserve` : "Card payment required"}</h3>
                      </div>
                      <span className="payment-badge">{squareConfig?.serviceCallOutFeeFormatted || "Required"}</span>
                    </div>
                    <p className="payment-panel__copy">
                      {bookingUnavailable
                        ? "Online booking will open as soon as Square production credentials are configured."
                        : "Your card is processed securely by Square. No card details are stored on this site."}
                    </p>
                    <div className="square-card" ref={cardContainerRef} />
                    <p className="payment-status">{paymentStatusText}</p>
                  </section>
                  {squareConfig?.turnstileSiteKey ? (
                    <div className="turnstile-panel" ref={turnstileContainerRef} aria-label="Human verification" />
                  ) : null}
                  <button className="btn btn-primary" type="submit" disabled={isSubmitting || !squareConfig?.enabled}>
                    {isSubmitting ? "Processing secure payment..." : bookingUnavailable ? "Booking Temporarily Unavailable" : "Pay & Send Booking Request"}
                  </button>
                  <div className="success-message visible" data-state={message.type} style={{ opacity: message.text ? 1 : 0 }}>
                    {message.text}
                  </div>
                </div>
              </form>
              <aside className="info-card reveal reveal--slide-right">
                <span className="info-card__eyebrow">What to expect</span>
                <h3>Clear service from the first request.</h3>
                <ul className="info-list">
                  {expectations.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </aside>
            </div>
          </div>
        </section>

        {visiblePricing.length ? (
          <section id="pricing">
            <div className="container">
              <div className="section-heading reveal">
                <span className="eyebrow">Starting prices</span>
                <h2>Plan before you book.</h2>
              </div>
              <div className="pricing-grid">
                {visiblePricing.map((item) => (
                  <article className="service-card reveal reveal--item reveal--lift" key={item.code}>
                    <div className="service-meta">
                      <span className="service-tag">{item.name}</span>
                      <strong className="price">{item.priceFormatted}</strong>
                    </div>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section id="area">
          <div className="container final-cta reveal reveal--scale">
            <span className="eyebrow">Service area</span>
            <h2>Serving Memphis and nearby areas.</h2>
            <p>{serviceAreas.join(", ")}</p>
            <div className="hero-actions final-cta__actions">
              <a className="btn btn-primary" href="/book#appointment" onClick={(event) => handlePublicNav(event, "/book", "appointment")}>Book a Visit</a>
              <a className="btn btn-secondary" href={business.phoneHref}>Call {business.phone}</a>
            </div>
          </div>
        </section>

        <section id="faq">
          <div className="container">
            <div className="section-heading reveal">
              <span className="eyebrow">Questions</span>
              <h2>Mobile mechanic FAQ.</h2>
            </div>
            <div className="faq-grid">
              {faqs.map((faq) => (
                <article className="faq-item reveal reveal--item" key={faq.question}>
                  <h3>{faq.question}</h3>
                  <p>{faq.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer>
        <p>{business.name} | {business.location} | <a href={business.emailHref}>{business.email}</a></p>
      </footer>
      <a className="mobile-call" href={business.phoneHref}>Call {business.phone}</a>
    </>
  );
}
