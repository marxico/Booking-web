import {
  dateInput,
  form,
  paymentAmountBadge,
  paymentDescription,
  paymentPanel,
  paymentStatus,
  paymentTitle,
  squareCard,
  submitButton,
  successMessage
} from "./dom.js";
import { loadAppointments } from "./appointments.js";
import { loadAvailableTimes, setTimeOptions } from "./availability.js";

const today = new Date().toISOString().split("T")[0];
const squareScriptUrls = {
  production: "https://web.squarecdn.com/v1/square.js",
  sandbox: "https://sandbox.web.squarecdn.com/v1/square.js"
};
let squareConfig = null;
let squareCardInstance = null;
let squareInitializationPromise = null;

const showMessage = (message, type = "success") => {
  successMessage.textContent = message;
  successMessage.dataset.state = type;
  successMessage.classList.add("visible");

  window.setTimeout(() => {
    successMessage.classList.remove("visible");
  }, 5000);
};

const setSubmitState = (isLoading, loadingLabel) => {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? loadingLabel : squareConfig?.enabled
    ? `Pay ${squareConfig.serviceCallOutFeeFormatted} & Request Appointment`
    : "Request Appointment";
};

const loadSquareScript = (environment) => new Promise((resolve, reject) => {
  const scriptUrl = squareScriptUrls[environment] || squareScriptUrls.sandbox;
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
  document.head.append(script);
});

const initializeSquareCard = async () => {
  if (!squareConfig?.enabled) {
    paymentPanel.classList.add("payment-panel--inactive");
    paymentStatus.textContent = squareConfig?.paymentRequired
      ? "Square is not configured yet. Booking is currently disabled until payment credentials are added."
      : "Square is not configured yet. Booking requests will still be saved without charging a card.";
    return;
  }

  if (squareCardInstance) {
    return;
  }

  if (!squareInitializationPromise) {
    squareInitializationPromise = (async () => {
      await loadSquareScript(squareConfig.environment);

      if (!window.Square) {
        throw new Error("Square loaded incorrectly. Refresh the page and try again.");
      }

      const payments = window.Square.payments(squareConfig.appId, squareConfig.locationId);
      squareCardInstance = await payments.card();
      await squareCardInstance.attach("#squareCard");
      paymentPanel.classList.remove("payment-panel--inactive");
      paymentStatus.textContent = "Card entry is ready. Your card is tokenized securely by Square.";
    })();
  }

  return squareInitializationPromise;
};

const loadSquareConfig = async () => {
  const response = await fetch("/square/config");
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Could not load Square payment settings.");
  }

  squareConfig = result;
  paymentAmountBadge.textContent = result.serviceCallOutFeeFormatted;

  if (result.enabled) {
    paymentTitle.textContent = `Pay ${result.serviceCallOutFeeFormatted} to reserve`;
    paymentDescription.textContent = `Your appointment request is submitted only after Square approves the ${result.serviceCallOutFeeName.toLowerCase()}.`;
    await initializeSquareCard();
    return;
  }

  paymentTitle.textContent = result.paymentRequired ? "Payment required before booking" : "Square payment not configured";
  paymentDescription.textContent = result.paymentRequired
    ? "This business requires payment before a slot is reserved. Add valid Square credentials on the server to reopen online booking."
    : "Add Square credentials on the server to switch this form from request-only mode into paid booking mode.";
  await initializeSquareCard();
};

export const initializeBooking = () => {
  dateInput.min = today;
  setSubmitState(true, "Loading payment...");

  loadSquareConfig().catch((error) => {
    paymentPanel.classList.add("payment-panel--inactive");
    paymentStatus.textContent = error.message || "Could not initialize Square.";
    showMessage(paymentStatus.textContent, "error");
  }).finally(() => {
    setSubmitState(false);

    if (squareConfig?.paymentRequired && !squareConfig?.enabled) {
      submitButton.disabled = true;
      submitButton.textContent = "Booking unavailable";
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = formData.get("name");
    const phone = formData.get("phone");
    const email = formData.get("email");
    const date = formData.get("date");
    const time = formData.get("time");

    try {
      setSubmitState(true, squareConfig?.enabled ? "Processing payment..." : "Requesting appointment...");
      let sourceId;

      if (squareConfig?.paymentRequired && !squareConfig?.enabled) {
        throw new Error("Online booking is disabled until Square is configured.");
      }

      if (squareConfig?.enabled) {
        await initializeSquareCard();

        const tokenResult = await squareCardInstance.tokenize();

        if (tokenResult.status !== "OK") {
          throw new Error("Square could not tokenize the card. Please double-check the payment details.");
        }

        sourceId = tokenResult.token;
      }

      const response = await fetch("/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, phone, email, date, time, sourceId })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not create appointment.");
      }

      showMessage(result.message, "success");
      form.reset();
      dateInput.min = today;
      setTimeOptions([], "Select a date first");
      loadAppointments();
      if (dateInput.value) {
        loadAvailableTimes(dateInput.value);
      }
    } catch (error) {
      showMessage(error.message || "Error connecting to the server.", "error");
    } finally {
      setSubmitState(false);

      if (squareConfig?.paymentRequired && !squareConfig?.enabled) {
        submitButton.disabled = true;
        submitButton.textContent = "Booking unavailable";
      }
    }
  });
};
