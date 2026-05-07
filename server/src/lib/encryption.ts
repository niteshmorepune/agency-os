import CryptoJS from 'crypto-js';

function getKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) throw new Error('ENCRYPTION_KEY must be at least 32 characters');
  return key;
}

export function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, getKey()).toString();
}

export function decrypt(cipherText: string): string {
  const bytes = CryptoJS.AES.decrypt(cipherText, getKey());
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function isEncrypted(value: string): boolean {
  return value.startsWith('U2FsdGVk');
}
