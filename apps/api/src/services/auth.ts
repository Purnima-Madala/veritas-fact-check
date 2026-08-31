import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { Request, Response, NextFunction } from 'express';

export function firebaseEnabled() { return Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY); }
export async function verifyFirebaseToken(token: string) {
  if (!firebaseEnabled()) return null;
  if (!getApps().length) initializeApp({ credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') }) });
  const decoded = await getAuth().verifyIdToken(token);
  return { id: decoded.uid, name: decoded.name || decoded.email?.split('@')[0] || 'Firebase user', email: decoded.email || '' };
}
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  if (process.env.REQUIRE_AUTH !== 'true') return next();
  if (!firebaseEnabled()) return res.status(503).json({ error: 'Authentication is required but Firebase Admin is not configured.' });
  try { if (!getApps().length) initializeApp({ credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') }) }); const token = req.headers.authorization?.replace(/^Bearer\s+/i, ''); if (!token) return res.status(401).json({ error: 'Sign in is required.' }); await getAuth().verifyIdToken(token); next(); } catch { res.status(401).json({ error: 'Your session could not be verified.' }); }
}
