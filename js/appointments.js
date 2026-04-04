import { appointmentsList, appointmentsStatus, dateInput } from "./dom.js";
import { loadAvailableTimes } from "./availability.js";

const renderAppointments = (appointments) => {
  if (!appointments.length) {
    appointmentsList.innerHTML = '<p class="empty-state">No appointments yet.</p>';
    return;
  }

  appointmentsList.innerHTML = appointments.map((appointment) => `
    <article class="appointment-item">
      <div class="appointment-item__top">
        <h3>${appointment.name}</h3>
        <span class="service-tag">${appointment.date}</span>
      </div>
      <p>${appointment.email}</p>
      <p><strong>Time:</strong> ${appointment.time}</p>
      <button class="btn btn-secondary unlock-button" type="button" data-id="${appointment.id}" data-date="${appointment.date}">Unlock Slot</button>
    </article>
  `).join("");
};

export const loadAppointments = async () => {
  appointmentsStatus.textContent = "Loading appointments...";

  try {
    const response = await fetch("/appointments");
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Could not load appointments.");
    }

    renderAppointments(result.appointments);
    appointmentsStatus.textContent = `Loaded ${result.appointments.length} appointment(s).`;
  } catch (error) {
    appointmentsList.innerHTML = '<p class="empty-state">Could not load appointments.</p>';
    appointmentsStatus.textContent = error.message;
  }
};

const unlockAppointment = async (unlockButton) => {
  const appointmentId = unlockButton.dataset.id;
  const appointmentDate = unlockButton.dataset.date;
  unlockButton.disabled = true;
  unlockButton.textContent = "Unlocking...";

  try {
    const response = await fetch(`/appointments/${appointmentId}`, {
      method: "DELETE"
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Could not unlock slot.");
    }

    appointmentsStatus.textContent = result.message;
    await loadAppointments();

    if (dateInput.value === appointmentDate) {
      await loadAvailableTimes(dateInput.value);
    }
  } catch (error) {
    appointmentsStatus.textContent = error.message;
    unlockButton.disabled = false;
    unlockButton.textContent = "Unlock Slot";
  }
};

export const initializeAppointments = () => {
  appointmentsList.addEventListener("click", async (event) => {
    const unlockButton = event.target.closest(".unlock-button");

    if (!unlockButton) {
      return;
    }

    await unlockAppointment(unlockButton);
  });
};
