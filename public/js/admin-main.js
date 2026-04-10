import { ensureAdminSession, redirectToAdminLogin } from "./admin-auth.js";
import {
  adminCalendar,
  adminCalendarLabel,
  adminCalendarNextButton,
  adminCalendarPrevButton,
  adminCalendarTodayButton,
  adminAppointmentsList,
  adminClearAllButton,
  adminHistoryContent,
  adminHistoryList,
  adminHistoryPanel,
  adminHistoryToggleButton,
  adminLogoutButton,
  adminPricingForm,
  adminPricingList,
  adminPricingStatus,
  adminRefreshButton,
  adminSavePricingButton,
  adminStatus,
  adminTabs,
  adminViewPanels
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

let currentAppointments = [];
let currentHistory = [];
let currentCalendarDate = new Date();
let isHistoryExpanded = false;

const setActiveAdminView = (viewName) => {
  adminTabs.forEach((tab) => {
    const isActive = tab.dataset.adminView === viewName;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-current", isActive ? "page" : "false");
  });

  adminViewPanels.forEach((panel) => {
    const isActive = panel.dataset.adminViewPanel === viewName;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });
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
  currentAppointments = appointments;
  const visibleAppointments = appointments.filter((appointment) => appointment.status !== "canceled");

  if (!visibleAppointments.length) {
    adminAppointmentsList.innerHTML = '<p class="empty-state">No service requests yet.</p>';
    renderCalendar();
    return;
  }

  adminAppointmentsList.innerHTML = visibleAppointments.map((appointment) => `
    <article class="admin-card">
      <div class="admin-card__header">
        <div>
          <p class="admin-card__date">${escapeHtml(appointment.date)}</p>
          <h3>${escapeHtml(appointment.time)}</h3>
        </div>
        <span class="status-pill status-pill--${escapeHtml(appointment.status)}">${escapeHtml(statusLabels[appointment.status] || appointment.status)}</span>
      </div>
      <div class="admin-card__body">
        <p><strong>Name:</strong> ${escapeHtml(appointment.name)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(appointment.phone || "Not provided")}</p>
        <p><strong>Email:</strong> ${escapeHtml(appointment.email)}</p>
        <p><strong>Payment:</strong> ${escapeHtml(paymentLabels[appointment.payment_status] || appointment.payment_status)}</p>
        <p><strong>Amount:</strong> ${escapeHtml(appointment.payment_amount_cents ? `$${(appointment.payment_amount_cents / 100).toFixed(2)}` : "N/A")}</p>
        <p><strong>Source:</strong> ${escapeHtml(appointment.booking_source || "manual")}</p>
        <p><strong>Square Payment ID:</strong> ${escapeHtml(appointment.square_payment_id || "N/A")}</p>
      </div>
      <div class="admin-card__actions">
        <button class="btn btn-primary admin-action" type="button" data-id="${appointment.id}" data-status="accepted">Accept</button>
        <button class="btn btn-secondary admin-action" type="button" data-id="${appointment.id}" data-status="canceled">Cancel</button>
      </div>
    </article>
  `).join("");

  renderCalendar();
};

const renderHistory = (historyItems) => {
  currentHistory = historyItems;

  if (!historyItems.length) {
    adminHistoryList.innerHTML = '<p class="empty-state">No archived Lawson requests yet.</p>';
    return;
  }

  adminHistoryList.innerHTML = historyItems.map((item) => `
    <article class="admin-card admin-card--history">
      <div class="admin-card__header">
        <div>
          <p class="admin-card__date">${escapeHtml(item.date)}</p>
          <h3>${escapeHtml(item.time)}</h3>
        </div>
        <span class="status-pill status-pill--${escapeHtml(item.status)}">${escapeHtml(statusLabels[item.status] || item.status)}</span>
      </div>
      <div class="admin-card__body">
        <p><strong>Name:</strong> ${escapeHtml(item.name)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(item.phone || "Not provided")}</p>
        <p><strong>Email:</strong> ${escapeHtml(item.email)}</p>
        <p><strong>Payment:</strong> ${escapeHtml(paymentLabels[item.payment_status] || item.payment_status)}</p>
        <p><strong>Amount:</strong> ${escapeHtml(item.payment_amount_cents ? `$${(item.payment_amount_cents / 100).toFixed(2)}` : "N/A")}</p>
        <p><strong>Square Payment ID:</strong> ${escapeHtml(item.square_payment_id || "N/A")}</p>
        <p><strong>Archived action:</strong> ${escapeHtml(item.action)}</p>
        <p><strong>Saved on:</strong> ${escapeHtml(new Date(item.recorded_at).toLocaleString())}</p>
      </div>
      <div class="admin-card__actions">
        <button class="btn btn-secondary admin-history-action" type="button" data-history-id="${item.id}">Restore Appointment</button>
      </div>
    </article>
  `).join("");
};

const renderCalendar = () => {
  const monthStart = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1);
  const monthEnd = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0);
  const startOffset = (monthStart.getDay() + 6) % 7;
  const daysInMonth = monthEnd.getDate();
  const leadingDays = Array.from({ length: startOffset }, (_, index) => ({
    type: "empty",
    key: `empty-start-${index}`
  }));
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const dayNumber = index + 1;
    const isoDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), dayNumber)
      .toLocaleDateString("en-CA");
    const appointments = currentAppointments.filter((appointment) => appointment.date === isoDate);

    return {
      type: "day",
      key: isoDate,
      isoDate,
      dayNumber,
      appointments
    };
  });
  const totalCells = leadingDays.length + days.length;
  const trailingCount = (7 - (totalCells % 7)) % 7;
  const trailingDays = Array.from({ length: trailingCount }, (_, index) => ({
    type: "empty",
    key: `empty-end-${index}`
  }));

  adminCalendarLabel.textContent = currentCalendarDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });

  adminCalendar.innerHTML = `
    <div class="admin-calendar__weekdays">
      <span>Mon</span>
      <span>Tue</span>
      <span>Wed</span>
      <span>Thu</span>
      <span>Fri</span>
      <span>Sat</span>
      <span>Sun</span>
    </div>
    <div class="admin-calendar__grid">
      ${[...leadingDays, ...days, ...trailingDays].map((entry) => {
        if (entry.type === "empty") {
          return '<article class="admin-calendar__day admin-calendar__day--empty"></article>';
        }

        return `
          <article class="admin-calendar__day">
            <div class="admin-calendar__day-header">
              <strong>${entry.dayNumber}</strong>
              <span>${entry.appointments.length ? `${entry.appointments.length} booked` : "Open"}</span>
            </div>
            <div class="admin-calendar__appointments">
              ${entry.appointments.length ? entry.appointments.map((appointment) => `
                <div class="admin-calendar__appointment">
                  <strong>${appointment.time}</strong>
                  <span>${escapeHtml(appointment.name)}</span>
                </div>
              `).join("") : '<p class="empty-state">No appointments</p>'}
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
};

const setHistoryExpanded = (expanded) => {
  isHistoryExpanded = expanded;
  adminHistoryPanel.classList.toggle("is-collapsed", !expanded);
  adminHistoryContent.hidden = !expanded;
  adminHistoryToggleButton.setAttribute("aria-expanded", expanded ? "true" : "false");
  adminHistoryToggleButton.textContent = expanded ? "Hide History" : "Show History";
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
    const activeCount = result.appointments.filter((appointment) => appointment.status !== "canceled").length;
    adminStatus.textContent = `Loaded ${activeCount} active Lawson request(s).`;
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
    setActiveAdminView("requests");
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

adminTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setActiveAdminView(tab.dataset.adminView);
  });
});

adminCalendarPrevButton.addEventListener("click", () => {
  currentCalendarDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1);
  renderCalendar();
});

adminCalendarTodayButton.addEventListener("click", () => {
  currentCalendarDate = new Date();
  renderCalendar();
});

adminCalendarNextButton.addEventListener("click", () => {
  currentCalendarDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1);
  renderCalendar();
});

adminHistoryToggleButton.addEventListener("click", () => {
  setHistoryExpanded(!isHistoryExpanded);
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

adminHistoryList.addEventListener("click", async (event) => {
  const restoreButton = event.target.closest(".admin-history-action");

  if (!restoreButton) {
    return;
  }

  const originalLabel = restoreButton.textContent;
  restoreButton.disabled = true;
  restoreButton.textContent = "Restoring...";

  try {
    const response = await fetch(`/admin/appointments/history/${restoreButton.dataset.historyId}/restore`, {
      method: "POST",
      credentials: "same-origin"
    });
    const result = await parseAdminResponse(response, "Could not restore appointment.");

    if (!result) {
      return;
    }

    if (!response.ok) {
      throw new Error(result.error || "Could not restore appointment.");
    }

    adminStatus.textContent = result.message;
    await loadAdminAppointments();
    await loadAdminHistory();
  } catch (error) {
    adminStatus.textContent = error.message;
    restoreButton.disabled = false;
    restoreButton.textContent = originalLabel;
  }
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
  renderCalendar();
  setHistoryExpanded(true);
  setActiveAdminView("requests");
};

initializeAdminDashboard();
