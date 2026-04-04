import { loadAppointments, initializeAppointments } from "./appointments.js";
import { initializeAvailability } from "./availability.js";
import { initializeBooking } from "./booking.js";
import { initializeNavigation } from "./navigation.js";

initializeNavigation();
initializeAvailability();
initializeAppointments();
initializeBooking();
loadAppointments();
