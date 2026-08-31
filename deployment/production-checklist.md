# Production launch checklist

## API on Render

Create a Render Web Service from this repository using `render.yaml`. Add `CLIENT_ORIGIN` as the Vercel URL after deploying the frontend. Copy all non-empty values from `apps/api/.env` into Render's Environment page; never commit that file.

Required: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`, and one AI provider key.

Optional: AWS S3 credentials and Firebase Admin service-account values.

## Frontend on Vercel

Import the same repository, use `apps/web` as the root directory, and add all `VITE_*` values from `apps/web/.env`. Set `VITE_API_URL` to the HTTPS Render URL.

## Google login after deployment

Add the Vercel domain (without a trailing slash) to Firebase Authentication's Authorized domains and to the OAuth client's Authorized JavaScript origins, for example `https://your-project.vercel.app`.

## AWS S3 and CloudWatch

Create a private bucket, set `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` on the API host, and limit the IAM policy to `s3:PutObject` for `reports/*`. For EC2, install the CloudWatch agent and use `deployment/cloudwatch-agent.json` after routing structured API logs to `/var/log/veritas/api.log`.
