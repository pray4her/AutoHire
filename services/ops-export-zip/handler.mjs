/**
 * AutoHire ops expert-files ZIP packager for Alibaba Cloud Function Compute.
 *
 * Expected env:
 *   OPS_EXPORT_CALLBACK_SECRET  (required for callback auth)
 *   OSS_BUCKET                  (default: hirebucket)
 *   OSS_REGION                  (default: cn-wuhan-lr) — used as oss-<region> if no endpoint
 *   OSS_ENDPOINT                (default: https://oss-cn-wuhan-lr.aliyuncs.com)
 *
 * Credentials: FC instance role injects
 *   ALIBABA_CLOUD_ACCESS_KEY_ID / ALIBABA_CLOUD_ACCESS_KEY_SECRET / ALIBABA_CLOUD_SECURITY_TOKEN
 */
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

import OSS from "ali-oss";
import archiver from "archiver";

const DEFAULT_BUCKET = "hirebucket";
const DEFAULT_ENDPOINT = "https://oss-cn-wuhan-lr.aliyuncs.com";
const DEFAULT_REGION = "cn-wuhan-lr";

export async function handler(event, context) {
  const request = normalizeRequest(event);
  const authHeader =
    getHeader(request.headers, "authorization") ||
    getHeader(request.headers, "Authorization");
  const expectedSecret = process.env.OPS_EXPORT_CALLBACK_SECRET || "";

  if (expectedSecret && !bearerMatches(authHeader, expectedSecret)) {
    return httpResponse(401, {
      error: "Unauthorized",
      code: "OPS_EXPORT_FC_UNAUTHORIZED",
    });
  }

  let body;
  try {
    body = parseJsonBody(request.body, request.isBase64Encoded);
  } catch (error) {
    return httpResponse(400, {
      error: error instanceof Error ? error.message : "Invalid JSON body",
      code: "OPS_EXPORT_FC_BAD_REQUEST",
    });
  }

  const jobId = String(body.jobId || "").trim();
  const bucket = String(body.bucket || process.env.OSS_BUCKET || DEFAULT_BUCKET);
  const entriesObjectKey = String(body.entriesObjectKey || "").trim();
  const outputObjectKey = String(body.outputObjectKey || "").trim();
  const callbackUrl = String(body.callbackUrl || "").trim();

  if (!jobId || !entriesObjectKey || !outputObjectKey) {
    return httpResponse(400, {
      error: "jobId, entriesObjectKey and outputObjectKey are required.",
      code: "OPS_EXPORT_FC_BAD_REQUEST",
    });
  }

  const requestId =
    context?.requestId ||
    getHeader(request.headers, "x-fc-request-id") ||
    jobId;

  // For Async HTTP invoke, FC returns 202 to the caller; this handler still
  // runs to completion and must finish packing + callback before exiting.
  try {
    const result = await packAndUpload({
      jobId,
      bucket,
      entriesObjectKey,
      outputObjectKey,
      requestId,
    });

    await postCallback(callbackUrl, expectedSecret, {
      status: result.missing.length ? "SUCCEEDED_WITH_GAPS" : "SUCCEEDED",
      outputObjectKey,
      zipFileSize: result.zipFileSize,
      missingCount: result.missing.length,
      missingSummary: result.missing,
    });

    return httpResponse(202, {
      accepted: true,
      jobId,
      outputObjectKey,
      zipFileSize: result.zipFileSize,
      missingCount: result.missing.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ jobId, requestId, error: message }));

    await postCallback(callbackUrl, expectedSecret, {
      status: "FAILED",
      errorMessage: message,
    }).catch((callbackError) => {
      console.error("callback failed", callbackError);
    });

    return httpResponse(500, {
      error: message,
      code: "OPS_EXPORT_FC_FAILED",
      jobId,
    });
  }
}

async function packAndUpload(input) {
  const client = createOssClient(input.bucket);
  const entriesDoc = await readJsonObject(client, input.entriesObjectKey);
  const entries = Array.isArray(entriesDoc.entries) ? entriesDoc.entries : [];
  const experts = Array.isArray(entriesDoc.experts) ? entriesDoc.experts : [];
  const materialFolders = Array.isArray(entriesDoc.materialFolders)
    ? entriesDoc.materialFolders
    : [];

  const tmpDir = path.join("/tmp", "ops-export", input.jobId);
  const zipPath = path.join(tmpDir, "export.zip");
  await mkdir(tmpDir, { recursive: true });

  const missing = [];

  try {
    await writeZipFile({
      zipPath,
      client,
      entries,
      experts,
      materialFolders,
      missing,
    });

    const fileStat = await stat(zipPath);
    await client.multipartUpload(input.outputObjectKey, zipPath, {
      timeout: 600_000,
      partSize: 2 * 1024 * 1024,
      meta: {
        jobId: input.jobId,
        requestId: input.requestId,
      },
    });

    return {
      zipFileSize: fileStat.size,
      missing,
    };
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function writeZipFile(input) {
  const output = createWriteStream(input.zipPath);
  const archive = archiver("zip", {
    zlib: { level: 5 },
    forceLocalTime: true,
  });

  archive.on("warning", (error) => {
    console.warn("archiver warning", error);
  });

  const done = pipeline(archive, output);
  const presentFolderKeys = new Set();

  for (const entry of input.entries) {
    const objectKey = String(entry?.objectKey || "").trim();
    const archivePath = normalizeArchivePath(entry?.archivePath);
    if (!objectKey || !archivePath) {
      continue;
    }

    try {
      const object = await input.client.get(objectKey);
      const content = toBuffer(object.content);
      archive.append(content, { name: archivePath });
      rememberMaterialFolder(presentFolderKeys, archivePath);
    } catch (error) {
      input.missing.push({
        objectKey,
        archivePath,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const expert of input.experts) {
    const customerNo = String(expert?.customerNo || "").trim();
    if (!customerNo) {
      continue;
    }

    for (const folder of input.materialFolders) {
      const folderName = String(folder || "").trim();
      if (!folderName) {
        continue;
      }
      const folderKey = `${customerNo}/materials/${folderName}`;
      if (presentFolderKeys.has(folderKey)) {
        continue;
      }
      archive.append(Buffer.alloc(0), {
        name: `${folderKey}/.keep`,
      });
    }
  }

  await archive.finalize();
  await done;
}

function rememberMaterialFolder(presentFolderKeys, archivePath) {
  const parts = archivePath.split("/");
  // {customerNo}/materials/{folder}/...
  if (parts.length >= 3 && parts[1] === "materials") {
    presentFolderKeys.add(`${parts[0]}/materials/${parts[2]}`);
  }
}

function normalizeArchivePath(value) {
  return String(value || "")
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
    .trim();
}

function createOssClient(bucket) {
  const region = process.env.OSS_REGION || DEFAULT_REGION;
  const endpoint = process.env.OSS_ENDPOINT || DEFAULT_ENDPOINT;
  const accessKeyId =
    process.env.ALIBABA_CLOUD_ACCESS_KEY_ID ||
    process.env.ACCESS_KEY_ID ||
    process.env.OSS_ACCESS_KEY_ID;
  const accessKeySecret =
    process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET ||
    process.env.ACCESS_KEY_SECRET ||
    process.env.OSS_ACCESS_KEY_SECRET;
  const stsToken =
    process.env.ALIBABA_CLOUD_SECURITY_TOKEN ||
    process.env.SECURITY_TOKEN ||
    process.env.OSS_STS_TOKEN;

  if (!accessKeyId || !accessKeySecret) {
    throw new Error(
      "Missing OSS credentials. Attach an FC role with OSS access, or set ACCESS_KEY env vars.",
    );
  }

  return new OSS({
    bucket,
    region: region.startsWith("oss-") ? region : `oss-${region}`,
    endpoint,
    accessKeyId,
    accessKeySecret,
    stsToken,
    secure: true,
    timeout: "600s",
  });
}

async function readJsonObject(client, objectKey) {
  const object = await client.get(objectKey);
  const text = toBuffer(object.content).toString("utf8");
  return JSON.parse(text);
}

function toBuffer(content) {
  if (Buffer.isBuffer(content)) {
    return content;
  }
  if (content instanceof Uint8Array) {
    return Buffer.from(content);
  }
  if (typeof content === "string") {
    return Buffer.from(content);
  }
  return Buffer.from(content ?? []);
}

async function postCallback(url, secret, body) {
  if (!url) {
    return;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${secret ?? ""}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Callback failed with status ${response.status}: ${text.slice(0, 300)}`,
    );
  }
}

function normalizeRequest(event) {
  if (event == null) {
    return { headers: {}, body: null, isBase64Encoded: false };
  }

  if (typeof event === "string") {
    return { headers: {}, body: event, isBase64Encoded: false };
  }

  // FC HTTP / Web function style
  if (typeof event === "object") {
    const headers = event.headers || event.header || {};
    let body = event.body ?? event;
    if (
      body &&
      typeof body === "object" &&
      !Buffer.isBuffer(body) &&
      (body.jobId || body.entriesObjectKey)
    ) {
      body = JSON.stringify(body);
    }
    return {
      headers,
      body,
      isBase64Encoded: Boolean(event.isBase64Encoded),
    };
  }

  return { headers: {}, body: null, isBase64Encoded: false };
}

function parseJsonBody(body, isBase64Encoded) {
  if (body == null || body === "") {
    throw new Error("Request body is empty.");
  }

  if (typeof body === "object") {
    return body;
  }

  let text = String(body);
  if (isBase64Encoded) {
    text = Buffer.from(text, "base64").toString("utf8");
  }

  return JSON.parse(text);
}

function getHeader(headers, name) {
  if (!headers || typeof headers !== "object") {
    return undefined;
  }
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (String(key).toLowerCase() === target) {
      return Array.isArray(value) ? value[0] : value;
    }
  }
  return undefined;
}

function bearerMatches(headerValue, secret) {
  if (!headerValue || !secret) {
    return false;
  }
  const match = /^Bearer\s+(.+)$/i.exec(String(headerValue).trim());
  if (!match?.[1]) {
    return false;
  }
  return match[1] === secret;
}

function httpResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(payload),
  };
}

// Local smoke helper: `node handler.mjs` prints module load OK.
const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  console.log("ops-export-zip handler module loaded.");
}
