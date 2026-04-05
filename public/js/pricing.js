import {
  heroBookingFeeDescription,
  heroBookingFeeTitle,
  paymentAmountBadge,
  pricingList
} from "./dom.js";

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const renderPricing = (items) => {
  if (!items.length) {
    pricingList.innerHTML = `
      <article class="service-card">
        <div class="service-meta">
          <span class="service-tag">Unavailable</span>
          <span class="price">-</span>
        </div>
        <h3>No pricing available</h3>
        <p>Pricing has not been configured yet.</p>
      </article>
    `;
    return;
  }

  pricingList.innerHTML = items.map((item) => `
    <article class="service-card reveal visible">
      <div class="service-meta">
        <span class="service-tag">${item.isBookingFee ? "Booking Fee" : "Service"}</span>
        <span class="price">${escapeHtml(item.priceFormatted)}</span>
      </div>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.description)}</p>
      <a class="service-link" href="#appointment">${item.isBookingFee ? "Pay and reserve" : "Request service"}</a>
    </article>
  `).join("");
};

const syncServiceCards = (items) => {
  items.forEach((item) => {
    const priceNode = document.querySelector(`[data-service-price="${item.code}"]`);
    const nameNode = document.querySelector(`[data-service-name="${item.code}"]`);
    const descriptionNode = document.querySelector(`[data-service-description="${item.code}"]`);
    const linkNode = document.querySelector(`[data-service-link="${item.code}"]`);

    if (priceNode) {
      priceNode.textContent = item.priceFormatted;
    }

    if (nameNode) {
      nameNode.textContent = item.name;
    }

    if (descriptionNode) {
      descriptionNode.textContent = item.description;
    }

    if (linkNode) {
      linkNode.textContent = item.isBookingFee ? "Pay and reserve" : "Request service";
    }
  });
};

const syncBookingFeeHighlights = (items) => {
  const bookingFee = items.find((item) => item.isBookingFee);

  if (!bookingFee) {
    return;
  }

  if (paymentAmountBadge) {
    paymentAmountBadge.textContent = bookingFee.priceFormatted;
  }

  if (heroBookingFeeTitle) {
    heroBookingFeeTitle.textContent = `${bookingFee.priceFormatted} booking required`;
  }

  if (heroBookingFeeDescription) {
    heroBookingFeeDescription.textContent = `${bookingFee.name} must be paid before the appointment slot is reserved.`;
  }
};

export const loadPricing = async () => {
  try {
    const response = await fetch("/pricing");
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Could not load pricing.");
    }

    const pricingItems = result.pricing || [];
    renderPricing(pricingItems);
    syncServiceCards(pricingItems);
    syncBookingFeeHighlights(pricingItems);
  } catch (error) {
    pricingList.innerHTML = `
      <article class="service-card">
        <div class="service-meta">
          <span class="service-tag">Error</span>
          <span class="price">-</span>
        </div>
        <h3>Could not load pricing</h3>
        <p>${escapeHtml(error.message || "Please try again later.")}</p>
      </article>
    `;
  }
};
