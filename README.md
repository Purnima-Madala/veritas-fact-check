# Veritas — AI Fact Check Lab

A full-stack, cloud-ready fact-checking workspace that compares answers from multiple LLMs, produces a transparent truth recommendation, and keeps a searchable audit trail.

## Quick start

1. Copy `apps/api/.env.example` to `apps/api/.env` and add at least one provider key (or run without keys for demo responses).
2. Create a free MongoDB Atlas database, then add its connection string as `MONGODB_URI` in `apps/api/.env`. Authentication and saved per-user history require this.
3. Set `JWT_SECRET` to a long private random value.
4. Run `npm install` then `npm run dev`.
5. Open `http://localhost:5173`, choose **Log in**, and create an account.

## Cloud architecture

```text
Vercel (React client) → Render/AWS (Express API) → MongoDB Atlas
                                      ├─ OpenAI / Gemini / Claude / NVIDIA NIM
                                      └─ AWS S3 (optional PDF archive)
Firebase Authentication can be enforced by setting `REQUIRE_AUTH=true` and Firebase Admin environment variables. The client can send a Firebase ID token as `Authorization: Bearer <token>`; unauthenticated local development remains the default.
```

## Deploy

- **Vercel:** import this repository and set the root directory to `apps/web`. Set `VITE_API_URL` to the public API URL. `apps/web/vercel.json` supplies the Vite build configuration.
- **Render:** create a Web Service from this repository, use `npm install` for build and `npm run build && npm run start` for start. Add variables from `apps/api/.env.example`.
- **MongoDB Atlas:** create a cluster, allow the backend's outbound IP access, and set `MONGODB_URI`.
- **S3:** create a private bucket and give the backend `s3:PutObject`; set the four S3 variables. Every downloaded report is archived with SSE-S3 when configured; reports still download directly if S3 is disabled.
- **Monitoring:** `/api/health` is ready for Render health checks, AWS load balancer health checks, or CloudWatch Synthetics. API requests are emitted as JSON logs, ready for CloudWatch Logs.
- **Docker / EC2:** run `docker compose up --build` after configuring `apps/api/.env`. On EC2, allow inbound traffic only to the reverse proxy/load balancer and keep port 8080 private.

Provider keys must only live in the backend environment—never in Vite variables or browser code. The OpenAI adapter uses the server-side Responses API pattern described in the [official OpenAI documentation](https://developers.openai.com/api/reference/typescript/resources/beta/subresources/responses/methods/create).

## Accounts and history

The built-in account system uses email/password credentials hashed with Node's scrypt algorithm and a seven-day signed server session. Each saved fact check is linked to the signed-in user's database ID, so `/api/history` returns only that person's results. For deployment, set a unique `JWT_SECRET` in Render or AWS environment variables and keep `MONGODB_URI` private.

Firebase Authentication is supported for mobile or Google-sign-in clients: set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` on the backend. The API accepts verified Firebase ID tokens as bearer tokens alongside the built-in web login. The AWS CloudWatch agent example is in `deployment/cloudwatch-agent.json`.
