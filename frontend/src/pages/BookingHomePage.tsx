import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import { AppointmentSection } from "../components/AppointmentSection";
import { ContactSection } from "../components/ContactSection";
import { HeroSection } from "../components/HeroSection";
import { PricingSection } from "../components/PricingSection";
import { PromotionsSection } from "../components/PromotionsSection";
import { ReviewsSection } from "../components/ReviewsSection";
import { ServiceAreaSection } from "../components/ServiceAreaSection";
import { ServicesSection } from "../components/ServicesSection";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { useActiveSection } from "../hooks/useActiveSection";
import { useSquarePayment } from "../hooks/useSquarePayment";
import { loadAvailableTimes, loadBookingSetup, loadPricingVersion, submitBooking } from "../services/bookingApi";
import { sendClientLog } from "../services/clientLogger";
import { formatMockCardCvv, formatMockCardExpiry, formatMockCardNumber } from "../services/mockCardFormatting";
import {
  getBookingFieldError,
  getBookingFormErrors,
  getMockCardFieldError,
  getMockCardFieldErrors,
  sanitizePhoneInput,
  validateBookingFormData,
  validateMockCardFormData
} from "../services/validation";
import type {
  BookingFieldErrors,
  BookingFormData,
  BookingMessage,
  MockCardFieldErrors,
  MockCardFormData,
  MockCardPreset,
  PricingItem,
  SquareConfig
} from "../types/booking";

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

export function BookingHomePage() {
  const [pricing, setPricing] = useState<PricingItem[]>([]);
  const [squareConfig, setSquareConfig] = useState<SquareConfig | null>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [timePlaceholder, setTimePlaceholder] = useState("Select a date first");
  const [formData, setFormData] = useState<BookingFormData>(emptyFormData);
  const [mockCard, setMockCard] = useState<MockCardFormData>(defaultMockCard);
  const [fieldErrors, setFieldErrors] = useState<BookingFieldErrors>({});
  const [mockCardErrors, setMockCardErrors] = useState<MockCardFieldErrors>({});
  const [message, setMessage] = useState<BookingMessage>({ text: "", type: "success" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pricingVersionRef = useRef("");
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
        pricingVersionRef.current = await loadPricingVersion();
        sendClientLog("info", {
          source: "frontend-react",
          event: "booking-setup-loaded",
          message: `paymentMode=${setup.squareConfig?.paymentMode || "unknown"}`
        });
      } catch (error) {
        sendClientLog("error", {
          source: "frontend-react",
          event: "booking-setup-failed",
          message: error instanceof Error ? error.message : "Could not initialize the booking page."
        });
        setMessage({ text: error instanceof Error ? error.message : "Could not initialize the booking page.", type: "error" });
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(async () => {
      try {
        const nextVersion = await loadPricingVersion();

        if (!nextVersion || nextVersion === pricingVersionRef.current) {
          return;
        }

        const setup = await loadBookingSetup();
        pricingVersionRef.current = nextVersion;
        setPricing(setup.pricing);
        setSquareConfig(setup.squareConfig);
        sendClientLog("info", {
          source: "frontend-react",
          event: "pricing-auto-refreshed",
          message: `${setup.pricing.length} services`
        });
      } catch (error) {
        sendClientLog("warn", {
          source: "frontend-react",
          event: "pricing-auto-refresh-failed",
          message: error instanceof Error ? error.message : "Could not refresh pricing."
        });
      }
    }, 8000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!message.text) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setMessage((current) => current.text ? { ...current, text: "" } : current);
    }, 4200);

    return () => window.clearTimeout(timeoutId);
  }, [message]);

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
    const normalizedValue = name === "phone" ? sanitizePhoneInput(value) : value;
    const nextFormData = {
      ...formData,
      [name]: normalizedValue,
      ...(name === "date" ? { time: "" } : {})
    };

    setFormData(nextFormData);
    setFieldErrors((current) => {
      const nextErrors = { ...current };
      const error = getBookingFieldError(name as keyof BookingFormData, nextFormData);

      if (error) {
        nextErrors[name as keyof BookingFormData] = error;
      } else {
        delete nextErrors[name as keyof BookingFormData];
      }

      if (name === "date") {
        delete nextErrors.time;
      }

      return nextErrors;
    });
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
    const nextMockCard = {
      ...mockCard,
      [name]: formattedValue
    };

    setMockCard(nextMockCard);
    setMockCardErrors((current) => {
      const nextErrors = { ...current };
      const error = getMockCardFieldError(name as keyof MockCardFormData, nextMockCard);

      if (error) {
        nextErrors[name as keyof MockCardFormData] = error;
      } else {
        delete nextErrors[name as keyof MockCardFormData];
      }

      return nextErrors;
    });
  };

  const applyMockCard = (card: MockCardPreset) => {
    setMockCard({
      cardholder: "Test Customer",
      number: formatMockCardNumber(card.number),
      expiry: card.expiry,
      cvv: card.cvv
    });
    setMockCardErrors({});
    setMessage({
      text: `${card.label} loaded. ${card.description}`,
      type: card.result === "approved" ? "success" : "error"
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      sendClientLog("info", {
        source: "frontend-react",
        event: "booking-submit-start",
        message: `${formData.date} ${formData.time}`
      });

      const nextFieldErrors = getBookingFormErrors(formData);
      const nextMockCardErrors = squareConfig?.paymentMode === "mock" ? getMockCardFieldErrors(mockCard) : {};

      setFieldErrors(nextFieldErrors);
      setMockCardErrors(nextMockCardErrors);

      if (Object.keys(nextFieldErrors).length || Object.keys(nextMockCardErrors).length) {
        setMessage({ text: "", type: "error" });
        return;
      }

      validateBookingFormData(formData);

      if (squareConfig?.paymentMode === "mock") {
        validateMockCardFormData(mockCard);
      }

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

      sendClientLog("info", {
        source: "frontend-react",
        event: "booking-submit-success",
        message: result.message
      });
      setMessage({ text: result.message, type: "success" });
      setFormData(emptyFormData);
      setMockCard(defaultMockCard);
      setFieldErrors({});
      setMockCardErrors({});
      setAvailableTimes([]);
      setTimePlaceholder("Select a date first");
    } catch (error) {
      sendClientLog("error", {
        source: "frontend-react",
        event: "booking-submit-failed",
        message: error instanceof Error ? error.message : "Error connecting to the server."
      });
      setMessage({ text: error instanceof Error ? error.message : "Error connecting to the server.", type: "error" });
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
          fieldErrors={fieldErrors}
          mockCard={mockCard}
          mockCardErrors={mockCardErrors}
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
