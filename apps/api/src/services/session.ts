import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { verifyFirebaseToken } from './auth.js';

const scrypt = promisify(scryptCallback);
export type SessionUser = { id: string; name: string; email: string };
export type AuthRequest = Request & { user?: SessionUser };
const secret = () => process.env.JWT_SECRET || 'local-development-secret-change-me';

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}
export async function passwordMatches(password: string, stored: string) {
  const [salt, expected] = stored.split(':');
  if (!salt || !expected) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}
export function issueToken(user: SessionUser) { return jwt.sign(user, secret(), { expiresIn: '7d' }); }
export async function requireUser(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Please log in to continue.' });
  try { req.user = jwt.verify(token, secret()) as SessionUser; next(); }
  catch { try { const firebaseUser = await verifyFirebaseToken(token); if (!firebaseUser) throw new Error('Invalid Firebase token'); req.user = firebaseUser; next(); } catch { res.status(401).json({ error: 'Your session has expired. Please log in again.' }); } }
}
