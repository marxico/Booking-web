import { loadAppointments, initializeAppointments } from "./appointments.js";
import { initializeAvailability, loadAvailableTimes } from "./availability.js";
import { installClientLogging, logClientInfo } from "./client-logger.js";
import { dateInput } from "./dom.js";
import { initializeBooking } from "./booking.js";
import { initializeNavigation } from "./navigation.js";
import { loadPricing } from "./pricing.js";

const syncBookingData = () => {
  loadAppointments();

  if (dateInput.value) {
    loadAvailableTimes(dateInput.value);
  }
};

installClientLogging("public-booking");
logClientInfo("public-app-init");
initializeNavigation();
initializeAvailability();
initializeAppointments();
initializeBooking();
loadPricing();
syncBookingData();
