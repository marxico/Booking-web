import { promotions } from "../data/business";

export function PromotionsSection() {
  return (
    <section id="promotions">
      <div className="container">
        <div className="section-heading reveal visible">
          <span className="eyebrow">Promotions</span>
          <h2>Current Memphis offers.</h2>
          <p>Simple savings for new customers and drivers booking maintenance before a bigger problem starts.</p>
        </div>
        <div className="promo-grid">
          {promotions.map((promotion) => (
            <article className="promo-card reveal visible" key={promotion.title}>
              <span className="promo-label">{promotion.label}</span>
              <h3>{promotion.title}</h3>
              <p>{promotion.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
