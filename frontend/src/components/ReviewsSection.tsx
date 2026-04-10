import { reviews } from "../data/business";

export function ReviewsSection() {
  return (
    <section id="reviews">
      <div className="container">
        <div className="section-heading reveal visible">
          <span className="eyebrow">Reviews</span>
          <h2>Memphis drivers want clear answers.</h2>
          <p>That is the standard every visit is built around: be on time, explain the issue, and do the work cleanly.</p>
        </div>
        <div className="reviews-grid">
          {reviews.map((review) => (
            <article className="review-card reveal visible" key={review.author}>
              <div className="stars" aria-label="5 out of 5 stars">5.0 rating</div>
              <p>{review.copy}</p>
              <cite>{review.author}</cite>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
