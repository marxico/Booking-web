import { dateInput, timeSelect } from "./dom.js";

const defaultPlaceholder = "Select a date first";

export const setTimeOptions = (times, placeholder = defaultPlaceholder) => {
  const options = [`<option value="" selected disabled>${placeholder}</option>`];

  times.forEach((time) => {
    options.push(`<option value="${time}">${time}</option>`);
  });

  timeSelect.innerHTML = options.join("");
  timeSelect.disabled = times.length === 0;
};

export const loadAvailableTimes = async (selectedDate = dateInput.value) => {
  if (!selectedDate) {
    setTimeOptions([], defaultPlaceholder);
    return;
  }

  try {
    const response = await fetch(`/available?date=${encodeURIComponent(selectedDate)}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Could not load available times.");
    }

    if (!result.availableTimes.length) {
      setTimeOptions([], "No times available");
      return;
    }

    setTimeOptions(result.availableTimes, "Select a time");
  } catch (error) {
    setTimeOptions([], "Could not load times");
  }
};

export const initializeAvailability = () => {
  dateInput.addEventListener("change", () => {
    loadAvailableTimes(dateInput.value);
  });

  setTimeOptions([], defaultPlaceholder);
};
