import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

const SCRYPT_KEYLEN = 64;
const SALT_BYTES = 16;

export async function hashPassword(password: string) {
  const salt = randomBytes(SALT_BYTES).toString("base64url");
  const derived = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer;
  return `scrypt$${salt}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, salt, hash] = passwordHash.split("$");

  if (algorithm !== "scrypt" || !salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "base64url");
  const derived = (await scryptAsync(password, salt, expected.length)) as Buffer;

  if (expected.length !== derived.length) {
    return false;
  }

  return timingSafeEqual(expected, derived);
}
