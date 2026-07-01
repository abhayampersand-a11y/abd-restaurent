/**
 * Signed, unguessable table QR tokens.
 *
 * A token has the form `<rand>.<sig>` where:
 *   - `rand` is a 21-char url-safe nanoid (unguessable), stored in the DB.
 *   - `sig`  is a short HMAC-SHA256 of `rand` keyed by QR_SIGNING_SECRET,
 *     so a tampered/forged token is rejected before we even hit the DB.
 *
 * The full token is what lives in `tables.qr_token` and in the QR image URL:
 *   {NEXT_PUBLIC_APP_URL}/table/<token>
 */
import { createHmac } from "node:crypto";
import { customAlphabet } from "nanoid";

const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const nano = customAlphabet(ALPHABET, 21);

function secret(): string {
  return process.env.QR_SIGNING_SECRET ?? "dev-insecure-qr-secret";
}

function sign(rand: string): string {
  return createHmac("sha256", secret())
    .update(rand)
    .digest("base64url")
    .slice(0, 12);
}

/** Generate a fresh signed QR token for a new table. */
export function generateQrToken(): string {
  const rand = nano();
  return `${rand}.${sign(rand)}`;
}

/** Verify a token's signature (constant-ish time via string compare). */
export function verifyQrToken(token: string): boolean {
  const [rand, sig] = token.split(".");
  if (!rand || !sig) return false;
  return sign(rand) === sig;
}

/** Absolute public URL a customer lands on when scanning the table QR. */
export function tableUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/table/${token}`;
}
