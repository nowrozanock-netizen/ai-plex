import { describe, expect, it } from "vitest";
import { codeSchema, emailCodeRequest, signupSchema } from "./auth-validation";

describe("Email-code accounts", () => {
  it("accepts exactly six numeric digits, including leading zeroes", () => {
    expect(codeSchema.safeParse("012345").success).toBe(true);
    for (const code of ["12345", "1234567", "12345a", ""]) {
      expect(codeSchema.safeParse(code).success).toBe(false);
    }
  });
  it("requires a name and real email for signup", () => {
    expect(signupSchema.safeParse({ name: " ", email: "roza@example.com" }).success).toBe(false);
    expect(signupSchema.safeParse({ name: "Roza", email: "roza" }).success).toBe(false);
    expect(emailCodeRequest("signup", "roza@example.com", " Roza ")).toEqual({
      email: "roza@example.com", options: { shouldCreateUser: true, data: { name: "Roza" } },
    });
  });
  it("does not create accounts or overwrite names during login", () => {
    expect(emailCodeRequest("login", "roza@example.com", "")).toEqual({
      email: "roza@example.com", options: { shouldCreateUser: false },
    });
  });
});