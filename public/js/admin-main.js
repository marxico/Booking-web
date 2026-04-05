import { ensureAdminSession, redirectToAdminLogin } from "./admin-auth.js";
import {
  adminAppointmentsList,
  adminClearAllButton,
  adminHistoryList,
  adminLogoutButton,
  adminPricingForm,
  adminPricingList,
  adminPricingStatus,
  adminRefreshButton,
  adminSavePricingButton,
  adminStatus
} from "./admin-dom.js";

const statusLabels = {
  pending: "Pending",
  accepted: "Accepted",
  canceled: "Canceled"
};

const paymentLabels = {
  paid: "Paid",
  not_required: "Not required"
};

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const parseAdminResponse = async (response, fallbackMessage) => {
  const contentType = response.headers.get("content-type") || "";

  if (response.redirected || response.url.includes("/admin-login")) {
    redirectToAdminLogin();
    return null;
  }

  if (contentType.includes("application/json")) {
    return response.json();
  }

  if (response.status === 401) {
    redirectToAdminLogin();
    return null;
  }

  throw new Error(fallbackMessage);
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
        <p><strong>Phone:</strong> ${appointment.phone || "Not provided"}</p>
        <p><strong>Email:</strong> ${appointment.email}</p>
        <p><strong>Payment:</strong> ${paymentLabels[appointment.payment_status] || appointment.payment_status}</p>
        <p><strong>Amount:</strong> ${appointment.payment_amount_cents ? `$${(appointment.payment_amount_cents / 100).toFixed(2)}` : "N/A"}</p>
        <p><strong>Source:</strong> ${appointment.booking_source || "manual"}</p>
        <p><strong>Square Payment ID:</strong> ${appointment.square_payment_id || "N/A"}</p>
      </div>
      <div class="admin-card__actions">
        <button class="btn btn-primary admin-action" type="button" data-id="${appointment.id}" data-status="accepted">Accept</button>
        <button class="btn btn-secondary admin-action" type="button" data-id="${appointment.id}" data-status="canceled">Cancel</button>
      </div>
    </article>
  `).join("");
};

const renderHistory = (historyItems) => {
  if (!historyItems.length) {
    adminHistoryList.innerHTML = '<p class="empty-state">No archived Lawson requests yet.</p>';
    return;
  }

  adminHistoryList.innerHTML = historyItems.map((item) => `
    <article class="admin-card admin-card--history">
      <div class="admin-card__header">
        <div>
          <p class="admin-card__date">${item.date}</p>
          <h3>${item.time}</h3>
        </div>
        <span class="status-pill status-pill--${item.status}">${statusLabels[item.status] || item.status}</span>
      </div>
      <div class="admin-card__body">
        <p><strong>Name:</strong> ${item.name}</p>
        <p><strong>Phone:</strong> ${item.phone || "Not provided"}</p>
        <p><strong>Email:</strong> ${item.email}</p>
        <p><strong>Payment:</strong> ${paymentLabels[item.payment_status] || item.payment_status}</p>
        <p><strong>Amount:</strong> ${item.payment_amount_cents ? `$${(item.payment_amount_cents / 100).toFixed(2)}` : "N/A"}</p>
        <p><strong>Square Payment ID:</strong> ${item.square_payment_id || "N/A"}</p>
        <p><strong>Archived action:</strong> ${item.action}</p>
        <p><strong>Saved on:</strong> ${new Date(item.recorded_at).toLocaleString()}</p>
      </div>
    </article>
  `).join("");
};

const renderPricing = (pricingItems) => {
  adminPricingList.innerHTML = pricingItems.map((item) => `
    <article class="pricing-editor-card">
      <div class="field">
        <label>Service Name</label>
        <input type="text" name="name" value="${escapeHtml(item.name)}" data-code="${item.code}">
      </div>
      <div class="field">
        <label>Description</label>
        <input type="text" name="description" value="${escapeHtml(item.description)}" data-code="${item.code}">
      </div>
      <div class="pricing-editor-grid">
        <div class="field">
          <label>Price (USD)</label>
          <input type="number" name="priceCents" min="0" step="0.01" value="${(item.priceCents / 100).toFixed(2)}" data-code="${item.code}">
        </div>
        <div class="field">
          <label>Sort Order</label>
          <input type="number" name="sortOrder" min="0" step="1" value="${item.sortOrder}" data-code="${item.code}">
        </div>
      </div>
      <div class="pricing-toggle-row">
        <label class="pricing-check">
          <input type="checkbox" name="isBookingFee" ${item.isBookingFee ? "checked" : ""} data-code="${item.code}">
          <span>Required booking fee</span>
        </label>
        <label class="pricing-check">
          <input type="checkbox" name="isActive" ${item.isActive ? "checked" : ""} data-code="${item.code}">
          <span>Show publicly</span>
        </label>
      </div>
      <input type="hidden" name="code" value="${item.code}">
    </article>
  `).join("");
};

const loadAdminAppointments = async () => {
  adminStatus.textContent = "Loading Lawson service requests...";

  try {
    const response = await fetch("/admin/appointments");
    const result = await parseAdminResponse(response, "Could not load service requests.");

    if (!result) {
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

const loadAdminHistory = async () => {
  try {
    const response = await fetch("/admin/appointments/history", {
      credentials: "same-origin"
    });
    const result = await parseAdminResponse(response, "Could not load request history.");

    if (!result) {
      return;
    }

    if (!response.ok) {
      throw new Error(result.error || "Could not load request history.");
    }

    renderHistory(result.history);
  } catch (error) {
    adminHistoryList.innerHTML = '<p class="empty-state">Could not load request history.</p>';
  }
};

const loadAdminPricing = async () => {
  adminPricingStatus.textContent = "Loading pricing...";

  try {
    const response = await fetch("/admin/pricing", {
      credentials: "same-origin"
    });
    const result = await parseAdminResponse(response, "Could not load pricing.");

    if (!result) {
      return;
    }

    if (!response.ok) {
      throw new Error(result.error || "Could not load pricing.");
    }

    renderPricing(result.pricing);
    adminPricingStatus.textContent = "Pricing loaded.";
  } catch (error) {
    adminPricingList.innerHTML = '<p class="empty-state">Could not load pricing.</p>';
    adminPricingStatus.textContent = error.message;
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
    const result = await parseAdminResponse(response, "Could not update service request.");

    if (!result) {
      return;
    }

    if (!response.ok) {
      throw new Error(result.error || "Could not update service request.");
    }

    adminStatus.textContent = result.message;
    await loadAdminAppointments();
    await loadAdminHistory();
  } catch (error) {
    adminStatus.textContent = error.message;
    button.disabled = false;
    button.textContent = originalLabel;
  }
};

adminRefreshButton.addEventListener("click", () => {
  loadAdminAppointments();
  loadAdminHistory();
  loadAdminPricing();
});

adminClearAllButton.addEventListener("click", async () => {
  const confirmed = window.confirm("Clear all active Lawson requests and save them to history?");

  if (!confirmed) {
    return;
  }

  adminClearAllButton.disabled = true;
  adminStatus.textContent = "Clearing Lawson requests...";

  try {
    const response = await fetch("/admin/appointments/clear", {
      method: "POST",
      credentials: "same-origin"
    });
    const result = await parseAdminResponse(response, "Could not clear requests.");

    if (!result) {
      return;
    }

    if (!response.ok) {
      throw new Error(result.error || "Could not clear requests.");
    }

    adminStatus.textContent = result.message;
    await loadAdminAppointments();
    await loadAdminHistory();
  } catch (error) {
    adminStatus.textContent = error.message;
  } finally {
    adminClearAllButton.disabled = false;
  }
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

adminPricingForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  adminSavePricingButton.disabled = true;
  adminPricingStatus.textContent = "Saving pricing...";

  const pricingCards = adminPricingList.querySelectorAll(".pricing-editor-card");
  const items = Array.from(pricingCards).map((card) => {
    const getField = (selector) => card.querySelector(selector);

    return {
      code: getField('input[name="code"]').value,
      name: getField('input[name="name"]').value.trim(),
      description: getField('input[name="description"]').value.trim(),
      priceCents: Math.round(Number.parseFloat(getField('input[name="priceCents"]').value || "0") * 100),
      sortOrder: Number.parseInt(getField('input[name="sortOrder"]').value || "0", 10),
      isBookingFee: getField('input[name="isBookingFee"]').checked,
      isActive: getField('input[name="isActive"]').checked
    };
  });

  try {
    const response = await fetch("/admin/pricing", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "same-origin",
      body: JSON.stringify({ items })
    });
    const result = await parseAdminResponse(response, "Could not save pricing.");

    if (!result) {
      return;
    }

    if (!response.ok) {
      throw new Error(result.error || "Could not save pricing.");
    }

    renderPricing(result.pricing);
    adminPricingStatus.textContent = result.message;
  } catch (error) {
    adminPricingStatus.textContent = error.message;
  } finally {
    adminSavePricingButton.disabled = false;
  }
});

const initializeAdminDashboard = async () => {
  const authenticated = await ensureAdminSession();

  if (!authenticated) {
    redirectToAdminLogin();
    return;
  }

  loadAdminAppointments();
  loadAdminHistory();
  loadAdminPricing();
};

initializeAdminDashboard();
