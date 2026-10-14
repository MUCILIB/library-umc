import dotenv from "dotenv";
dotenv.config();

import { S3Client, ListBucketsCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

async function testS3() {
  console.log("Testing Dahono S3 Configuration...");
  const rawEndpoint = process.env.ENDPOINT_URL || "";
  console.log("Raw ENDPOINT_URL:", rawEndpoint);
  console.log("ACCESS_KEY:", process.env.ACCESS_KEY ? "Present" : "Missing");
  console.log("SECRET_KEY:", process.env.SECRET_KEY ? "Present" : "Missing");

  // Periksa apakah ENDPOINT_URL menyertakan nama bucket di path (misal: https://s3.dahono.com/bkt-...)
  let endpoint = "https://s3.dahono.com";
  let bucket = process.env.S3_BUCKET || "bkt-2a45ca39de27ab13";

  if (rawEndpoint.includes("s3.dahono.com")) {
    const url = new URL(rawEndpoint);
    endpoint = `${url.protocol}//${url.host}`;
    const pathPart = url.pathname.replace(/^\/+|\/+$/g, "");
    if (pathPart) {
      bucket = pathPart;
    }
  }

  console.log("Parsed Endpoint Base:", endpoint);
  console.log("Parsed Bucket Target:", bucket);

  const client = new S3Client({
    endpoint,
    region: process.env.S3_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.ACCESS_KEY || "",
      secretAccessKey: process.env.SECRET_KEY || "",
    },
    forcePathStyle: true,
  });

  const testKey = `library/test-connectivity-${Date.now()}.txt`;
  const testContent = `Halo dari UMC Library Test S3 pada ${new Date().toISOString()}`;

  try {
    console.log(`\n1. Mengupload file dummy ke '${testKey}' di bucket '${bucket}'...`);
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: testKey,
      Body: Buffer.from(testContent),
      ContentType: "text/plain",
    }));
    console.log("✅ UPLOAD BERHASIL!");

    console.log(`\n2. Membaca kembali isi file '${testKey}' dari S3...`);
    const getRes = await client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: testKey,
    }));
    const readBytes = await getRes.Body?.transformToByteArray();
    const readText = readBytes ? Buffer.from(readBytes).toString("utf-8") : "";
    console.log("✅ BACA BERHASIL! Isi file:", readText);

    console.log(`\n3. Menghapus file uji coba '${testKey}'...`);
    await client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: testKey,
    }));
    console.log("✅ HAPUS FILE UJI COBA BERHASIL!");

    console.log("\n🎉 KESIMPULAN: Kredensial dan koneksi Dahono S3 100% VALID dan SIAP DIGUNAKAN!");
  } catch (err: any) {
    console.error("❌ GAGAL PADA OPERASI S3:", err.message || err);
    if (err.$response) {
      console.error("HTTP Status:", err.$response.statusCode);
    }
  }
}

testS3();
