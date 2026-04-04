import { loadAppointments, initializeAppointments } from "./appointments.js";
import { initializeAvailability, loadAvailableTimes } from "./availability.js";
import { dateInput } from "./dom.js";
import { initializeBooking } from "./booking.js";
import { initializeNavigation } from "./navigation.js";

const syncBookingData = () => {
  loadAppointments();

  if (dateInput.value) {
    loadAvailableTimes(dateInput.value);
  }
};

initializeNavigation();
initializeAvailability();
initializeAppointments();
initializeBooking();
syncBookingData();
