/**
 * Pure validation and normalization utilities for authentication payloads.
 *
 * This module has no database or server-only imports so it is easily testable.
 */

const EMAIL_MAX_LENGTH = 254;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72;
const NAME_MAX_LENGTH = 100;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RegistrationInput {
  email: unknown;
  password: unknown;
  name: unknown;
}

interface ValidatedRegistration {
  email: string;
  password: string;
  name: string;
}

interface ValidationResult {
  success: true;
  data: ValidatedRegistration;
}

interface ValidationError {
  success: false;
  error: string;
}

export function validateRegistration(
  input: RegistrationInput,
): ValidationResult | ValidationError {
  const { email, password, name } = input;

  if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string") {
    return { success: false, error: "email, password, and name are required" };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();

  if (normalizedEmail.length === 0) {
    return { success: false, error: "email is required" };
  }

  if (normalizedEmail.length > EMAIL_MAX_LENGTH) {
    return { success: false, error: `email must not exceed ${EMAIL_MAX_LENGTH} characters` };
  }

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return { success: false, error: "email format is invalid" };
  }

  if (password.length === 0) {
    return { success: false, error: "password is required" };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return { success: false, error: `password must be at least ${PASSWORD_MIN_LENGTH} characters` };
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return { success: false, error: `password must not exceed ${PASSWORD_MAX_LENGTH} characters` };
  }

  if (trimmedName.length === 0) {
    return { success: false, error: "name is required" };
  }

  if (trimmedName.length > NAME_MAX_LENGTH) {
    return { success: false, error: `name must not exceed ${NAME_MAX_LENGTH} characters` };
  }

  return {
    success: true,
    data: {
      email: normalizedEmail,
      password,
      name: trimmedName,
    },
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
