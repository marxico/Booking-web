import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import { AppointmentSection } from "./components/AppointmentSection";
import { ContactSection } from "./components/ContactSection";
import { HeroSection } from "./components/HeroSection";
import { PricingSection } from "./components/PricingSection";
import { PromotionsSection } from "./components/PromotionsSection";
import { ReviewsSection } from "./components/ReviewsSection";
import { ServiceAreaSection } from "./components/ServiceAreaSection";
import { ServicesSection } from "./components/ServicesSection";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { useActiveSection } from "./hooks/useActiveSection";
import { useSquarePayment } from "./hooks/useSquarePayment";
import { loadAvailableTimes, loadBookingSetup, submitBooking } from "./services/bookingApi";
import { formatMockCardCvv, formatMockCardExpiry, formatMockCardNumber } from "./services/mockCardFormatting";
import type { BookingFormData, BookingMessage, MockCardFormData, MockCardPreset, PricingItem, SquareConfig } from "./types/booking";

const today = new Date().toISOString().split("T")[0];

const emptyFormData: BookingFormData = {
  name: "",
  phone: "",
  email: "",
  date: "",
  time: ""
};

const defaultMockCard: MockCardFormData = {
  cardholder: "Test Customer",
  number: "4111 1111 1111 1111",
  expiry: "12/34",
  cvv: "123"
};

function App() {
  const [pricing, setPricing] = useState<PricingItem[]>([]);
  const [squareConfig, setSquareConfig] = useState<SquareConfig | null>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [timePlaceholder, setTimePlaceholder] = useState("Select a date first");
  const [formData, setFormData] = useState<BookingFormData>(emptyFormData);
  const [mockCard, setMockCard] = useState<MockCardFormData>(defaultMockCard);
  const [message, setMessage] = useState<BookingMessage>({ text: "", type: "success" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const activeSection = useActiveSection();
  const { cardContainerRef, paymentStatusText, tokenizeCard } = useSquarePayment(squareConfig);

  const bookingFee = useMemo(
    () => pricing.find((item) => item.isBookingFee) || null,
    [pricing]
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        const setup = await loadBookingSetup();
        setPricing(setup.pricing);
        setSquareConfig(setup.squareConfig);
      } catch (error) {
        setMessage({ text: error.message || "Could not initialize the booking page.", type: "error" });
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!formData.date) {
      setAvailableTimes([]);
      setTimePlaceholder("Select a date first");
      return;
    }

    const loadTimes = async () => {
      try {
        const times = await loadAvailableTimes(formData.date);
        setAvailableTimes(times);
        setTimePlaceholder(times.length ? "Select a time" : "No times available");
      } catch (error) {
        setAvailableTimes([]);
        setTimePlaceholder("Could not load times");
      }
    };

    loadTimes();
  }, [formData.date]);

  const handleFormChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
      ...(name === "date" ? { time: "" } : {})
    }));
  };

  const handleMockCardChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const formattedValue = name === "number"
      ? formatMockCardNumber(value)
      : name === "expiry"
        ? formatMockCardExpiry(value)
        : name === "cvv"
          ? formatMockCardCvv(value)
          : value;

    setMockCard((current) => ({
      ...current,
      [name]: formattedValue
    }));
  };

  const applyMockCard = (card: MockCardPreset) => {
    setMockCard({
      cardholder: "Test Customer",
      number: formatMockCardNumber(card.number),
      expiry: card.expiry,
      cvv: card.cvv
    });
    setMessage({
      text: `${card.label} loaded. ${card.description}`,
      type: card.result === "approved" ? "success" : "error"
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      if (squareConfig?.paymentMode === "square" && squareConfig?.paymentRequired && !squareConfig?.enabled) {
        throw new Error("Online booking is disabled until Square is configured.");
      }

      const sourceId = squareConfig?.paymentMode === "square" && squareConfig?.enabled
        ? await tokenizeCard()
        : undefined;

      const result = await submitBooking({
        formData,
        sourceId,
        mockCard: squareConfig?.paymentMode === "mock" ? mockCard : undefined
      });

      setMessage({ text: result.message, type: "success" });
      setFormData(emptyFormData);
      setMockCard(defaultMockCard);
      setAvailableTimes([]);
      setTimePlaceholder("Select a date first");
    } catch (error) {
      setMessage({ text: error.message || "Error connecting to the server.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitLabel = isSubmitting
    ? squareConfig?.paymentMode === "square" && squareConfig?.enabled
      ? "Processing payment..."
      : squareConfig?.paymentMode === "mock"
        ? "Approving test payment..."
        : "Requesting appointment..."
    : squareConfig?.paymentMode === "square" && squareConfig?.paymentRequired && !squareConfig?.enabled
      ? "Booking unavailable"
      : squareConfig?.serviceCallOutFeeFormatted
        ? `${squareConfig?.paymentMode === "mock" ? "Simulate" : "Pay"} ${squareConfig.serviceCallOutFeeFormatted} & Request Appointment`
        : "Request Appointment";

  return (
    <>
      <SiteHeader activeSection={activeSection} />
      <main>
        <HeroSection bookingFee={bookingFee} />
        <ServicesSection />
        <AppointmentSection
          today={today}
          formData={formData}
          mockCard={mockCard}
          message={message}
          availableTimes={availableTimes}
          timePlaceholder={timePlaceholder}
          squareConfig={squareConfig}
          paymentStatusText={paymentStatusText}
          isSubmitting={isSubmitting}
          submitLabel={submitLabel}
          cardContainerRef={cardContainerRef}
          onFormChange={handleFormChange}
          onMockCardChange={handleMockCardChange}
          onApplyMockCard={applyMockCard}
          onSubmit={handleSubmit}
        />
        <PromotionsSection />
        <ReviewsSection />
        <ServiceAreaSection />
        <PricingSection pricing={pricing} />
        <ContactSection />
      </main>
      <SiteFooter />
    </>
  );
}

export default App;
