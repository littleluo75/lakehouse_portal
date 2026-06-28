import { S3Client, ListBucketsCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const s3Client = new S3Client({
  endpoint: process.env.INTERNAL_MINIO_ENDPOINT,
  credentials: {
    accessKeyId: process.env.INTERNAL_MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.INTERNAL_MINIO_SECRET_KEY!,
  },
  region: 'us-east-1',
  forcePathStyle: true,
})

export async function listBuckets() {
  const cmd = new ListBucketsCommand({})
  return s3Client.send(cmd)
}

export async function listObjects(bucket: string, prefix?: string) {
  const cmd = new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, Delimiter: '/' })
  return s3Client.send(cmd)
}

export async function getDownloadUrl(
  bucket: string,
  key: string,
  expiresIn = 900, // default 15 phút
) {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key })
  return getSignedUrl(s3Client, cmd, { expiresIn })
}

export async function getMinioStats(): Promise<{ bucketCount: number }> {
  const { Buckets } = await listBuckets()
  return { bucketCount: Buckets?.length ?? 0 }
}
