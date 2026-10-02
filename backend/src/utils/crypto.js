import crypto from "node:crypto";

const master = () => {
  const key = Buffer.from(
    process.env.DATA_ENCRYPTION_KEY || "",
    "base64"
  );

  if (key.length !== 32) {
    throw new Error("DATA_ENCRYPTION_KEY must decode to 32 bytes");
  }

  return key;
};

export const createDataKey = () => crypto.randomBytes(32);

export function wrapDataKey(key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", master(), iv);

  const encrypted = Buffer.concat([
    cipher.update(key),
    cipher.final()
  ]);

  return Buffer.concat([
    iv,
    cipher.getAuthTag(),
    encrypted
  ]).toString("base64");
}

export function unwrapDataKey(value) {
  const buffer = Buffer.from(value, "base64");

  const iv = buffer.subarray(0, 12);
  const authTag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    master(),
    iv
  );

  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
}

export function encryptText(text, key) {
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    key,
    iv
  );

  // IMPORTANT:
  // finalize BEFORE calling getAuthTag()
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  return Buffer.concat([
    iv,
    authTag,
    encrypted
  ]).toString("base64");
}

export function decryptText(value, key) {
  const buffer = Buffer.from(value, "base64");

  const iv = buffer.subarray(0, 12);
  const authTag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    iv
  );

  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]).toString("utf8");
}

export function encryptBuffer(buffer, key) {
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    key,
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(buffer),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  return Buffer.concat([
    iv,
    authTag,
    encrypted
  ]);
}