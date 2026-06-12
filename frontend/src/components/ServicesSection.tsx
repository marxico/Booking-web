import { services } from "../data/business";

export function ServicesSection() {
  return (
    <section id="services">
      <div className="container split">
        <div className="section-copy reveal visible is-visible">
          <span className="eyebrow">Services</span>
          <h2>Real repairs without the waiting room.</h2>
          <p>Clear diagnosis, clean work, and practical recommendations for Memphis drivers who need their car back on schedule.</p>
          <img className="section-image owner-photo" src="/assets/boss.jpeg" alt="Lawson Mobile Mechanic owner standing between two vehicles" width="768" height="1024" loading="lazy" decoding="async" />
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
