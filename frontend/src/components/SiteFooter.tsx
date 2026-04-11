import { business, serviceHighlights } from "../data/business";

export function SiteFooter() {
  return (
    <>
      <footer className="site-footer">
        <div className="site-footer__frame">
          <div className="site-footer__hero">
            <div className="site-footer__brand">
              <img src={business.logo} alt={`${business.name} logo`} />
              <div>
                <span className="site-footer__eyebrow">Memphis on-site auto repair</span>
                <strong>{business.name}</strong>
                <p>Mobile mechanic service with cleaner communication, better scheduling, and repairs that meet you where you are.</p>
              </div>
            </div>
            <div className="site-footer__cta">
              <a className="site-footer__cta-primary" href="#appointment">Book Appointment</a>
              <a className="site-footer__cta-secondary" href={business.phoneHref}>Call {business.phone}</a>
            </div>
          </div>

          <div className="site-footer__inner">
            <nav className="site-footer__nav" aria-label="Footer navigation">
              <h3>Navigate</h3>
              <a href="#services">Services</a>
              <a href="#appointment">Book Appointment</a>
              <a href="#pricing">Pricing</a>
              <a href="#reviews">Reviews</a>
              <a href="#area">Service Area</a>
            </nav>
            <div className="site-footer__nav">
              <h3>Most Requested</h3>
              {serviceHighlights.map((service) => (
                <span key={service}>{service}</span>
              ))}
            </div>
            <div className="site-footer__nav">
              <h3>Contact</h3>
              <a href={business.phoneHref}>{business.phone}</a>
              <a href={business.emailHref}>{business.email}</a>
              <span>{business.location}</span>
            </div>
            <div className="site-footer__nav site-footer__nav--meta">
              <h3>Hours</h3>
              <span>Mon-Fri 8 AM-7 PM</span>
              <span>Sat 9 AM-5 PM</span>
              <span>Private bookings confirmed by phone or text.</span>
            </div>
          </div>

          <div className="site-footer__bottom">
            <span>{business.name}</span>
            <span>{business.location}</span>
            <a href="#home">Back to top</a>
          </div>
        </div>
      </footer>
      <a className="mobile-call" href={business.phoneHref} aria-label={`Call ${business.name}`}>Call Now: {business.phone}</a>
    </>
  );
}
