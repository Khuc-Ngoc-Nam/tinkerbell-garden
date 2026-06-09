const crypto = require('crypto');

const DEFAULT_ITERATIONS = 120000;
const TOKEN_TTL_SECONDS = Number(process.env.TOKEN_TTL_SECONDS || 60 * 60 * 12);

function base64Url(input) {
  return Buffer.from(input).toString('base64url');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, DEFAULT_ITERATIONS, 32, 'sha256')
    .toString('hex');
  return `pbkdf2$${DEFAULT_ITERATIONS}$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;

  const parts = String(storedHash).split('$');
  if (parts[0] !== 'pbkdf2' || parts.length !== 4) {
    const input = Buffer.from(password);
    const expectedLegacy = Buffer.from(storedHash);
    return input.length === expectedLegacy.length && crypto.timingSafeEqual(input, expectedLegacy);
  }

  const [, iterations, salt, expected] = parts;
  const actual = crypto
    .pbkdf2Sync(password, salt, Number(iterations), 32, 'sha256')
    .toString('hex');

  const actualBuffer = Buffer.from(actual, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function signToken(payload, ttlSeconds = TOKEN_TTL_SECONDS) {
  const secret = process.env.JWT_SECRET || 'change-this-secret-before-production';
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedBody = base64Url(JSON.stringify(body));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedBody}`)
    .digest('base64url');
  return `${encodedHeader}.${encodedBody}.${signature}`;
}

function verifyToken(token) {
  const secret = process.env.JWT_SECRET || 'change-this-secret-before-production';
  const [encodedHeader, encodedBody, signature] = String(token || '').split('.');
  if (!encodedHeader || !encodedBody || !signature) return null;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedBody}`)
    .digest('base64url');

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(encodedBody, 'base64url').toString('utf8'));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function generatePublicCode(prefix) {
  const random = crypto.randomBytes(5).toString('hex').toUpperCase();
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${random}`;
}

module.exports = {
  generatePublicCode,
  hashPassword,
  signToken,
  verifyPassword,
  verifyToken,
};
