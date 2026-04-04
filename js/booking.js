import { dateInput, form, successMessage } from "./dom.js";
import { loadAppointments } from "./appointments.js";
import { loadAvailableTimes, setTimeOptions } from "./availability.js";

const today = new Date().toISOString().split("T")[0];

const showMessage = (message) => {
  successMessage.textContent = message;
  successMessage.classList.add("visible");

  window.setTimeout(() => {
    successMessage.classList.remove("visible");
  }, 5000);
};

export const initializeBooking = () => {
  dateInput.min = today;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = formData.get("name");
    const email = formData.get("email");
    const date = formData.get("date");
    const time = formData.get("time");

    try {
      const response = await fetch("/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, email, date, time })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not create appointment.");
      }

      showMessage(result.message);
      form.reset();
      dateInput.min = today;
      setTimeOptions([], "Select a date first");
      loadAppointments();
      if (dateInput.value) {
        loadAvailableTimes(dateInput.value);
      }
    } catch (error) {
      showMessage(error.message || "Error connecting to the server.");
    }
  });
};
