// src/utils/crypto-migration.util.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const algorithm = 'aes-256-ctr';

export function encryptWithKey(text: string, masterKey: string): string {
  if (!text) return text;
  const iv = randomBytes(16);
  const cipher = createCipheriv(algorithm, masterKey, iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptWithKey(hash: string, masterKey: string): string {
  if (!hash || !hash.includes(':')) return hash;
  const [ivHex, contentHex] = hash.split(':');
  const decipher = createDecipheriv(
    algorithm,
    masterKey,
    Buffer.from(ivHex, 'hex'),
  );
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(contentHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString();
}
