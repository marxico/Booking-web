import type {
  BookingFieldErrors,
  BookingFieldName,
  BookingFormData
} from "../types/booking";

const emailPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
const namePattern = /^[A-Za-zÀ-ÿ0-9 .,'-]{2,80}$/;
const phonePattern = /^\+?[0-9().\-\s]{10,20}$/;

export const sanitizePhoneInput = (phone: string) => {
  const raw = String(phone || "");
  let sanitized = raw.replace(/[^\d()+.\-\s]/g, "");

  if (sanitized.includes("+")) {
    sanitized = sanitized.startsWith("+")
      ? `+${sanitized.slice(1).replace(/\+/g, "")}`
      : sanitized.replace(/\+/g, "");
  }

  return sanitized.slice(0, 20);
};

const validateEmail = (email: string) => {
  const normalized = String(email || "").trim().toLowerCase();

  if (!normalized || normalized.includes("..") || !emailPattern.test(normalized)) {
    throw new Error("Enter a valid email address.");
  }
};

const validatePhone = (phone: string) => {
  const rawPhone = sanitizePhoneInput(phone).trim();
  const digits = String(phone || "").replace(/\D/g, "");

  if (!rawPhone || !phonePattern.test(rawPhone) || digits.length < 10 || digits.length > 15 || /^(\d)\1+$/.test(digits)) {
    throw new Error("Enter a valid phone number with at least 10 digits.");
  }
};

export const validateBookingFormData = (formData: BookingFormData) => {
  const name = String(formData.name || "").trim();

  if (!namePattern.test(name)) {
    throw new Error("Enter a valid name using 2 to 80 characters.");
  }

  validatePhone(formData.phone);
  validateEmail(formData.email);

  if (String(formData.vehicle || "").trim().length < 3) {
    throw new Error("Enter the vehicle year, make, and model.");
  }

  if (!String(formData.service || "").trim()) {
    throw new Error("Choose a service.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(formData.date || ""))) {
    throw new Error("Select a valid appointment date.");
  }

  if (!String(formData.time || "").trim()) {
    throw new Error("Select an appointment time.");
  }
};

export const getBookingFieldError = (fieldName: BookingFieldName, formData: BookingFormData) => {
  try {
    if (fieldName === "name") {
      const name = String(formData.name || "").trim();

      if (!namePattern.test(name)) {
        return "Enter a valid name using 2 to 80 characters.";
      }
    }

    if (fieldName === "phone") {
      validatePhone(formData.phone);
    }

    if (fieldName === "email") {
      validateEmail(formData.email);
    }

    if (fieldName === "vehicle" && String(formData.vehicle || "").trim().length < 3) {
      return "Enter the vehicle year, make, and model.";
    }

    if (fieldName === "service" && !String(formData.service || "").trim()) {
      return "Choose a service.";
    }

    if (fieldName === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(String(formData.date || ""))) {
      return "Select a valid appointment date.";
    }

    if (fieldName === "time" && !String(formData.time || "").trim()) {
      return "Select an appointment time.";
    }

    return "";
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid value.";
  }
};

export const getBookingFormErrors = (formData: BookingFormData): BookingFieldErrors => {
  const fields: BookingFieldName[] = ["name", "phone", "email", "vehicle", "service", "date", "time"];

  return fields.reduce<BookingFieldErrors>((errors, fieldName) => {
    const error = getBookingFieldError(fieldName, formData);

    if (error) {
      errors[fieldName] = error;
    }

    return errors;
  }, {});
};
