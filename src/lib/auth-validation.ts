import { z } from "zod";

export const emailSchema = z.string().trim().email("Enter a valid email address.").max(254);
export const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100, "Use 100 characters or fewer."),
  email: emailSchema,
});
export const codeSchema = z.string().regex(/^\d{6}$/, "Enter the six-digit code from your email.");

export function emailCodeRequest(mode: "signup" | "login", email: string, name: string) {
  const validEmail = emailSchema.parse(email);
  const profile = mode === "signup" ? signupSchema.parse({ email, name }) : null;
  return {
    email: validEmail,
    options: {
      shouldCreateUser: mode === "signup",
      ...(profile ? { data: { name: profile.name } } : {}),
    },
  };
}