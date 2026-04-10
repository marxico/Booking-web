import { business, serviceHighlights } from "../data/business";

export function SiteFooter() {
  return (
    <>
      <footer className="site-footer">
        <div className="site-footer__inner">
          <div className="site-footer__brand">
            <img src={business.logo} alt={`${business.name} logo`} />
            <div>
              <strong>{business.name}</strong>
              <p>Memphis mobile auto repair with clear communication and clean workmanship.</p>
            </div>
          </div>
          <nav className="site-footer__nav" aria-label="Footer navigation">
            <h3>Site</h3>
            <a href="#services">Services</a>
            <a href="#appointment">Book Appointment</a>
            <a href="#pricing">Pricing</a>
            <a href="#area">Service Area</a>
          </nav>
          <div className="site-footer__nav">
            <h3>Services</h3>
            {serviceHighlights.map((service) => (
              <span key={service}>{service}</span>
            ))}
          </div>
          <div className="site-footer__nav">
            <h3>Contact</h3>
            <a href={business.phoneHref}>{business.phone}</a>
            <a href={business.emailHref}>{business.email}</a>
            <span>{business.location}</span>
            <span>Mon-Fri 8 AM-7 PM</span>
            <span>Sat 9 AM-5 PM</span>
          </div>
        </div>
        <div className="site-footer__bottom">
          <span>{business.name}</span>
          <span>{business.location}</span>
        </div>
      </footer>
      <a className="mobile-call" href={business.phoneHref} aria-label={`Call ${business.name}`}>Call Now: {business.phone}</a>
    </>
  );
}
