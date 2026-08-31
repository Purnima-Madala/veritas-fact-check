declare global { interface Window { google?: { accounts: { id: { initialize: (settings: { client_id: string; callback: (result: { credential: string }) => void }) => void; prompt: () => void } } } } }

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
let loaded: Promise<void> | undefined;
function loadGoogle() { if (window.google) return Promise.resolve(); if (!loaded) loaded = new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.onload = () => resolve(); script.onerror = () => reject(new Error('Google sign-in could not load.')); document.head.appendChild(script); }); return loaded; }

export async function signInWithGoogle() {
  if (!apiKey || !clientId) throw new Error('Google sign-in is not configured yet. Add VITE_FIREBASE_API_KEY and VITE_GOOGLE_CLIENT_ID to apps/web/.env.');
  await loadGoogle();
  const credential = await new Promise<string>((resolve) => { window.google!.accounts.id.initialize({ client_id: clientId, callback: ({ credential }) => resolve(credential) }); window.google!.accounts.id.prompt(); });
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postBody: `id_token=${encodeURIComponent(credential)}&providerId=google.com`, requestUri: window.location.origin, returnSecureToken: true, returnIdpCredential: true }) });
  const data = await response.json() as { idToken?: string; localId?: string; displayName?: string; email?: string; error?: { message?: string } };
  if (!response.ok || !data.idToken) throw new Error(data.error?.message || 'Google sign-in could not be completed.');
  return { token: data.idToken, user: { id: data.localId || '', name: data.displayName || data.email?.split('@')[0] || 'Google user', email: data.email || '' } };
}
