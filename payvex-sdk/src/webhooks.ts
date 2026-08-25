import type { PayvexHeaders, PayvexWebhookEvent } from "./types";

export interface VerifyWebhookOptions {
  rawBody: string;
  headers: PayvexHeaders;
  webhookSecret: string;
  toleranceMs?: number;
}

export interface SignWebhookOptions {
  rawBody: string;
  webhookSecret: string;
  timestamp?: number;
}

const DEFAULT_TOLERANCE_MS = 5 * 60 * 1000;

export async function signPayvexWebhook({
  rawBody,
  webhookSecret,
  timestamp = Date.now(),
}: SignWebhookOptions) {
  const signature = await createHmac(`${timestamp}.${rawBody}`, webhookSecret);

  return {
    timestamp,
    signature: `sha256=${signature}`,
  };
}

export async function verifyPayvexWebhook<TData = Record<string, unknown>>({
  rawBody,
  headers,
  webhookSecret,
  toleranceMs = DEFAULT_TOLERANCE_MS,
}: VerifyWebhookOptions): Promise<PayvexWebhookEvent<TData>> {
  const timestampHeader = getHeader(headers, "x-payvex-timestamp");
  const signatureHeader = getHeader(headers, "x-payvex-signature");

  if (!timestampHeader || !signatureHeader) {
    throw new Error("Headers X-Payvex-Timestamp e X-Payvex-Signature sao obrigatorios.");
  }

  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp)) {
    throw new Error("Header X-Payvex-Timestamp invalido.");
  }

  if (Math.abs(Date.now() - timestamp) > toleranceMs) {
    throw new Error("Webhook Payvex expirado.");
  }

  const expected = await createHmac(`${timestamp}.${rawBody}`, webhookSecret);
  const received = signatureHeader.replace(/^sha256=/i, "");

  if (!timingSafeEqualHex(expected, received)) {
    throw new Error("Assinatura Payvex invalida.");
  }

  return JSON.parse(rawBody) as PayvexWebhookEvent<TData>;
}

function getHeader(headers: PayvexHeaders, key: string) {
  if (headers instanceof Headers) {
    return headers.get(key) || undefined;
  }

  const foundKey = Object.keys(headers).find(
    (candidate) => candidate.toLowerCase() === key.toLowerCase(),
  );
  const value = foundKey ? headers[foundKey] : undefined;

  return Array.isArray(value) ? value[0] : value;
}

async function createHmac(message: string, secret: string) {
  const cryptoImpl = globalThis.crypto?.subtle;

  if (!cryptoImpl) {
    throw new Error("Web Crypto API indisponivel neste runtime.");
  }

  const encoder = new TextEncoder();
  const key = await cryptoImpl.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await cryptoImpl.sign("HMAC", key, encoder.encode(message));

  return toHex(new Uint8Array(signature));
}

function toHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualHex(left: string, right: string) {
  const leftBytes = hexToBytes(left);
  const rightBytes = hexToBytes(right);

  if (leftBytes.length !== rightBytes.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    diff |= leftBytes[index] ^ rightBytes[index];
  }

  return diff === 0;
}

function hexToBytes(hex: string) {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) {
    return new Uint8Array();
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}
