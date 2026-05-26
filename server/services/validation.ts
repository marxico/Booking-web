import type { AdminRole, AppError, BookingRequest } from '../types';

const emailPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
const usernamePattern = /^[a-z0-9._-]{3,32}$/i;
const allowedNamePattern = /^[A-Za-zÀ-ÿ0-9 .,'-]{2,80}$/;
const phonePattern = /^\+?[0-9()\-.\s]{10,20}$/;
const vehiclePattern = /^[A-Za-z0-9 .,'&()/-]{3,100}$/;
const validRoles = new Set<AdminRole>(['super_admin', 'manager', 'analyst', 'viewer']);
const allowedBookingServices = new Set(['Brakes', 'Battery', 'Oil Change', 'Diagnostics', 'Roadside']);

const createValidationError = (message: string): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = 400;
  return error;
};

const isValidEmail = (value: string): boolean => {
  const email = String(value || '').trim().toLowerCase();

  if (!email || email.length > 120 || email.includes('..')) {
    return false;
  }

  return emailPattern.test(email);
};

const normalizePhoneDigits = (value: string): string => String(value || '').replace(/\D/g, '');

const isValidPhone = (value: string): boolean => {
  const rawPhone = String(value || '').trim();
  const digits = normalizePhoneDigits(rawPhone);

  if (!rawPhone || !phonePattern.test(rawPhone)) {
    return false;
  }

  if (digits.length < 10 || digits.length > 15) {
    return false;
  }

  if (/^(\d)\1+$/.test(digits)) {
    return false;
  }

  return true;
};

const validateAppointmentDate = (value: string): string => {
  const date = String(value || '').trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw createValidationError('Enter a valid appointment date.');
  }

  const selectedDate = new Date(`${date}T00:00:00.000Z`);
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const maxDate = new Date(todayUtc);
  maxDate.setUTCDate(maxDate.getUTCDate() + 90);

  if (Number.isNaN(selectedDate.getTime()) || selectedDate < todayUtc || selectedDate > maxDate) {
    throw createValidationError('Choose an appointment date within the next 90 days.');
  }

  return date;
};

const validateBookingPayloadStrict = (payload: BookingRequest): {
  name: string;
  phone: string;
  email: string;
  vehicle: string;
  service: string;
  date: string;
  time: string;
} => {
  const name = String(payload.name || '').trim();
  const phone = String(payload.phone || '').trim();
  const email = String(payload.email || '').trim().toLowerCase();
  const vehicle = String(payload.vehicle || '').trim();
  const service = String(payload.service || '').trim();
  const date = String(payload.date || '').trim();
  const time = String(payload.time || '').trim();

  if (String(payload.company || '').trim()) {
    throw createValidationError('Booking request could not be accepted.');
  }

  if (!name || !phone || !email || !vehicle || !service || !date || !time) {
    throw createValidationError('All booking fields are required');
  }

  if (!allowedNamePattern.test(name)) {
    throw createValidationError('Enter a valid name using 2 to 80 characters.');
  }

  if (!isValidPhone(phone)) {
    throw createValidationError('Enter a valid phone number with at least 10 digits.');
  }

  if (!isValidEmail(email)) {
    throw createValidationError('Enter a valid email address.');
  }

  if (!vehiclePattern.test(vehicle)) {
    throw createValidationError('Enter the vehicle year, make, and model.');
  }

  if (!allowedBookingServices.has(service)) {
    throw createValidationError('Choose a valid service.');
  }

  validateAppointmentDate(date);

  return { name, phone, email, vehicle, service, date, time };
};

const validateAdminIdentifier = (value: string): string => {
  const identifier = String(value || '').trim().toLowerCase();

  if (!identifier) {
    throw createValidationError('Username or email is required.');
  }

  if (identifier.includes('@')) {
    if (!isValidEmail(identifier)) {
      throw createValidationError('Enter a valid email address.');
    }

    return identifier;
  }

  if (!usernamePattern.test(identifier)) {
    throw createValidationError('Username must be 3 to 32 characters and use only letters, numbers, dots, dashes, or underscores.');
  }

  return identifier;
};

const validatePassword = (value: string, label = 'Password'): string => {
  const password = String(value || '');

  if (password.trim().length < 8 || password.length > 128) {
    throw createValidationError(`${label} must be between 8 and 128 characters.`);
  }

  return password;
};

const validateLoginPassword = (value: string): string => {
  const password = String(value || '');

  if (!password.trim() || password.length > 128) {
    throw createValidationError('Password is required.');
  }

  return password;
};

const validateAdminProfileInput = ({
  username,
  email,
  displayName,
  password,
  role,
  requirePassword = true
}: {
  username: string;
  email: string;
  displayName: string;
  password?: string;
  role: string;
  requirePassword?: boolean;
}) => {
  const normalizedUsername = String(username || '').trim().toLowerCase();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedDisplayName = String(displayName || '').trim();
  const normalizedRole = String(role || '').trim().toLowerCase() as AdminRole;

  if (!usernamePattern.test(normalizedUsername)) {
    throw createValidationError('Username must be 3 to 32 characters and use only letters, numbers, dots, dashes, or underscores.');
  }

  if (!isValidEmail(normalizedEmail)) {
    throw createValidationError('Enter a valid email address.');
  }

  if (!allowedNamePattern.test(normalizedDisplayName)) {
    throw createValidationError('Display name must be between 2 and 80 valid characters.');
  }

  if (!validRoles.has(normalizedRole)) {
    throw createValidationError('Select a valid admin role.');
  }

  if (requirePassword) {
    validatePassword(password || '');
  } else if (String(password || '').trim()) {
    validatePassword(password || '');
  }

  return {
    username: normalizedUsername,
    email: normalizedEmail,
    displayName: normalizedDisplayName,
    role: normalizedRole
  };
};

export {
  isValidEmail,
  isValidPhone,
  normalizePhoneDigits,
  validateAppointmentDate,
  validateAdminIdentifier,
  validateAdminProfileInput,
  validateBookingPayloadStrict,
  validateLoginPassword,
  validatePassword
};
