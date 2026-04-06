import { useEffect, useMemo, useRef, useState } from "react";

const today = new Date().toISOString().split("T")[0];

const serviceCardMeta = {
  diagnostic_visit: { tag: "Diagnostics" },
  brake_service: { tag: "Maintenance" },
  battery_service: { tag: "Electrical" },
  roadside_assistance: { tag: "Roadside" }
};

const fallbackServiceCards = [
  {
    code: "fleet_support",
    tag: "Fleet",
    priceFormatted: "Custom",
    name: "Commercial Vehicle Support",
    description: "Work-truck and business vehicle service designed to reduce downtime and keep the schedule moving.",
    cta: "Request service"
  },
  {
    code: "coverage",
    tag: "Coverage",
    priceFormatted: "Local",
    name: "Memphis Area Coverage",
    description: "Serving Memphis, Tennessee with mobile convenience for drivers who need reliable service where they are.",
    cta: "Check availability"
  },
  {
    code: "quality",
    tag: "Quality",
    priceFormatted: "Backed",
    name: "Confident Repairs",
    description: "Practical recommendations, quality parts, and a service experience that feels thoughtful from start to finish.",
    cta: "Book now"
  }
];

const loadSquareScript = (environment) => new Promise<void>((resolve, reject) => {
  const scriptUrl = environment === "production"
    ? "https://web.squarecdn.com/v1/square.js"
    : "https://sandbox.web.squarecdn.com/v1/square.js";
  const existingScript = document.querySelector(`script[data-square-sdk="${scriptUrl}"]`);

  if (existingScript) {
    if (window.Square) {
      resolve();
      return;
    }

    existingScript.addEventListener("load", () => resolve(), { once: true });
    existingScript.addEventListener("error", () => reject(new Error("Could not load the Square Web Payments SDK.")), { once: true });
    return;
  }

  const script = document.createElement("script");
  script.src = scriptUrl;
  script.async = true;
  script.dataset.squareSdk = scriptUrl;
  script.addEventListener("load", () => resolve(), { once: true });
  script.addEventListener("error", () => reject(new Error("Could not load the Square Web Payments SDK.")), { once: true });
  document.head.appendChild(script);
});

const formatMockCardNumber = (value) => String(value || "")
  .replace(/\D/g, "")
  .slice(0, 16)
  .replace(/(\d{4})(?=\d)/g, "$1 ")
  .trim();

const formatMockCardExpiry = (value) => {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

const formatMockCardCvv = (value) => String(value || "").replace(/\D/g, "").slice(0, 4);

function App() {
  const [pricing, setPricing] = useState([]);
  const [squareConfig, setSquareConfig] = useState(null);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [timePlaceholder, setTimePlaceholder] = useState("Select a date first");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    date: "",
    time: ""
  });
  const [mockCard, setMockCard] = useState({
    cardholder: "Test Customer",
    number: "4111 1111 1111 1111",
    expiry: "12/34",
    cvv: "123"
  });
  const [message, setMessage] = useState({ text: "", type: "success" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentStatusText, setPaymentStatusText] = useState("Loading Square payment setup...");
  const [activeSection, setActiveSection] = useState("home");
  const cardContainerRef = useRef(null);
  const squareCardRef = useRef(null);
  const squareSetupPromiseRef = useRef(null);

  const bookingFee = useMemo(
    () => pricing.find((item) => item.isBookingFee) || null,
    [pricing]
  );

  const serviceCards = useMemo(() => {
    const apiCards = pricing
      .filter((item) => !item.isBookingFee)
      .map((item) => ({
        code: item.code,
        tag: serviceCardMeta[item.code]?.tag || "Service",
        priceFormatted: item.priceFormatted,
        name: item.name,
        description: item.description,
        cta: "Request service"
      }));

    if (bookingFee) {
      apiCards.unshift({
        code: bookingFee.code,
        tag: "Diagnostics",
        priceFormatted: bookingFee.priceFormatted,
        name: bookingFee.name,
        description: bookingFee.description,
        cta: "Pay and reserve"
      });
    }

    return [...apiCards, ...fallbackServiceCards].slice(0, 6);
  }, [pricing, bookingFee]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [pricingResponse, squareResponse] = await Promise.all([
          fetch("/pricing"),
          fetch("/square/config")
        ]);

        const pricingResult = await pricingResponse.json();
        const squareResult = await squareResponse.json();

        if (!pricingResponse.ok) {
          throw new Error(pricingResult.error || "Could not load pricing.");
        }

        if (!squareResponse.ok) {
          throw new Error(squareResult.error || "Could not load Square payment settings.");
        }

        setPricing(pricingResult.pricing || []);
        setSquareConfig(squareResult);

        if (squareResult.paymentMode === "mock") {
          setPaymentStatusText("Test payment mode is active. Bookings will be approved with a simulated payment.");
        } else if (squareResult.enabled) {
          setPaymentStatusText("Loading secure card entry...");
        } else if (squareResult.paymentRequired) {
          setPaymentStatusText("Square is not configured yet. Booking is currently disabled until payment credentials are added.");
        } else {
          setPaymentStatusText("Square is not configured yet. Booking requests will still be saved without charging a card.");
        }
      } catch (error) {
        setMessage({ text: error.message || "Could not initialize the booking page.", type: "error" });
        setPaymentStatusText(error.message || "Could not initialize Square.");
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (squareConfig?.paymentMode !== "square" || !squareConfig?.enabled || !cardContainerRef.current || squareCardRef.current) {
      return;
    }

    if (!squareSetupPromiseRef.current) {
      squareSetupPromiseRef.current = (async () => {
        await loadSquareScript(squareConfig.environment);

        if (!window.Square) {
          throw new Error("Square loaded incorrectly. Refresh the page and try again.");
        }

        const payments = window.Square.payments(squareConfig.appId, squareConfig.locationId);
        const card = await payments.card();
        await card.attach(cardContainerRef.current);
        squareCardRef.current = card;
        setPaymentStatusText("Card entry is ready. Your card is tokenized securely by Square.");
      })().catch((error) => {
        setPaymentStatusText(error.message || "Could not initialize Square card entry.");
      });
    }
  }, [squareConfig]);

  useEffect(() => {
    const onScroll = () => {
      const sectionIds = ["home", "appointment", "pricing", "services"];
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

  useEffect(() => {
    if (!formData.date) {
      setAvailableTimes([]);
      setTimePlaceholder("Select a date first");
      return;
    }

    const loadTimes = async () => {
      try {
        const response = await fetch(`/available?date=${encodeURIComponent(formData.date)}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Could not load available times.");
        }

        setAvailableTimes(result.availableTimes || []);
        setTimePlaceholder(result.availableTimes?.length ? "Select a time" : "No times available");
      } catch (error) {
        setAvailableTimes([]);
        setTimePlaceholder("Could not load times");
      }
    };

    loadTimes();
  }, [formData.date]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
      ...(name === "date" ? { time: "" } : {})
    }));
  };

  const handleMockCardChange = (event) => {
    const { name, value } = event.target;
    const formattedValue = name === "number"
      ? formatMockCardNumber(value)
      : name === "expiry"
        ? formatMockCardExpiry(value)
        : name === "cvv"
          ? formatMockCardCvv(value)
          : value;

    setMockCard((current) => ({
      ...current,
      [name]: formattedValue
    }));
  };

  const applyMockCard = (card) => {
    setMockCard({
      cardholder: "Test Customer",
      number: formatMockCardNumber(card.number),
      expiry: card.expiry,
      cvv: card.cvv
    });
    setMessage({
      text: `${card.label} loaded. ${card.description}`,
      type: card.result === "approved" ? "success" : "error"
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      if (squareConfig?.paymentMode === "square" && squareConfig?.paymentRequired && !squareConfig?.enabled) {
        throw new Error("Online booking is disabled until Square is configured.");
      }

      let sourceId;

      if (squareConfig?.paymentMode === "square" && squareConfig?.enabled) {
        await squareSetupPromiseRef.current;

        const card = squareCardRef.current;

        if (!card) {
          throw new Error("Square card entry is not ready yet.");
        }

        const tokenResult = await card.tokenize();

        if (tokenResult.status !== "OK") {
          throw new Error("Square could not tokenize the card. Please double-check the payment details.");
        }

        sourceId = tokenResult.token;
      }

      const response = await fetch("/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...formData,
          sourceId,
          mockCard: squareConfig?.paymentMode === "mock" ? mockCard : undefined
        })
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not create appointment.");
      }

      setMessage({ text: result.message, type: "success" });
      setFormData({
        name: "",
        phone: "",
        email: "",
        date: "",
        time: ""
      });
      setMockCard({
        cardholder: "Test Customer",
        number: "4111 1111 1111 1111",
        expiry: "12/34",
        cvv: "123"
      });
      setAvailableTimes([]);
      setTimePlaceholder("Select a date first");
    } catch (error) {
      setMessage({ text: error.message || "Error connecting to the server.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitLabel = isSubmitting
    ? squareConfig?.paymentMode === "square" && squareConfig?.enabled
      ? "Processing payment..."
      : squareConfig?.paymentMode === "mock"
        ? "Approving test payment..."
        : "Requesting appointment..."
    : squareConfig?.paymentMode === "square" && squareConfig?.paymentRequired && !squareConfig?.enabled
      ? "Booking unavailable"
      : squareConfig?.serviceCallOutFeeFormatted
        ? `${squareConfig?.paymentMode === "mock" ? "Simulate" : "Pay"} ${squareConfig.serviceCallOutFeeFormatted} & Request Appointment`
        : "Request Appointment";

  const navClass = (id) => activeSection === id ? "active" : "";

  return (
    <>
      <header className="site-header scrolled" id="siteHeader">
        <div className="nav-shell">
          <a className="brand brand--logo" href="#home" aria-label="Lawson Mobile Mechanic home">
            <img className="brand__mark" src="/assets/lawson-logo-original.jpeg" alt="Lawson Mobile Mechanic logo" />
            <span className="brand__text">
              <strong>Lawson</strong>
              <span>Mobile Mechanic</span>
            </span>
          </a>
          <nav className="nav-links" aria-label="Primary navigation">
            <a href="#home" className={navClass("home")}>Home</a>
            <a href="#appointment" className={navClass("appointment")}>Book Appointment</a>
            <a href="#pricing" className={navClass("pricing")}>Pricing</a>
            <a href="#services" className={navClass("services")}>Services</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="container hero-panel">
            <div className="hero-copy" style={{ opacity: 1, transform: "none" }}>
              <span className="eyebrow">Mobile auto repair with a premium touch</span>
              <h1>Lawson Mobile Mechanic</h1>
              <p>
                Honest diagnostics, dependable repairs, and on-site service built for drivers who want expert help without the shop hassle.
              </p>
              <div className="hero-actions">
                <a className="btn btn-primary" href="#appointment">Book Service</a>
                <a className="btn btn-secondary" href="#services">Explore Services</a>
              </div>
            </div>

            <div className="hero-grid reveal visible">
              <article className="hero-card hero-card--logo">
                <img className="hero-logo" src="/assets/lawson-logo-original.jpeg" alt="Lawson Mobile Mechanic logo" />
              </article>

              <article className="hero-card hero-card--accent">
                <span className="hero-card__label">Coverage</span>
                <h2>Memphis, Tennessee and surrounding communities</h2>
                <p>Mobile mechanic service across Memphis and nearby neighborhoods throughout the Mid-South area.</p>
              </article>

              <article className="hero-card">
                <span className="hero-card__label">Call-Out Fee</span>
                <h2>{bookingFee ? `${bookingFee.priceFormatted} booking required` : "Paid booking required"}</h2>
                <p>{bookingFee ? `${bookingFee.name} must be paid before the appointment slot is reserved.` : "Appointments are only reserved after the booking fee is paid securely through Square."}</p>
              </article>

              <article className="hero-card">
                <span className="hero-card__label">Approach</span>
                <h2>Veteran-owned, reliable, and direct</h2>
                <p>Clean workmanship, clear communication, and repairs handled with confidence.</p>
              </article>
            </div>
          </div>
        </section>

        <section id="appointment">
          <div className="container">
            <div className="section-heading reveal visible">
              <h2>Book Appointment</h2>
              <p>Choose your preferred date and time, pay the booking amount, and send your request directly to Lawson Mobile Mechanic.</p>
            </div>

            <div className="appointment-layout reveal visible">
              <div className="form-card">
                <form id="appointmentForm" onSubmit={handleSubmit}>
                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="name">Full Name</label>
                      <input id="name" name="name" type="text" placeholder="Your full name" required value={formData.name} onChange={handleChange} />
                    </div>
                    <div className="field">
                      <label htmlFor="phone">Phone Number</label>
                      <input id="phone" name="phone" type="tel" placeholder="(901) 555-0123" autoComplete="tel" required value={formData.phone} onChange={handleChange} />
                    </div>
                    <div className="field">
                      <label htmlFor="email">Email</label>
                      <input id="email" name="email" type="email" placeholder="name@example.com" required value={formData.email} onChange={handleChange} />
                    </div>
                    <div className="field">
                      <label htmlFor="date">Date</label>
                      <input id="date" name="date" type="date" min={today} required value={formData.date} onChange={handleChange} />
                    </div>
                    <div className="field">
                      <label htmlFor="time">Time</label>
                      <select id="time" name="time" required value={formData.time} onChange={handleChange} disabled={!availableTimes.length}>
                        <option value="" disabled>{timePlaceholder}</option>
                        {availableTimes.map((time) => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <section className={`payment-panel ${squareConfig?.paymentMode === "square" && !squareConfig?.enabled ? "payment-panel--inactive" : ""}`} aria-live="polite">
                    <div className="payment-panel__header">
                      <div>
                        <p className="payment-panel__eyebrow">{squareConfig?.paymentProviderLabel || "Payment"}</p>
                        <h3>
                          {squareConfig?.paymentMode === "mock"
                            ? `Simulate ${squareConfig.serviceCallOutFeeFormatted} payment`
                            : squareConfig?.enabled
                              ? `Pay ${squareConfig.serviceCallOutFeeFormatted} to reserve`
                              : squareConfig?.paymentRequired
                                ? "Payment required before booking"
                                : "Square payment not configured"}
                        </h3>
                      </div>
                      <span className="payment-badge">{squareConfig?.serviceCallOutFeeFormatted || bookingFee?.priceFormatted || "$0.00"}</span>
                    </div>
                    <p className="payment-panel__copy">
                      {squareConfig?.paymentMode === "mock"
                        ? "This is a safe test mode. The booking flow records a simulated successful payment so you can validate the full experience before enabling real Square charges."
                        : squareConfig?.enabled
                        ? `Your appointment request is submitted only after Square approves the ${squareConfig.serviceCallOutFeeName.toLowerCase()}.`
                        : squareConfig?.paymentRequired
                          ? "This business requires payment before a slot is reserved. Add valid Square credentials on the server to reopen online booking."
                          : "Add Square credentials on the server to switch this form from request-only mode into paid booking mode."}
                    </p>
                    {squareConfig?.paymentMode === "square" ? (
                      <div className="square-card" ref={cardContainerRef} />
                    ) : (
                      <div className="square-card square-card--mock">
                        {squareConfig?.mockCards?.length ? (
                          <div className="mock-card-presets">
                            {squareConfig.mockCards.map((card) => (
                              <button
                                key={card.number}
                                className="mock-card-preset"
                                type="button"
                                onClick={() => applyMockCard(card)}
                              >
                                <strong>{card.label}</strong>
                                <span>{card.description}</span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                        <div className="mock-card-grid">
                          <div className="field">
                            <label htmlFor="mockCardholder">Cardholder Name</label>
                            <input id="mockCardholder" name="cardholder" type="text" required value={mockCard.cardholder} onChange={handleMockCardChange} />
                          </div>
                          <div className="field field--full">
                            <label htmlFor="mockCardNumber">Test Card Number</label>
                            <input id="mockCardNumber" name="number" type="text" inputMode="numeric" autoComplete="cc-number" placeholder="4111 1111 1111 1111" required value={mockCard.number} onChange={handleMockCardChange} />
                          </div>
                          <div className="field">
                            <label htmlFor="mockCardExpiry">Expiry</label>
                            <input id="mockCardExpiry" name="expiry" type="text" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" required value={mockCard.expiry} onChange={handleMockCardChange} />
                          </div>
                          <div className="field">
                            <label htmlFor="mockCardCvv">CVV</label>
                            <input id="mockCardCvv" name="cvv" type="text" inputMode="numeric" autoComplete="cc-csc" placeholder="123" required value={mockCard.cvv} onChange={handleMockCardChange} />
                          </div>
                        </div>
                      </div>
                    )}
                    <p className="payment-status">{paymentStatusText}</p>
                  </section>

                  <div className="form-footer">
                    <button
                      className="btn btn-primary"
                      type="submit"
                      disabled={isSubmitting || (squareConfig?.paymentMode === "square" && squareConfig?.paymentRequired && !squareConfig?.enabled)}
                    >
                      {submitLabel}
                    </button>
                    <div className={`success-message visible`} data-state={message.type} style={{ opacity: message.text ? 1 : 0, transform: "none" }}>
                      {message.text}
                    </div>
                  </div>
                </form>
              </div>

              <aside className="info-card">
                <span className="info-card__eyebrow">What to expect</span>
                <h3>Convenient service without giving up quality</h3>
                <ul className="info-list">
                  <li>Mobile repair and maintenance for cars, trucks, SUVs, and selected commercial vehicles.</li>
                  <li>Your time slot is only locked after the required booking payment is approved.</li>
                  <li>Square collects the booking payment securely before the request reaches the admin dashboard.</li>
                  <li>Appointments can later be reviewed, accepted, or canceled from the admin dashboard.</li>
                </ul>
              </aside>
            </div>
          </div>
        </section>

        <section id="pricing">
          <div className="container services-stack">
            <div className="section-heading reveal visible">
              <h2>Pricing</h2>
              <p>Clear starting prices for common services, with the booking fee highlighted so customers know what must be paid to reserve a slot.</p>
            </div>

            <div className="pricing-grid">
              {pricing.length ? pricing.map((item) => (
                <article className="service-card reveal visible" key={item.code}>
                  <div className="service-meta">
                    <span className="service-tag">{item.isBookingFee ? "Booking Fee" : "Service"}</span>
                    <span className="price">{item.priceFormatted}</span>
                  </div>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <a className="service-link" href="#appointment">{item.isBookingFee ? "Pay and reserve" : "Request service"}</a>
                </article>
              )) : (
                <article className="service-card">
                  <div className="service-meta">
                    <span className="service-tag">Loading</span>
                    <span className="price">...</span>
                  </div>
                  <h3>Loading pricing</h3>
                  <p>Fetching service pricing from the server.</p>
                </article>
              )}
            </div>
          </div>
        </section>

        <section id="services">
          <div className="container services-stack">
            <div className="section-heading reveal visible">
              <h2>Services &amp; Coverage</h2>
              <p>Mobile mechanic support focused on diagnostics, repairs, maintenance, and dependable local service.</p>
            </div>

            <div className="promo-card reveal visible">
              <span className="promo-label">Trusted Local Service</span>
              <h3>Built for convenience without sacrificing workmanship</h3>
              <p>From brakes and batteries to no-start situations and commercial support, the goal is simple: fix the issue right and treat customers well.</p>
            </div>

            <div className="services-grid">
              {serviceCards.map((card) => (
                <article className="service-card reveal visible" key={card.code}>
                  <div className="service-meta">
                    <span className="service-tag">{card.tag}</span>
                    <span className="price">{card.priceFormatted}</span>
                  </div>
                  <h3>{card.name}</h3>
                  <p>{card.description}</p>
                  <a className="service-link" href="#appointment">{card.cta}</a>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer>
        Lawson Mobile Mechanic. Mobile repair with clear communication, honest work, and premium service standards.
      </footer>
    </>
  );
}

export default App;
