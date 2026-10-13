import fs from "fs";
import path from "path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from "@aws-sdk/client-s3";

export class StorageService {
  private uploadDir: string;
  private s3Client: S3Client | null = null;
  private bucket: string = "";
  private basePrefix: string = "library/proposals";

  constructor() {
    this.uploadDir = path.join(process.cwd(), "storage", "proposals");
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    this.initS3Client();
  }

  private initS3Client(): void {
    const rawEndpoint = process.env.ENDPOINT_URL || process.env.DAHONO_S3_ENDPOINT || process.env.S3_ENDPOINT;
    const accessKeyId = process.env.ACCESS_KEY || process.env.DAHONO_S3_ACCESS_KEY || process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.SECRET_KEY || process.env.DAHONO_S3_SECRET_KEY || process.env.S3_SECRET_ACCESS_KEY;

    let endpoint = rawEndpoint;
    let bucket = process.env.S3_BUCKET || process.env.DAHONO_S3_BUCKET || "bkt-2a45ca39de27ab13";

    if (rawEndpoint) {
      try {
        const url = new URL(rawEndpoint);
        endpoint = `${url.protocol}//${url.host}`;
        const pathPart = url.pathname.replace(/^\/+|\/+$/g, "");
        if (pathPart) {
          bucket = pathPart;
        }
      } catch {
        endpoint = rawEndpoint;
      }
    }

    this.bucket = bucket;

    if (endpoint && accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        endpoint,
        region: process.env.S3_REGION || process.env.DAHONO_S3_REGION || "us-east-1",
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: true,
      });
    } else {
      this.s3Client = null;
    }
  }

  public isS3Enabled(): boolean {
    this.initS3Client();
    return this.s3Client !== null;
  }

  public resolveKey(filename: string): string {
    const cleanFilename = path.basename(filename);
    return `${this.basePrefix}/${cleanFilename}`;
  }

  public isS3Key(target: string): boolean {
    return target.startsWith("library/") || target.startsWith("s3://");
  }

  /**
   * Menyimpan buffer PDF ke S3 atau local disk
   * Mengembalikan path lokal atau s3 key
   */
  async save(filename: string, buffer: Buffer): Promise<string> {
    if (this.isS3Enabled() && this.s3Client) {
      const key = this.resolveKey(filename);
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: "application/pdf",
        })
      );
      return key;
    }

    // Local disk fallback
    const localPath = path.join(this.uploadDir, path.basename(filename));
    await fs.promises.writeFile(localPath, buffer);
    return localPath;
  }

  /**
   * Membaca file PDF dari S3 atau local disk menjadi Buffer
   */
  async read(storageTarget: string): Promise<Buffer> {
    if (this.isS3Key(storageTarget)) {
      if (!this.isS3Enabled() || !this.s3Client) {
        throw new Error("S3 storage credentials are not configured");
      }
      const cleanKey = storageTarget.replace(/^s3:\/\/[^/]+\//, "");
      const res = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: cleanKey,
        })
      );
      const byteArray = await res.Body?.transformToByteArray();
      if (!byteArray) {
        throw new Error(`File not found in S3 storage: ${cleanKey}`);
      }
      return Buffer.from(byteArray);
    }

    // Local disk fallback
    if (!fs.existsSync(storageTarget)) {
      throw new Error(`File tidak ditemukan di server: ${storageTarget}`);
    }
    return await fs.promises.readFile(storageTarget);
  }

  /**
   * Menghapus file di S3 atau local disk
   */
  async delete(storageTarget: string): Promise<void> {
    if (this.isS3Key(storageTarget)) {
      if (this.isS3Enabled() && this.s3Client) {
        try {
          const cleanKey = storageTarget.replace(/^s3:\/\/[^/]+\//, "");
          await this.s3Client.send(
            new DeleteObjectCommand({
              Bucket: this.bucket,
              Key: cleanKey,
            })
          );
        } catch (e) {
          console.error("Gagal menghapus objek S3:", e);
        }
      }
      return;
    }

    // Local disk fallback
    if (fs.existsSync(storageTarget)) {
      try {
        await fs.promises.unlink(storageTarget);
      } catch (e) {
        console.error("Gagal menghapus file lokal:", e);
      }
    }
  }
}

export const storageService = new StorageService();
