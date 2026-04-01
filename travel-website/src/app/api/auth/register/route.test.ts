import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock auth-service
vi.mock("@/lib/auth-service", () => ({
  createUser: vi.fn(),
  findUserByEmail: vi.fn(),
}));

const { createUser, findUserByEmail } = await import("@/lib/auth-service");
const { POST } = await import("./route");

const mockCreateUser = vi.mocked(createUser);
const mockFindUserByEmail = vi.mocked(findUserByEmail);

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 201 with user data on success", async () => {
    mockFindUserByEmail.mockResolvedValue(null);
    mockCreateUser.mockResolvedValue({
      id: 1,
      email: "test@example.com",
      name: "Test",
      avatarUrl: null,
      createdAt: "2026-01-01",
    });

    const res = await POST(
      makeRequest({
        email: "test@example.com",
        password: "password123",
        name: "Test",
      })
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toEqual({ id: 1, email: "test@example.com", name: "Test" });
  });

  it("returns 409 when email is already in use", async () => {
    mockFindUserByEmail.mockResolvedValue({
      id: 1,
      email: "dup@example.com",
      name: "Dup",
      passwordHash: "hash",
      avatarUrl: null,
      createdAt: "2026-01-01",
    });

    const res = await POST(
      makeRequest({
        email: "dup@example.com",
        password: "password123",
        name: "Dup",
      })
    );

    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe("Email already in use");
  });

  it("returns 400 when fields are missing", async () => {
    const res = await POST(makeRequest({ email: "a@b.com" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when fields are empty strings", async () => {
    const res = await POST(
      makeRequest({ email: "", password: "password123", name: "Test" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email format", async () => {
    const res = await POST(
      makeRequest({ email: "not-email", password: "password123", name: "Test" })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid email format");
  });

  it("returns 400 for password shorter than 8 characters", async () => {
    const res = await POST(
      makeRequest({ email: "a@b.com", password: "short", name: "Test" })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("at least 8 characters");
  });

  it("returns 500 on unexpected error", async () => {
    mockFindUserByEmail.mockRejectedValue(new Error("DB error"));

    const res = await POST(
      makeRequest({
        email: "fail@example.com",
        password: "password123",
        name: "Fail",
      })
    );

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Internal server error");
  });
});
