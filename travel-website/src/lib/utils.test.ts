import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn utility", () => {
  it("merges class names", () => {
    const result = cn("px-4", "py-2");
    expect(result).toBe("px-4 py-2");
  });

  it("handles conditional classes", () => {
    const result = cn("base", false && "hidden", "visible");
    expect(result).toBe("base visible");
  });

  it("resolves Tailwind conflicts by keeping the last class", () => {
    const result = cn("px-4", "px-6");
    expect(result).toBe("px-6");
  });

  it("handles empty inputs", () => {
    const result = cn();
    expect(result).toBe("");
  });
});
