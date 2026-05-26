import crypto from 'node:crypto';

const encryptedPrefix = 'enc:v1:';

const getRawKey = (): string => String(process.env.DATA_ENCRYPTION_KEY || '').trim();

const getKey = (): Buffer => crypto.createHash('sha256').update(getRawKey()).digest();

const hasEncryptionKey = (): boolean => getRawKey().length >= 32;

const encryptField = (value: string | null | undefined): string => {
  const plainText = String(value || '');

  if (!plainText || !hasEncryptionKey()) {
    return plainText;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    encryptedPrefix,
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url')
  ].join(':');
};

const decryptField = (value: string | null | undefined): string => {
  const encryptedValue = String(value || '');

  if (!encryptedValue.startsWith(encryptedPrefix)) {
    return encryptedValue;
  }

  if (!hasEncryptionKey()) {
    return '';
  }

  try {
    const [, , ivText, tagText, encryptedText] = encryptedValue.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivText, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagText, 'base64url'));

    return Buffer.concat([
      decipher.update(Buffer.from(encryptedText, 'base64url')),
      decipher.final()
    ]).toString('utf8');
  } catch (error) {
    return '';
  }
};

const normalizePhoneForHash = (value: string | null | undefined): string => String(value || '').replace(/\D/g, '');
const normalizeEmailForHash = (value: string | null | undefined): string => String(value || '').trim().toLowerCase();

const hashLookupValue = (value: string): string => {
  if (!value) {
    return '';
  }

  if (!hasEncryptionKey()) {
    return crypto.createHash('sha256').update(`dev:${value}`).digest('hex');
  }

  return crypto.createHmac('sha256', getKey()).update(value).digest('hex');
};

const contactEmailHash = (email: string | null | undefined): string => hashLookupValue(normalizeEmailForHash(email));
const contactPhoneHash = (phone: string | null | undefined): string => hashLookupValue(normalizePhoneForHash(phone));

const isEncryptedField = (value: string | null | undefined): boolean => String(value || '').startsWith(encryptedPrefix);

export {
  contactEmailHash,
  contactPhoneHash,
  decryptField,
  encryptField,
  hasEncryptionKey,
  isEncryptedField
};
