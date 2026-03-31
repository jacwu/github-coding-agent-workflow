import { describe, it, expect } from "vitest";

import { validateRegistration, validateLoginCredentials, normalizeEmail } from "./auth-validation";

// ---------------------------------------------------------------------------
// normalizeEmail
// ---------------------------------------------------------------------------

describe("normalizeEmail", () => {
  it("converts to lowercase and trims", () => {
    expect(normalizeEmail("  Alice@Example.COM  ")).toBe("alice@example.com");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeEmail("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// validateRegistration
// ---------------------------------------------------------------------------

describe("validateRegistration", () => {
  const validInput = {
    email: "user@example.com",
    password: "securepassword",
    name: "Alice",
  };

  it("accepts a valid registration payload", () => {
    const result = validateRegistration(validInput);
    expect(result).toEqual({
      success: true,
      data: { email: "user@example.com", password: "securepassword", name: "Alice" },
    });
  });

  it("normalizes email to lowercase and trims whitespace", () => {
    const result = validateRegistration({
      ...validInput,
      email: "  USER@Example.COM  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@example.com");
    }
  });

  it("trims name whitespace", () => {
    const result = validateRegistration({
      ...validInput,
      name: "  Bob  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Bob");
    }
  });

  // ---- email validation ----

  it("rejects missing email (non-string)", () => {
    const result = validateRegistration({ ...validInput, email: undefined });
    expect(result).toEqual({ success: false, error: "email, password, and name are required" });
  });

  it("rejects empty email after trim", () => {
    const result = validateRegistration({ ...validInput, email: "   " });
    expect(result).toEqual({ success: false, error: "email is required" });
  });

  it("rejects invalid email format", () => {
    const result = validateRegistration({ ...validInput, email: "not-an-email" });
    expect(result).toEqual({ success: false, error: "email format is invalid" });
  });

  it("rejects email exceeding 254 characters", () => {
    const longEmail = "a".repeat(250) + "@b.co";
    const result = validateRegistration({ ...validInput, email: longEmail });
    expect(result).toEqual({ success: false, error: "email must not exceed 254 characters" });
  });

  // ---- password validation ----

  it("rejects missing password (non-string)", () => {
    const result = validateRegistration({ ...validInput, password: null });
    expect(result).toEqual({ success: false, error: "email, password, and name are required" });
  });

  it("rejects empty password", () => {
    const result = validateRegistration({ ...validInput, password: "" });
    expect(result).toEqual({ success: false, error: "password is required" });
  });

  it("rejects password shorter than 8 characters", () => {
    const result = validateRegistration({ ...validInput, password: "short" });
    expect(result).toEqual({ success: false, error: "password must be at least 8 characters" });
  });

  it("rejects password exceeding 72 characters", () => {
    const result = validateRegistration({ ...validInput, password: "a".repeat(73) });
    expect(result).toEqual({ success: false, error: "password must not exceed 72 characters" });
  });

  // ---- name validation ----

  it("rejects missing name (non-string)", () => {
    const result = validateRegistration({ ...validInput, name: 123 });
    expect(result).toEqual({ success: false, error: "email, password, and name are required" });
  });

  it("rejects empty name after trim", () => {
    const result = validateRegistration({ ...validInput, name: "   " });
    expect(result).toEqual({ success: false, error: "name is required" });
  });

  it("rejects name exceeding 100 characters", () => {
    const result = validateRegistration({ ...validInput, name: "a".repeat(101) });
    expect(result).toEqual({ success: false, error: "name must not exceed 100 characters" });
  });
});

describe("validateLoginCredentials", () => {
  it("accepts valid credentials and normalizes email", () => {
    expect(
      validateLoginCredentials({
        email: "  USER@Example.COM  ",
        password: "securepassword",
      }),
    ).toEqual({
      email: "user@example.com",
      password: "securepassword",
    });
  });

  it("returns null when credentials are missing", () => {
    expect(validateLoginCredentials({ email: undefined, password: "securepassword" })).toBeNull();
    expect(validateLoginCredentials({ email: "user@example.com", password: undefined })).toBeNull();
  });

  it("returns null for invalid email or out-of-bounds password", () => {
    expect(validateLoginCredentials({ email: "not-an-email", password: "securepassword" })).toBeNull();
    expect(validateLoginCredentials({ email: "user@example.com", password: "short" })).toBeNull();
    expect(validateLoginCredentials({ email: "user@example.com", password: "a".repeat(73) })).toBeNull();
  });
});
