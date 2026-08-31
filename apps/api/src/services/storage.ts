import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export async function archiveReport(pdf: Buffer): Promise<string | null> {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket || !process.env.AWS_REGION) return null;
  const key = `reports/veritas-${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`;
  const client = new S3Client({ region: process.env.AWS_REGION });
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: pdf, ContentType: 'application/pdf', ServerSideEncryption: 'AES256' }));
  return key;
}
