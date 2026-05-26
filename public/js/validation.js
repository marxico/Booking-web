const emailPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
const usernamePattern = /^[a-z0-9._-]{3,32}$/i;
const namePattern = /^[A-Za-zÀ-ÿ0-9 .,'-]{2,80}$/;
const phonePattern = /^\+?[0-9().\-\s]{10,20}$/;

export const sanitizePhoneInput = (phone) => {
  const raw = String(phone || "");
  let sanitized = raw.replace(/[^\d()+.\-\s]/g, "");

  if (sanitized.includes("+")) {
    sanitized = sanitized.startsWith("+")
      ? `+${sanitized.slice(1).replace(/\+/g, "")}`
      : sanitized.replace(/\+/g, "");
  }

  return sanitized.slice(0, 20);
};

export const validateEmail = (email) => {
  const normalized = String(email || "").trim().toLowerCase();

  if (!normalized || normalized.includes("..") || !emailPattern.test(normalized)) {
    throw new Error("Enter a valid email address.");
  }

  return normalized;
};

export const validatePhone = (phone) => {
  const rawPhone = sanitizePhoneInput(phone).trim();
  const digits = String(phone || "").replace(/\D/g, "");

  if (!rawPhone || !phonePattern.test(rawPhone) || digits.length < 10 || digits.length > 15 || /^(\d)\1+$/.test(digits)) {
    throw new Error("Enter a valid phone number with at least 10 digits.");
  }

  return rawPhone;
};

export const validateBookingFormData = ({ name, phone, email, date, time }) => {
  if (!namePattern.test(String(name || "").trim())) {
    throw new Error("Enter a valid name using 2 to 80 characters.");
  }

  validatePhone(phone);
  validateEmail(email);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || "").trim())) {
    throw new Error("Select a valid appointment date.");
  }

  if (!String(time || "").trim()) {
    throw new Error("Select an appointment time.");
  }
};

export const validateAdminIdentifier = (value) => {
  const identifier = String(value || "").trim().toLowerCase();

  if (!identifier) {
    throw new Error("Username or email is required.");
  }

  if (identifier.includes("@")) {
    return validateEmail(identifier);
  }

  if (!usernamePattern.test(identifier)) {
    throw new Error("Enter a valid username.");
  }

  return identifier;
};

export const validatePassword = (value, label = "Password") => {
  const password = String(value || "");

  if (password.trim().length < 8 || password.length > 128) {
    throw new Error(`${label} must be between 8 and 128 characters.`);
  }

  return password;
};

export const validateLoginPassword = (value) => {
  const password = String(value || "");

  if (!password.trim() || password.length > 128) {
    throw new Error("Password is required.");
  }

  return password;
};

export const validateAdminUserPayload = ({ username, email, displayName, password, role, authProvider }) => {
  if (!usernamePattern.test(String(username || "").trim().toLowerCase())) {
    throw new Error("Username must be 3 to 32 characters and use only letters, numbers, dots, dashes, or underscores.");
  }

  validateEmail(email);

  if (!namePattern.test(String(displayName || "").trim())) {
    throw new Error("Display name must be between 2 and 80 valid characters.");
  }

  if (!["super_admin", "manager", "analyst", "viewer"].includes(String(role || "").trim().toLowerCase())) {
    throw new Error("Select a valid admin role.");
  }

  if (authProvider !== "google") {
    validatePassword(password);
  } else if (String(password || "").trim()) {
    validatePassword(password);
  }
};
