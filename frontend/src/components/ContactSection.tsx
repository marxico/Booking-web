import { business } from "../data/business";

export function ContactSection() {
  return (
    <section id="contact">
      <div className="container final-cta reveal visible">
        <span className="eyebrow">Ready when you are</span>
        <h2>Skip the shop. Keep your day moving.</h2>
        <p>Book a mobile mechanic visit in Memphis and get clear answers before repairs begin.</p>
        <div className="hero-actions final-cta__actions">
          <a className="btn btn-primary" href="#appointment">Book Appointment</a>
          <a className="btn btn-secondary" href={business.phoneHref}>Call Now</a>
        </div>
      </div>
    </section>
  );
}
