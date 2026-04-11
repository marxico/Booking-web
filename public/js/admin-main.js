import { ensureAdminSession, hasAdminPermission, redirectToAdminLogin } from "./admin-auth.js";
import { installClientLogging, logClientError, logClientInfo } from "./client-logger.js";
import { validateAdminUserPayload, validatePassword } from "./validation.js";
import {
  adminAnalyticsBreakdown,
  adminAnalyticsRecent,
  adminAnalyticsSources,
  adminAnalyticsStatus,
  adminAnalyticsSummary,
  adminAppointmentsList,
  adminCalendar,
  adminCalendarLabel,
  adminCalendarNextButton,
  adminCalendarPrevButton,
  adminCalendarTodayButton,
  adminAddPricingItemButton,
  adminClearAllButton,
  adminCreateUserButton,
  adminHeroRefreshButton,
  adminHistoryContent,
  adminHistoryList,
  adminHistoryPanel,
  adminHistoryToggleButton,
  adminLogoutButton,
  adminOverviewActivity,
  adminOverviewKpis,
  adminOverviewPipeline,
  adminOverviewRevenue,
  adminOverviewServices,
  adminPricingForm,
  adminPricingList,
  adminPricingStatus,
  adminProfileMeta,
  adminProfileName,
  adminRefreshButton,
  adminSavePricingButton,
  adminStatus,
  adminTabs,
  adminUserForm,
  adminUserRole,
  adminUsersList,
  adminUsersStatus,
  adminViewPanels
} from "./admin-dom.js";

const statusLabels = { pending: "Pending", accepted: "Accepted", canceled: "Canceled" };
const paymentLabels = { paid: "Paid", not_required: "Not required" };

let currentAppointments = [];
let currentHistory = [];
let currentCalendarDate = new Date();
let currentSession = null;
let currentUserRoles = [];
let isHistoryExpanded = true;
let currentPricing = [];
let currentAnalytics = null;
let currentUsers = [];

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const parseAdminResponse = async (response, fallbackMessage) => {
  const contentType = response.headers.get("content-type") || "";

  if (response.redirected || response.status === 401 || response.url.includes("/admin-login")) {
    redirectToAdminLogin();
    return null;
  }

  if (contentType.includes("application/json")) {
    return response.json();
  }

  throw new Error(fallbackMessage);
};

const can = (permission) => hasAdminPermission(currentSession, permission);

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

const applyPermissionVisibility = () => {
  adminTabs.forEach((tab) => {
    const requiredPermission = tab.dataset.adminPermission;
    const canView = !requiredPermission || can(requiredPermission);
    tab.hidden = !canView;
  });

  adminViewPanels.forEach((panel) => {
    const linkedTab = Array.from(adminTabs).find((tab) => tab.dataset.adminView === panel.dataset.adminViewPanel);
    panel.hidden = linkedTab ? linkedTab.hidden : false;
  });

  adminSavePricingButton.disabled = !can("pricing.write");
  adminSavePricingButton.hidden = !can("pricing.write");
  adminClearAllButton.disabled = !can("appointments.write");
  adminClearAllButton.hidden = !can("appointments.write");
  adminCreateUserButton.disabled = !can("users.write");
  adminCreateUserButton.hidden = !can("users.write");
  adminUserForm.hidden = !can("users.write");
};

const renderProfile = () => {
  adminProfileName.textContent = currentSession?.user?.displayName || "Lawson Admin";
  adminProfileMeta.textContent = currentSession?.user
    ? `${currentSession.user.role} • ${currentSession.user.email}`
    : "Private dashboard";
};

const renderOverview = () => {
  if (!adminOverviewKpis || !adminOverviewPipeline || !adminOverviewRevenue || !adminOverviewServices || !adminOverviewActivity) {
    return;
  }

  const activeAppointments = currentAppointments.filter((appointment) => appointment.status !== "canceled");
  const pendingAppointments = activeAppointments.filter((appointment) => appointment.status === "pending");
  const acceptedAppointments = activeAppointments.filter((appointment) => appointment.status === "accepted");
  const paidAppointments = currentAppointments.filter((appointment) => appointment.payment_status === "paid");
  const activePricing = currentPricing.filter((item) => item.isActive);
  const bookingFee = currentPricing.find((item) => item.isBookingFee);
  const activeUsers = currentUsers.filter((user) => user.isActive);
  const recentActivity = [...currentAppointments]
    .sort((left, right) => `${right.date} ${right.time}`.localeCompare(`${left.date} ${left.time}`))
    .slice(0, 4);
  const historyActivity = [...currentHistory].slice(0, 3);

  adminOverviewKpis.innerHTML = `
    <article class="admin-kpi-card">
      <span>Open requests</span>
      <strong>${activeAppointments.length}</strong>
      <p>${pendingAppointments.length} waiting for review</p>
    </article>
    <article class="admin-kpi-card">
      <span>Accepted jobs</span>
      <strong>${acceptedAppointments.length}</strong>
      <p>${activeAppointments.length ? Math.round((acceptedAppointments.length / activeAppointments.length) * 100) : 0}% of active queue</p>
    </article>
    <article class="admin-kpi-card">
      <span>Paid bookings</span>
      <strong>${paidAppointments.length}</strong>
      <p>${escapeHtml(currentAnalytics?.summary?.[3]?.value || "$0.00")} captured</p>
    </article>
    <article class="admin-kpi-card">
      <span>Active team</span>
      <strong>${activeUsers.length}</strong>
      <p>${activePricing.length} public service${activePricing.length === 1 ? "" : "s"} live</p>
    </article>
  `;

  adminOverviewPipeline.innerHTML = `
    <article class="admin-overview-row">
      <div>
        <strong>Pending approvals</strong>
        <span>Requests that still need a decision from the front desk.</span>
      </div>
      <b>${pendingAppointments.length}</b>
    </article>
    <article class="admin-overview-row">
      <div>
        <strong>Accepted jobs</strong>
        <span>Approved appointments currently on the live board.</span>
      </div>
      <b>${acceptedAppointments.length}</b>
    </article>
    <article class="admin-overview-row">
      <div>
        <strong>Archived records</strong>
        <span>History kept after cancel, clear, or restore actions.</span>
      </div>
      <b>${currentHistory.length}</b>
    </article>
    <article class="admin-overview-row">
      <div>
        <strong>Team access</strong>
        <span>Admins with active access to the platform.</span>
      </div>
      <b>${activeUsers.length}</b>
    </article>
  `;

  adminOverviewRevenue.innerHTML = `
    <div class="admin-revenue-card admin-revenue-card--accent">
      <span>Current booking fee</span>
      <strong>${escapeHtml(bookingFee?.priceFormatted || "$0.00")}</strong>
      <p>${escapeHtml(bookingFee?.name || "No booking fee configured")}</p>
    </div>
    <div class="admin-revenue-card">
      <span>Total captured</span>
      <strong>${escapeHtml(currentAnalytics?.summary?.[3]?.value || "$0.00")}</strong>
      <p>${paidAppointments.length} paid booking${paidAppointments.length === 1 ? "" : "s"} processed</p>
    </div>
  `;

  adminOverviewServices.innerHTML = activePricing.length
    ? activePricing.slice(0, 6).map((item) => `
      <article class="admin-service-chip">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.description || "Public service")}</span>
        </div>
        <b>${escapeHtml(item.priceFormatted)}</b>
      </article>
    `).join("")
    : '<p class="empty-state">No public services configured yet.</p>';

  const activityMarkup = [
    ...recentActivity.map((item) => `
      <article class="admin-activity-item">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.date)} at ${escapeHtml(item.time)} • ${escapeHtml(statusLabels[item.status] || item.status)}</span>
      </article>
    `),
    ...historyActivity.map((item) => `
      <article class="admin-activity-item">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.action || "history")} • ${escapeHtml(new Date(item.recorded_at).toLocaleString())}</span>
      </article>
    `)
  ].join("");

  adminOverviewActivity.innerHTML = activityMarkup || '<p class="empty-state">No recent activity yet.</p>';
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
      </div>
      <div class="admin-card__actions">
        <button class="btn btn-primary admin-action" type="button" data-id="${appointment.id}" data-status="accepted" ${can("appointments.write") ? "" : "disabled"}>Accept</button>
        <button class="btn btn-secondary admin-action" type="button" data-id="${appointment.id}" data-status="canceled" ${can("appointments.write") ? "" : "disabled"}>Cancel</button>
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
        <p><strong>Email:</strong> ${escapeHtml(item.email)}</p>
        <p><strong>Archived action:</strong> ${escapeHtml(item.action)}</p>
        <p><strong>Saved on:</strong> ${escapeHtml(new Date(item.recorded_at).toLocaleString())}</p>
      </div>
      <div class="admin-card__actions">
        <button class="btn btn-secondary admin-history-action" type="button" data-history-id="${item.id}" ${can("appointments.write") ? "" : "disabled"}>Restore Appointment</button>
      </div>
    </article>
  `).join("");
};

const renderCalendar = () => {
  const monthStart = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1);
  const monthEnd = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0);
  const startOffset = (monthStart.getDay() + 6) % 7;
  const daysInMonth = monthEnd.getDate();
  const leadingDays = Array.from({ length: startOffset }, (_, index) => ({ type: "empty", key: `empty-start-${index}` }));
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const dayNumber = index + 1;
    const isoDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), dayNumber).toLocaleDateString("en-CA");
    const appointments = currentAppointments.filter((appointment) => appointment.date === isoDate && appointment.status !== "canceled");

    return { type: "day", key: isoDate, dayNumber, appointments };
  });
  const totalCells = leadingDays.length + days.length;
  const trailingDays = Array.from({ length: (7 - (totalCells % 7)) % 7 }, (_, index) => ({ type: "empty", key: `empty-end-${index}` }));

  adminCalendarLabel.textContent = currentCalendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  adminCalendar.innerHTML = `
    <div class="admin-calendar__weekdays">
      <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
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
                  <strong>${escapeHtml(appointment.time)}</strong>
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
  currentPricing = pricingItems;
  adminPricingList.innerHTML = pricingItems.map((item) => `
    <article class="pricing-editor-card">
      <div class="field">
        <label>Service Name</label>
        <input type="text" name="name" value="${escapeHtml(item.name)}" data-code="${item.code}" ${can("pricing.write") ? "" : "disabled"}>
      </div>
      <div class="field">
        <label>Description</label>
        <input type="text" name="description" value="${escapeHtml(item.description)}" data-code="${item.code}" ${can("pricing.write") ? "" : "disabled"}>
      </div>
      <div class="pricing-editor-grid">
        <div class="field">
          <label>Price (USD)</label>
          <input type="number" name="priceCents" min="0" step="0.01" value="${(item.priceCents / 100).toFixed(2)}" data-code="${item.code}" ${can("pricing.write") ? "" : "disabled"}>
        </div>
        <div class="field">
          <label>Discount Type</label>
          <select name="discountType" data-code="${item.code}" ${can("pricing.write") ? "" : "disabled"}>
            <option value="none" ${!item.discountType || item.discountType === "none" ? "selected" : ""}>No discount</option>
            <option value="percent" ${item.discountType === "percent" ? "selected" : ""}>Percent off</option>
            <option value="fixed" ${item.discountType === "fixed" ? "selected" : ""}>Fixed amount off</option>
          </select>
        </div>
      </div>
      <div class="pricing-editor-grid">
        <div class="field">
          <label>Discount Value</label>
          <input type="number" name="discountValue" min="0" step="1" value="${item.discountValue || 0}" data-code="${item.code}" ${can("pricing.write") ? "" : "disabled"}>
        </div>
        <div class="field">
          <label>Discount Label</label>
          <input type="text" name="discountLabel" value="${escapeHtml(item.discountLabel || "")}" data-code="${item.code}" placeholder="Spring special" ${can("pricing.write") ? "" : "disabled"}>
        </div>
      </div>
      <div class="pricing-editor-grid">
        <div class="field">
          <label>Sort Order</label>
          <input type="number" name="sortOrder" min="0" step="1" value="${item.sortOrder}" data-code="${item.code}" ${can("pricing.write") ? "" : "disabled"}>
        </div>
      </div>
      <div class="pricing-toggle-row">
        <label class="pricing-check">
          <input type="checkbox" name="isBookingFee" ${item.isBookingFee ? "checked" : ""} data-code="${item.code}" ${can("pricing.write") ? "" : "disabled"}>
          <span>Required booking fee</span>
        </label>
        <label class="pricing-check">
          <input type="checkbox" name="isActive" ${item.isActive ? "checked" : ""} data-code="${item.code}" ${can("pricing.write") ? "" : "disabled"}>
          <span>Show publicly</span>
        </label>
      </div>
      <div class="admin-panel__actions admin-panel__actions--footer">
        <button class="btn btn-secondary admin-pricing-remove" type="button" data-code="${item.code}" ${can("pricing.write") ? "" : "disabled"}>Remove Service</button>
      </div>
      <input type="hidden" name="code" value="${item.code}">
    </article>
  `).join("");
};

const createPricingCode = () => `service_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const addPricingItem = () => {
  const nextSortOrder = currentPricing.length ? Math.max(...currentPricing.map((item) => Number(item.sortOrder || 0))) + 1 : 1;

  currentPricing = [
    ...currentPricing,
    {
      code: createPricingCode(),
      name: "",
      description: "",
      priceCents: 0,
      priceFormatted: "$0.00",
      originalPriceFormatted: "$0.00",
      discountedPriceCents: 0,
      discountType: "none",
      discountValue: 0,
      discountLabel: "",
      hasDiscount: false,
      sortOrder: nextSortOrder,
      isBookingFee: false,
      isActive: true
    }
  ];

  renderPricing(currentPricing);
  adminPricingStatus.textContent = "New service added. Fill it in and save pricing.";
};

const removePricingItem = (code) => {
  currentPricing = currentPricing.filter((item) => item.code !== code);
  renderPricing(currentPricing);
  adminPricingStatus.textContent = "Service removed. Save pricing to apply the change.";
};

const updatePricingItemState = (code, fieldName, nextValue) => {
  let didUpdate = false;

  currentPricing = currentPricing.map((item) => {
    if (item.code !== code) {
      if (fieldName === "isBookingFee" && nextValue) {
        return {
          ...item,
          isBookingFee: false
        };
      }

      return item;
    }

    didUpdate = true;
    return {
      ...item,
      [fieldName]: nextValue
    };
  });

  if (!didUpdate) {
    return;
  }

  if (fieldName === "isBookingFee" && nextValue) {
    adminPricingList.querySelectorAll('input[name="isBookingFee"]').forEach((input) => {
      input.checked = input.dataset.code === code;
    });
  }
};

const normalizePricingItemsForSave = () => currentPricing.map((item) => ({
  code: String(item.code || "").trim(),
  name: String(item.name || "").trim(),
  description: String(item.description || "").trim(),
  priceCents: Number.isFinite(Number(item.priceCents)) ? Math.max(0, Math.round(Number(item.priceCents))) : 0,
  discountType: item.discountType || "none",
  discountValue: Number.isFinite(Number(item.discountValue)) ? Math.max(0, Math.round(Number(item.discountValue))) : 0,
  discountLabel: String(item.discountLabel || "").trim(),
  sortOrder: Number.isFinite(Number(item.sortOrder)) ? Math.max(0, Math.round(Number(item.sortOrder))) : 0,
  isBookingFee: Boolean(item.isBookingFee),
  isActive: Boolean(item.isActive)
}));

const renderAnalytics = (analytics) => {
  adminAnalyticsSummary.innerHTML = analytics.summary.map((item) => `
    <article class="admin-metric-card">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(item.value)}</strong>
      <p>${escapeHtml(item.detail)}</p>
    </article>
  `).join("");

  adminAnalyticsBreakdown.innerHTML = Object.entries(analytics.breakdown).map(([label, value]) => `
    <div class="admin-breakdown-row">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `).join("");

  adminAnalyticsSources.innerHTML = Object.entries(analytics.trends.sourceSummary || {}).map(([label, value]) => `
    <div class="admin-breakdown-row">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `).join("") || '<p class="empty-state">No channel data yet.</p>';

  adminAnalyticsRecent.innerHTML = analytics.recentBookings.length
    ? analytics.recentBookings.map((item) => `
      <article class="admin-mini-item">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.date)} • ${escapeHtml(item.time)}</span>
      </article>
    `).join("")
    : '<p class="empty-state">No recent bookings yet.</p>';

  if (analytics.trends.busiestDay) {
    adminAnalyticsStatus.textContent = `Busiest day: ${analytics.trends.busiestDay.date} with ${analytics.trends.busiestDay.count} appointment(s).`;
  } else {
    adminAnalyticsStatus.textContent = "Analytics ready.";
  }
};

const renderRoleOptions = (roles) => {
  currentUserRoles = roles;
  adminUserRole.innerHTML = roles.map((role) => `<option value="${escapeHtml(role.value)}">${escapeHtml(role.label)}</option>`).join("");
};

const renderUsers = (users) => {
  if (!users.length) {
    adminUsersList.innerHTML = '<p class="empty-state">No admin users found.</p>';
    return;
  }

  adminUsersList.innerHTML = users.map((user) => `
    <article class="admin-card admin-user-card">
      <div class="admin-card__header">
        <div>
          <p class="admin-card__date">${escapeHtml(user.email)}</p>
          <h3>${escapeHtml(user.displayName)}</h3>
        </div>
        <span class="status-pill ${user.isActive ? "status-pill--accepted" : "status-pill--canceled"}">${user.isActive ? "Active" : "Inactive"}</span>
      </div>
      <div class="admin-card__body">
        <p><strong>Username:</strong> ${escapeHtml(user.username)}</p>
        <p><strong>Role:</strong> ${escapeHtml(user.roleLabel || user.role)}</p>
        <p><strong>Access:</strong> ${escapeHtml(user.authProvider)}</p>
        <p><strong>Last login:</strong> ${escapeHtml(user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never")}</p>
      </div>
      <div class="admin-user-controls">
        <label class="field">
          <span>Role</span>
          <select class="admin-user-role" data-user-id="${user.id}" ${can("users.write") ? "" : "disabled"}>
            ${currentUserRoles.map((role) => `<option value="${escapeHtml(role.value)}" ${user.role === role.value ? "selected" : ""}>${escapeHtml(role.label)}</option>`).join("")}
          </select>
        </label>
        <label class="field">
          <span>New password</span>
          <input class="admin-user-password" data-user-id="${user.id}" type="password" minlength="8" placeholder="Leave blank to keep current" ${can("users.write") ? "" : "disabled"}>
        </label>
        <label class="pricing-check">
          <input class="admin-user-active" data-user-id="${user.id}" type="checkbox" ${user.isActive ? "checked" : ""} ${can("users.write") ? "" : "disabled"}>
          <span>Active</span>
        </label>
        <button class="btn btn-secondary admin-user-save" type="button" data-user-id="${user.id}" ${can("users.write") ? "" : "disabled"}>Save</button>
      </div>
    </article>
  `).join("");
};

const loadAdminAppointments = async () => {
  adminStatus.textContent = "Loading Lawson service requests...";

  try {
    const response = await fetch("/admin/appointments", { credentials: "same-origin" });
    const result = await parseAdminResponse(response, "Could not load service requests.");
    if (!result) return;
    if (!response.ok) throw new Error(result.error || "Could not load service requests.");
    renderAppointments(result.appointments);
    renderOverview();
    logClientInfo("admin-appointments-loaded", `${result.appointments.length} records`);
    adminStatus.textContent = `Loaded ${result.appointments.filter((appointment) => appointment.status !== "canceled").length} active Lawson request(s).`;
  } catch (error) {
    logClientError("admin-appointments-failed", error.message);
    adminAppointmentsList.innerHTML = '<p class="empty-state">Could not load service requests.</p>';
    adminStatus.textContent = error.message;
  }
};

const loadAdminHistory = async () => {
  try {
    const response = await fetch("/admin/appointments/history", { credentials: "same-origin" });
    const result = await parseAdminResponse(response, "Could not load request history.");
    if (!result) return;
    if (!response.ok) throw new Error(result.error || "Could not load request history.");
    renderHistory(result.history);
    renderOverview();
  } catch {
    adminHistoryList.innerHTML = '<p class="empty-state">Could not load request history.</p>';
  }
};

const loadAdminPricing = async () => {
  adminPricingStatus.textContent = "Loading pricing...";

  try {
    const response = await fetch("/admin/pricing", { credentials: "same-origin" });
    const result = await parseAdminResponse(response, "Could not load pricing.");
    if (!result) return;
    if (!response.ok) throw new Error(result.error || "Could not load pricing.");
    renderPricing(result.pricing);
    renderOverview();
    adminPricingStatus.textContent = can("pricing.write") ? "Pricing loaded." : "Read-only pricing view.";
  } catch (error) {
    adminPricingList.innerHTML = '<p class="empty-state">Could not load pricing.</p>';
    adminPricingStatus.textContent = error.message;
  }
};

const loadAdminAnalytics = async () => {
  if (!can("analytics.read")) return;
  adminAnalyticsStatus.textContent = "Loading analytics...";

  try {
    const response = await fetch("/admin/analytics", { credentials: "same-origin" });
    const result = await parseAdminResponse(response, "Could not load analytics.");
    if (!result) return;
    if (!response.ok) throw new Error(result.error || "Could not load analytics.");
    currentAnalytics = result.analytics;
    renderAnalytics(result.analytics);
    renderOverview();
    logClientInfo("admin-analytics-loaded");
  } catch (error) {
    logClientError("admin-analytics-failed", error.message);
    adminAnalyticsSummary.innerHTML = '<p class="empty-state">Could not load analytics.</p>';
    adminAnalyticsStatus.textContent = error.message;
  }
};

const loadAdminUsers = async () => {
  if (!can("users.read")) return;
  adminUsersStatus.textContent = "Loading admin team...";

  try {
    const response = await fetch("/admin/users", { credentials: "same-origin" });
    const result = await parseAdminResponse(response, "Could not load admin users.");
    if (!result) return;
    if (!response.ok) throw new Error(result.error || "Could not load admin users.");
    currentUsers = result.users;
    renderRoleOptions(result.roles);
    renderUsers(result.users);
    renderOverview();
    adminUsersStatus.textContent = `${result.users.length} admin user(s) loaded.`;
  } catch (error) {
    adminUsersList.innerHTML = '<p class="empty-state">Could not load admin users.</p>';
    adminUsersStatus.textContent = error.message;
  }
};

const refreshAll = () => {
  loadAdminAppointments();
  loadAdminHistory();
  loadAdminPricing();
  loadAdminAnalytics();
  loadAdminUsers();
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
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ status })
    });
    const result = await parseAdminResponse(response, "Could not update service request.");
    if (!result) return;
    if (!response.ok) throw new Error(result.error || "Could not update service request.");
    adminStatus.textContent = result.message;
    refreshAll();
  } catch (error) {
    adminStatus.textContent = error.message;
    button.disabled = false;
    button.textContent = originalLabel;
  }
};

adminRefreshButton.addEventListener("click", refreshAll);
adminHeroRefreshButton?.addEventListener("click", refreshAll);
adminAddPricingItemButton?.addEventListener("click", () => {
  if (!can("pricing.write")) return;
  addPricingItem();
});
adminTabs.forEach((tab) => tab.addEventListener("click", () => setActiveAdminView(tab.dataset.adminView)));
adminCalendarPrevButton.addEventListener("click", () => { currentCalendarDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1); renderCalendar(); });
adminCalendarTodayButton.addEventListener("click", () => { currentCalendarDate = new Date(); renderCalendar(); });
adminCalendarNextButton.addEventListener("click", () => { currentCalendarDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1); renderCalendar(); });
adminHistoryToggleButton.addEventListener("click", () => setHistoryExpanded(!isHistoryExpanded));

adminClearAllButton.addEventListener("click", async () => {
  if (!window.confirm("Clear all active Lawson requests and save them to history?")) return;
  adminClearAllButton.disabled = true;
  adminStatus.textContent = "Clearing Lawson requests...";

  try {
    const response = await fetch("/admin/appointments/clear", { method: "POST", credentials: "same-origin" });
    const result = await parseAdminResponse(response, "Could not clear requests.");
    if (!result) return;
    if (!response.ok) throw new Error(result.error || "Could not clear requests.");
    adminStatus.textContent = result.message;
    refreshAll();
  } catch (error) {
    adminStatus.textContent = error.message;
  } finally {
    adminClearAllButton.disabled = !can("appointments.write");
  }
});

adminLogoutButton.addEventListener("click", async () => {
  try {
    await fetch("/admin/logout", { method: "POST", credentials: "same-origin" });
  } finally {
    redirectToAdminLogin();
  }
});

adminAppointmentsList.addEventListener("click", async (event) => {
  const actionButton = event.target.closest(".admin-action");
  if (actionButton) await updateAppointmentStatus(actionButton);
});

adminHistoryList.addEventListener("click", async (event) => {
  const restoreButton = event.target.closest(".admin-history-action");
  if (!restoreButton) return;

  try {
    const response = await fetch(`/admin/appointments/history/${restoreButton.dataset.historyId}/restore`, {
      method: "POST",
      credentials: "same-origin"
    });
    const result = await parseAdminResponse(response, "Could not restore appointment.");
    if (!result) return;
    if (!response.ok) throw new Error(result.error || "Could not restore appointment.");
    adminStatus.textContent = result.message;
    refreshAll();
  } catch (error) {
    adminStatus.textContent = error.message;
  }
});

adminPricingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!can("pricing.write")) return;

  adminSavePricingButton.disabled = true;
  adminPricingStatus.textContent = "Saving pricing...";

  try {
    const items = normalizePricingItemsForSave();

    const response = await fetch("/admin/pricing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ items })
    });
    const result = await parseAdminResponse(response, "Could not save pricing.");
    if (!result) return;
    if (!response.ok) throw new Error(result.error || "Could not save pricing.");
    renderPricing(result.pricing);
    adminPricingStatus.textContent = result.message;
  } catch (error) {
    adminPricingStatus.textContent = error.message;
  } finally {
    adminSavePricingButton.disabled = false;
  }
});

const handlePricingEditorChange = (event) => {
  const field = event.target.closest("[data-code]");

  if (!field || !field.name) {
    return;
  }

  const code = field.dataset.code;
  const fieldName = field.name;

  if (!code) {
    return;
  }

  if (field.type === "checkbox") {
    updatePricingItemState(code, fieldName, field.checked);
    return;
  }

  if (fieldName === "priceCents") {
    const value = Number.parseFloat(field.value || "0");
    updatePricingItemState(code, fieldName, Number.isFinite(value) ? Math.round(value * 100) : 0);
    return;
  }

  if (fieldName === "discountValue" || fieldName === "sortOrder") {
    const value = Number.parseInt(field.value || "0", 10);
    updatePricingItemState(code, fieldName, Number.isFinite(value) ? value : 0);
    return;
  }

  updatePricingItemState(code, fieldName, field.value);
};

adminPricingList.addEventListener("input", handlePricingEditorChange);
adminPricingList.addEventListener("change", handlePricingEditorChange);

adminPricingList.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".admin-pricing-remove");

  if (!removeButton) {
    return;
  }

  removePricingItem(removeButton.dataset.code);
});

adminUserForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!can("users.write")) return;

  adminCreateUserButton.disabled = true;
  adminUsersStatus.textContent = "Creating admin user...";
  const formData = new FormData(adminUserForm);

  try {
    validateAdminUserPayload(Object.fromEntries(formData.entries()));

    const response = await fetch("/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });
    const result = await parseAdminResponse(response, "Could not create admin user.");
    if (!result) return;
    if (!response.ok) throw new Error(result.error || "Could not create admin user.");
    adminUserForm.reset();
    adminUsersStatus.textContent = result.message;
    loadAdminUsers();
  } catch (error) {
    adminUsersStatus.textContent = error.message;
  } finally {
    adminCreateUserButton.disabled = false;
  }
});

adminUsersList.addEventListener("click", async (event) => {
  const saveButton = event.target.closest(".admin-user-save");
  if (!saveButton) return;

  const userId = saveButton.dataset.userId;
  const role = adminUsersList.querySelector(`.admin-user-role[data-user-id="${userId}"]`).value;
  const password = adminUsersList.querySelector(`.admin-user-password[data-user-id="${userId}"]`).value;
  const isActive = adminUsersList.querySelector(`.admin-user-active[data-user-id="${userId}"]`).checked;

  saveButton.disabled = true;
  adminUsersStatus.textContent = "Saving team update...";

  try {
    if (password.trim()) {
      validatePassword(password);
    }

    const response = await fetch(`/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ role, password, isActive })
    });
    const result = await parseAdminResponse(response, "Could not update admin user.");
    if (!result) return;
    if (!response.ok) throw new Error(result.error || "Could not update admin user.");
    adminUsersStatus.textContent = result.message;
    loadAdminUsers();
  } catch (error) {
    adminUsersStatus.textContent = error.message;
  } finally {
    saveButton.disabled = false;
  }
});

const initializeAdminDashboard = async () => {
  installClientLogging("admin-dashboard");
  currentSession = await ensureAdminSession();

  if (!currentSession?.authenticated) {
    redirectToAdminLogin();
    return;
  }

  renderProfile();
  logClientInfo("admin-dashboard-ready", currentSession?.user?.email || "");
  applyPermissionVisibility();
  setHistoryExpanded(true);
  renderCalendar();
  renderOverview();
  refreshAll();

  const firstVisibleTab = Array.from(adminTabs).find((tab) => !tab.hidden);
  setActiveAdminView(firstVisibleTab?.dataset.adminView || "overview");
};

initializeAdminDashboard();
