import { useEffect, useRef, useState } from "react";

import type { SquareConfig } from "../types/booking";

type SquareCard = {
  attach: (element: HTMLElement) => Promise<void>;
  tokenize: () => Promise<{ status: string; token?: string }>;
};

const loadSquareScript = (environment: string) => new Promise<void>((resolve, reject) => {
  const scriptUrl = environment === "production"
    ? "https://web.squarecdn.com/v1/square.js"
    : "https://sandbox.web.squarecdn.com/v1/square.js";
  const existingScript = document.querySelector(`script[data-square-sdk="${scriptUrl}"]`);

  if (existingScript) {
    if (window.Square) {
      resolve();
      return;
    }

    existingScript.addEventListener("load", () => resolve(), { once: true });
    existingScript.addEventListener("error", () => reject(new Error("Could not load the Square Web Payments SDK.")), { once: true });
    return;
  }

  const script = document.createElement("script");
  script.src = scriptUrl;
  script.async = true;
  script.dataset.squareSdk = scriptUrl;
  script.addEventListener("load", () => resolve(), { once: true });
  script.addEventListener("error", () => reject(new Error("Could not load the Square Web Payments SDK.")), { once: true });
  document.head.appendChild(script);
});

export const useSquarePayment = (squareConfig: SquareConfig | null) => {
  const cardContainerRef = useRef<HTMLDivElement | null>(null);
  const squareCardRef = useRef<SquareCard | null>(null);
  const squareSetupPromiseRef = useRef<Promise<void> | null>(null);
  const [paymentStatusText, setPaymentStatusText] = useState("Loading Square payment setup...");

  useEffect(() => {
    if (!squareConfig) {
      return;
    }

    if (squareConfig.paymentMode === "mock") {
      setPaymentStatusText("Test payment mode is active. Bookings will be approved with a simulated payment.");
      return;
    }

    if (squareConfig.enabled) {
      setPaymentStatusText("Loading secure card entry...");
      return;
    }

    if (squareConfig.paymentRequired) {
      setPaymentStatusText("Square is not configured yet. Booking is currently disabled until payment credentials are added.");
      return;
    }

    setPaymentStatusText("Square is not configured yet. Booking requests will still be saved without charging a card.");
  }, [squareConfig]);

  useEffect(() => {
    if (squareConfig?.paymentMode !== "square" || !squareConfig?.enabled || !cardContainerRef.current || squareCardRef.current) {
      return;
    }

    if (!squareSetupPromiseRef.current) {
      squareSetupPromiseRef.current = (async () => {
        await loadSquareScript(squareConfig.environment);

        if (!window.Square) {
          throw new Error("Square loaded incorrectly. Refresh the page and try again.");
        }

        const payments = window.Square.payments(squareConfig.appId, squareConfig.locationId);
        const card = await payments.card();
        await card.attach(cardContainerRef.current);
        squareCardRef.current = card;
        setPaymentStatusText("Card entry is ready. Your card is tokenized securely by Square.");
      })().catch((error) => {
        setPaymentStatusText(error.message || "Could not initialize Square card entry.");
      });
    }
  }, [squareConfig]);

  const tokenizeCard = async () => {
    await squareSetupPromiseRef.current;

    const card = squareCardRef.current;

    if (!card) {
      throw new Error("Square card entry is not ready yet.");
    }

    const tokenResult = await card.tokenize();

    if (tokenResult.status !== "OK") {
      throw new Error("Square could not tokenize the card. Please double-check the payment details.");
    }

    return tokenResult.token;
  };

  return {
    cardContainerRef,
    paymentStatusText,
    tokenizeCard
  };
};
