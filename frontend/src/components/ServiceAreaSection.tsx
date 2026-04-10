import { serviceAreas } from "../data/business";

export function ServiceAreaSection() {
  return (
    <section id="area">
      <div className="container split">
        <div className="section-copy reveal visible">
          <span className="eyebrow">Service Area</span>
          <h2>Serving Memphis and nearby cities.</h2>
          <p>Mobile mechanic appointments are available across the Mid-South. Not sure if you are in range? Call and we will check the route.</p>
          <ul className="area-list">
            {serviceAreas.map((area) => (
              <li key={area}>{area}</li>
            ))}
          </ul>
        </div>
        <img className="section-image reveal visible" src="/assets/service-vehicle.jpg" alt="A service vehicle parked on a city street" width="900" height="600" loading="lazy" decoding="async" />
      </div>
    </section>
  );
}
