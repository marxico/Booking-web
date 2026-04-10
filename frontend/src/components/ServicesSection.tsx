import { services } from "../data/business";

export function ServicesSection() {
  return (
    <section id="services">
      <div className="container split">
        <div className="section-copy reveal visible">
          <span className="eyebrow">Services</span>
          <h2>Real repairs without the waiting room.</h2>
          <p>Clear diagnosis, clean work, and practical recommendations for Memphis drivers who need their car back on schedule.</p>
          <img className="section-image" src="/assets/mechanic-engine.jpg" alt="Mechanic working under the hood of a car" width="900" height="600" loading="lazy" decoding="async" />
        </div>
        <div className="services-list reveal visible">
          {services.map((service) => (
            <article key={service.title}>
              <span>{service.initial}</span>
              <h3>{service.title}</h3>
              <p>{service.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
