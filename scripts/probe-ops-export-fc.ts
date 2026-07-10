/**
 * Probe whether OPS_EXPORT_FC_ENDPOINT behaves like an Alibaba Cloud FC
 * HTTP trigger under the same headers AutoHire uses.
 *
 * Pass criteria (official docs):
 * - Async accept => HTTP 202 + response header X-Fc-Request-Id
 * - Non-202 => invoke failed / did not enqueue async execution
 *
 * Usage:
 *   bun scripts/probe-ops-export-fc.ts
 */
import { config } from "dotenv";

config({ path: ".env" });

const endpoint = process.env.OPS_EXPORT_FC_ENDPOINT?.trim();
const secret = process.env.OPS_EXPORT_CALLBACK_SECRET?.trim() ?? "";

if (!endpoint) {
  console.error("OPS_EXPORT_FC_ENDPOINT is missing");
  process.exit(2);
}

const payload = {
  jobId: `probe_${Date.now()}`,
  bucket: process.env.ALIYUN_OSS_BUCKET ?? "hirebucket",
  entriesObjectKey: "exports/ops/probe-does-not-exist.entries.json",
  outputObjectKey: "exports/ops/probe-does-not-exist.zip",
  callbackUrl: "https://example.invalid/api/internal/ops-exports/probe/callback",
};

const started = Date.now();
const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    authorization: `Bearer ${secret}`,
    "x-fc-invocation-type": "Async",
  },
  body: JSON.stringify(payload),
});
const elapsedMs = Date.now() - started;
const text = await response.text().catch(() => "");

const headers: Record<string, string> = {};
response.headers.forEach((value, key) => {
  headers[key.toLowerCase()] = value;
});

const requestId =
  headers["x-fc-request-id"] ||
  headers["x-fc-requestid"] ||
  null;

const verdict =
  response.status === 202 && Boolean(requestId)
    ? "REACHED_FC_ASYNC_ACCEPTED"
    : response.status === 202 && !requestId
      ? "HTTP_202_BUT_MISSING_FC_REQUEST_ID"
      : response.ok
        ? "NON_ASYNC_SUCCESS_UNEXPECTED"
        : "DID_NOT_ACCEPT_ASYNC_INVOKE";

console.log(
  JSON.stringify(
    {
      endpointHost: new URL(endpoint).host,
      status: response.status,
      elapsedMs,
      requestId,
      verdict,
      // Official: 202 means request accepted for async execution.
      // Console "调用请求" should then show this requestId shortly after.
      bodyPreview: text.slice(0, 300),
      interestingHeaders: {
        "x-fc-request-id": headers["x-fc-request-id"] ?? null,
        "content-type": headers["content-type"] ?? null,
        server: headers["server"] ?? null,
        date: headers["date"] ?? null,
      },
    },
    null,
    2,
  ),
);

process.exit(
  verdict === "REACHED_FC_ASYNC_ACCEPTED" ? 0 : 1,
);
