import { ensureAdminSession, redirectToAdminLogin } from "./admin-auth.js";
import { adminAppointmentsList, adminLogoutButton, adminRefreshButton, adminStatus } from "./admin-dom.js";

const statusLabels = {
  pending: "Pending",
  accepted: "Accepted",
  canceled: "Canceled"
};

const renderAppointments = (appointments) => {
  if (!appointments.length) {
    adminAppointmentsList.innerHTML = '<p class="empty-state">No service requests yet.</p>';
    return;
  }

  adminAppointmentsList.innerHTML = appointments.map((appointment) => `
    <article class="admin-card">
      <div class="admin-card__header">
        <div>
          <p class="admin-card__date">${appointment.date}</p>
          <h3>${appointment.time}</h3>
        </div>
        <span class="status-pill status-pill--${appointment.status}">${statusLabels[appointment.status]}</span>
      </div>
      <div class="admin-card__body">
        <p><strong>Name:</strong> ${appointment.name}</p>
        <p><strong>Email:</strong> ${appointment.email}</p>
      </div>
      <div class="admin-card__actions">
        <button class="btn btn-primary admin-action" type="button" data-id="${appointment.id}" data-status="accepted">Accept</button>
        <button class="btn btn-secondary admin-action" type="button" data-id="${appointment.id}" data-status="canceled">Cancel</button>
      </div>
    </article>
  `).join("");
};

const loadAdminAppointments = async () => {
  adminStatus.textContent = "Loading Lawson service requests...";

  try {
    const response = await fetch("/admin/appointments");
    const result = await response.json();

    if (response.status === 401) {
      redirectToAdminLogin();
      return;
    }

    if (!response.ok) {
      throw new Error(result.error || "Could not load service requests.");
    }

    renderAppointments(result.appointments);
    adminStatus.textContent = `Loaded ${result.appointments.length} Lawson request(s).`;
  } catch (error) {
    adminAppointmentsList.innerHTML = '<p class="empty-state">Could not load service requests.</p>';
    adminStatus.textContent = error.message;
  }
};

const updateAppointmentStatus = async (button) => {
  const appointmentId = button.dataset.id;
  const status = button.dataset.status;
  const originalLabel = button.textContent;

  button.disabled = true;
  button.textContent = status === "accepted" ? "Accepting..." : "Canceling...";

  try {
    const response = await fetch(`/admin/appointments/${appointmentId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "same-origin",
      body: JSON.stringify({ status })
    });
    const result = await response.json();

    if (response.status === 401) {
      redirectToAdminLogin();
      return;
    }

    if (!response.ok) {
      throw new Error(result.error || "Could not update service request.");
    }

    adminStatus.textContent = result.message;
    await loadAdminAppointments();
  } catch (error) {
    adminStatus.textContent = error.message;
    button.disabled = false;
    button.textContent = originalLabel;
  }
};

adminRefreshButton.addEventListener("click", () => {
  loadAdminAppointments();
});

adminLogoutButton.addEventListener("click", async () => {
  adminStatus.textContent = "Signing out...";

  try {
    await fetch("/admin/logout", {
      method: "POST",
      credentials: "same-origin"
    });
  } finally {
    redirectToAdminLogin();
  }
});

adminAppointmentsList.addEventListener("click", async (event) => {
  const actionButton = event.target.closest(".admin-action");

  if (!actionButton) {
    return;
  }

  await updateAppointmentStatus(actionButton);
});

const initializeAdminDashboard = async () => {
  const authenticated = await ensureAdminSession();

  if (!authenticated) {
    redirectToAdminLogin();
    return;
  }

  loadAdminAppointments();
};

initializeAdminDashboard();
