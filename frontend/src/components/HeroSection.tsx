import { business, serviceHighlights } from "../data/business";
import type { PricingItem } from "../types/booking";

type HeroSectionProps = {
  bookingFee: PricingItem | null;
};

export function HeroSection({ bookingFee }: HeroSectionProps) {
  return (
    <section className="hero" id="home">
      <div className="container hero-panel">
        <div className="hero-copy" style={{ opacity: 1, transform: "none" }}>
          <span className="eyebrow">Same-week mobile mechanic appointments</span>
          <h1>Mobile Mechanic in Memphis</h1>
          <p>
            Brakes, battery replacement, oil changes, diagnostics, and roadside help brought to your driveway, office, or parking lot.
          </p>
          <ul className="hero-services" aria-label="Services">
            {serviceHighlights.map((service) => (
              <li key={service}>{service}</li>
            ))}
          </ul>
          <div className="hero-actions">
            <a className="btn btn-primary" href="#appointment">Book Appointment</a>
            <a className="btn btn-secondary" href={business.phoneHref}>Call Now</a>
          </div>
        </div>

        <div className="hero-photo reveal visible">
          <img
            src="/assets/mechanic-hero.jpg"
            sizes="(max-width: 980px) 100vw, 42vw"
            alt="Mechanic inspecting a vehicle engine"
            width="900"
            height="600"
            fetchPriority="high"
            decoding="async"
          />
          <div className="hero-proof">
            <strong>{bookingFee ? `${bookingFee.priceFormatted} booking required` : "Booking required"}</strong>
            <span>{bookingFee ? `${bookingFee.name} must be paid before the appointment slot is reserved.` : "Secure payment reserves your appointment slot."}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
