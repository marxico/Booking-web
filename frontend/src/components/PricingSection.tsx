import type { PricingItem } from "../types/booking";

type PricingSectionProps = {
  pricing: PricingItem[];
};

export function PricingSection({ pricing }: PricingSectionProps) {
  return (
    <section id="pricing">
      <div className="container services-stack">
        <div className="section-heading reveal visible">
          <span className="eyebrow">Starting points</span>
          <h2>Transparent service pricing.</h2>
          <p>Final pricing depends on vehicle, parts, location, and the approved repair plan.</p>
        </div>

        <div className="pricing-grid">
          {pricing.length ? pricing.map((item) => (
            <article className="service-card reveal visible" key={item.code}>
              <div className="service-meta">
                <span className="service-tag">{item.isBookingFee ? "Booking Fee" : "Service"}</span>
                <div className="pricing-display">
                  {item.hasDiscount ? <span className="price price--original">{item.originalPriceFormatted}</span> : null}
                  <span className="price">{item.priceFormatted}</span>
                </div>
              </div>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              {item.hasDiscount ? <span className="pricing-discount-badge">{item.discountLabel || "Special offer"}</span> : null}
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
  );
}
