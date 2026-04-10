import type { ChangeEvent, FormEvent, RefObject } from "react";

import { expectations } from "../data/business";
import type { BookingFormData, BookingMessage, MockCardFormData, MockCardPreset, SquareConfig } from "../types/booking";

type AppointmentSectionProps = {
  today: string;
  formData: BookingFormData;
  mockCard: MockCardFormData;
  message: BookingMessage;
  availableTimes: string[];
  timePlaceholder: string;
  squareConfig: SquareConfig | null;
  paymentStatusText: string;
  isSubmitting: boolean;
  submitLabel: string;
  cardContainerRef: RefObject<HTMLDivElement>;
  onFormChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onMockCardChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onApplyMockCard: (card: MockCardPreset) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function AppointmentSection({
  today,
  formData,
  mockCard,
  message,
  availableTimes,
  timePlaceholder,
  squareConfig,
  paymentStatusText,
  isSubmitting,
  submitLabel,
  cardContainerRef,
  onFormChange,
  onMockCardChange,
  onApplyMockCard,
  onSubmit
}: AppointmentSectionProps) {
  const squareUnavailable = squareConfig?.paymentMode === "square" && squareConfig?.paymentRequired && !squareConfig?.enabled;

  return (
    <section id="appointment">
      <div className="container">
        <div className="section-heading reveal visible">
          <span className="eyebrow">Appointment</span>
          <h2>Book a mobile service visit.</h2>
          <p>Send the basics, choose a time, and reserve your appointment online. We will confirm vehicle details before arrival.</p>
        </div>

        <div className="appointment-layout reveal visible">
          <div className="form-card">
            <form id="appointmentForm" onSubmit={onSubmit}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="name">Name</label>
                  <input id="name" name="name" type="text" placeholder="Your name" autoComplete="name" required value={formData.name} onChange={onFormChange} />
                </div>
                <div className="field">
                  <label htmlFor="phone">Phone</label>
                  <input id="phone" name="phone" type="tel" placeholder="(901) 555-0123" autoComplete="tel" required value={formData.phone} onChange={onFormChange} />
                </div>
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input id="email" name="email" type="email" placeholder="name@example.com" required value={formData.email} onChange={onFormChange} />
                </div>
                <div className="field">
                  <label htmlFor="date">Date</label>
                  <input id="date" name="date" type="date" min={today} required value={formData.date} onChange={onFormChange} />
                </div>
                <div className="field">
                  <label htmlFor="time">Time</label>
                  <select id="time" name="time" required value={formData.time} onChange={onFormChange} disabled={!availableTimes.length}>
                    <option value="" disabled>{timePlaceholder}</option>
                    {availableTimes.map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>

              <section className={`payment-panel ${squareUnavailable ? "payment-panel--inactive" : ""}`} aria-live="polite">
                <div className="payment-panel__header">
                  <div>
                    <p className="payment-panel__eyebrow">{squareConfig?.paymentProviderLabel || "Payment"}</p>
                    <h3>
                      {squareConfig?.paymentMode === "mock"
                        ? `Simulate ${squareConfig.serviceCallOutFeeFormatted} payment`
                        : squareConfig?.enabled
                          ? `Pay ${squareConfig.serviceCallOutFeeFormatted} to reserve`
                          : squareConfig?.paymentRequired
                            ? "Payment required before booking"
                            : "Square payment not configured"}
                    </h3>
                  </div>
                  <span className="payment-badge">{squareConfig?.serviceCallOutFeeFormatted || "$0.00"}</span>
                </div>
                <p className="payment-panel__copy">
                  {squareConfig?.paymentMode === "mock"
                    ? "This is a safe test mode. The booking flow records a simulated successful payment so you can validate the full experience before enabling real Square charges."
                    : squareConfig?.enabled
                      ? `Your appointment request is submitted only after Square approves the ${squareConfig.serviceCallOutFeeName.toLowerCase()}.`
                      : squareConfig?.paymentRequired
                        ? "This business requires payment before a slot is reserved. Add valid Square credentials on the server to reopen online booking."
                        : "Add Square credentials on the server to switch this form from request-only mode into paid booking mode."}
                </p>
                {squareConfig?.paymentMode === "square" ? (
                  <div className="square-card" ref={cardContainerRef} />
                ) : (
                  <div className="square-card square-card--mock">
                    {squareConfig?.mockCards?.length ? (
                      <div className="mock-card-presets">
                        {squareConfig.mockCards.map((card) => (
                          <button key={card.number} className="mock-card-preset" type="button" onClick={() => onApplyMockCard(card)}>
                            <strong>{card.label}</strong>
                            <span>{card.description}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <div className="mock-card-grid">
                      <div className="field">
                        <label htmlFor="mockCardholder">Cardholder Name</label>
                        <input id="mockCardholder" name="cardholder" type="text" required value={mockCard.cardholder} onChange={onMockCardChange} />
                      </div>
                      <div className="field field--full">
                        <label htmlFor="mockCardNumber">Test Card Number</label>
                        <input id="mockCardNumber" name="number" type="text" inputMode="numeric" autoComplete="cc-number" placeholder="4111 1111 1111 1111" required value={mockCard.number} onChange={onMockCardChange} />
                      </div>
                      <div className="field">
                        <label htmlFor="mockCardExpiry">Expiry</label>
                        <input id="mockCardExpiry" name="expiry" type="text" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" required value={mockCard.expiry} onChange={onMockCardChange} />
                      </div>
                      <div className="field">
                        <label htmlFor="mockCardCvv">CVV</label>
                        <input id="mockCardCvv" name="cvv" type="text" inputMode="numeric" autoComplete="cc-csc" placeholder="123" required value={mockCard.cvv} onChange={onMockCardChange} />
                      </div>
                    </div>
                  </div>
                )}
                <p className="payment-status">{paymentStatusText}</p>
              </section>

              <div className="form-footer">
                <button className="btn btn-primary" type="submit" disabled={isSubmitting || squareUnavailable}>
                  {submitLabel}
                </button>
                <div className="success-message visible" data-state={message.type} style={{ opacity: message.text ? 1 : 0, transform: "none" }}>
                  {message.text}
                </div>
              </div>
            </form>
          </div>

          <aside className="info-card">
            <span className="info-card__eyebrow">What to expect</span>
            <h3>Mobile service that feels organized from the first tap.</h3>
            <ul className="info-list">
              {expectations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </section>
  );
}
