import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  coerceFcEventObject,
  handler,
  parseFcHttpEvent,
  parseRequestJsonBody,
} from "./handler.mjs";

const SECRET = "test-callback-secret";

function buildOfficialHttpEvent(payload, options = {}) {
  const bodyText = JSON.stringify(payload);
  const body = options.base64
    ? Buffer.from(bodyText, "utf8").toString("base64")
    : bodyText;

  return {
    version: "v1",
    rawPath: "/",
    headers: {
      Authorization: `Bearer ${SECRET}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    queryParameters: {},
    body,
    isBase64Encoded: Boolean(options.base64),
    requestContext: {
      requestId: options.requestId ?? "1-test-request-id",
      http: {
        method: "POST",
        path: "/",
        protocol: "HTTP/1.1",
        sourceIp: "1.2.3.4",
        userAgent: "vitest",
      },
    },
  };
}

function asFcBufferEvent(httpEvent) {
  return Buffer.from(JSON.stringify(httpEvent), "utf8");
}

describe("ops-export-zip FC event parsing", () => {
  it("coerces Buffer events via JSON.parse (official Node.js runtime)", () => {
    const httpEvent = buildOfficialHttpEvent({
      jobId: "ops_export_1",
      entriesObjectKey: "exports/ops/a.entries.json",
      outputObjectKey: "exports/ops/a.zip",
    });

    const coerced = coerceFcEventObject(asFcBufferEvent(httpEvent));
    expect(coerced.version).toBe("v1");
    expect(coerced.body).toContain("ops_export_1");
  });

  it("parses official HTTP envelope body and headers", () => {
    const httpEvent = buildOfficialHttpEvent({
      jobId: "ops_export_1",
      entriesObjectKey: "exports/ops/a.entries.json",
      outputObjectKey: "exports/ops/a.zip",
      callbackUrl: "https://example.test/callback",
    });

    const parsed = parseFcHttpEvent(asFcBufferEvent(httpEvent));
    expect(parsed.isBase64Encoded).toBe(false);
    expect(parsed.requestId).toBe("1-test-request-id");
    expect(getAuth(parsed.headers)).toContain(SECRET);

    const body = parseRequestJsonBody(parsed.body, parsed.isBase64Encoded);
    expect(body.jobId).toBe("ops_export_1");
    expect(body.entriesObjectKey).toBe("exports/ops/a.entries.json");
  });

  it("decodes base64 HTTP bodies when isBase64Encoded=true", () => {
    const httpEvent = buildOfficialHttpEvent(
      {
        jobId: "ops_export_b64",
        entriesObjectKey: "exports/ops/b.entries.json",
        outputObjectKey: "exports/ops/b.zip",
      },
      { base64: true },
    );

    const parsed = parseFcHttpEvent(asFcBufferEvent(httpEvent));
    expect(parsed.isBase64Encoded).toBe(true);

    const body = parseRequestJsonBody(parsed.body, parsed.isBase64Encoded);
    expect(body.jobId).toBe("ops_export_b64");
  });

  it("does not treat a Buffer as the business payload (regression)", () => {
    const httpEvent = buildOfficialHttpEvent({
      jobId: "ops_export_regression",
      entriesObjectKey: "exports/ops/r.entries.json",
      outputObjectKey: "exports/ops/r.zip",
    });
    const bufferEvent = asFcBufferEvent(httpEvent);

    // Old bug: typeof Buffer === "object" and body fell back to the Buffer itself.
    expect(Buffer.isBuffer(bufferEvent)).toBe(true);
    expect(bufferEvent.jobId).toBeUndefined();

    const parsed = parseFcHttpEvent(bufferEvent);
    const body = parseRequestJsonBody(parsed.body, parsed.isBase64Encoded);
    expect(body.jobId).toBe("ops_export_regression");
  });

  it("accepts a direct business payload object for local smoke invokes", () => {
    const parsed = parseFcHttpEvent({
      jobId: "ops_export_direct",
      entriesObjectKey: "exports/ops/d.entries.json",
      outputObjectKey: "exports/ops/d.zip",
    });
    const body = parseRequestJsonBody(parsed.body, parsed.isBase64Encoded);
    expect(body.jobId).toBe("ops_export_direct");
  });
});

describe("ops-export-zip handler", () => {
  const originalSecret = process.env.OPS_EXPORT_CALLBACK_SECRET;

  beforeEach(() => {
    process.env.OPS_EXPORT_CALLBACK_SECRET = SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.OPS_EXPORT_CALLBACK_SECRET;
    } else {
      process.env.OPS_EXPORT_CALLBACK_SECRET = originalSecret;
    }
  });

  it("accepts official Buffer HTTP events and runs pack + callback", async () => {
    const packAndUpload = vi.fn(async () => ({
      zipFileSize: 1234,
      missing: [],
    }));
    const postCallback = vi.fn(async () => undefined);

    const payload = {
      jobId: "ops_export_ok",
      bucket: "hirebucket",
      entriesObjectKey: "exports/ops/ops_export_ok.entries.json",
      outputObjectKey: "exports/ops/ops_export_ok.zip",
      callbackUrl: "https://talent.example/api/internal/ops-exports/ops_export_ok/callback",
    };

    const response = await handler(
      asFcBufferEvent(buildOfficialHttpEvent(payload)),
      { requestId: "ctx-request-id" },
      { packAndUpload, postCallback },
    );

    expect(response.statusCode).toBe(202);
    expect(JSON.parse(response.body)).toMatchObject({
      accepted: true,
      jobId: "ops_export_ok",
      zipFileSize: 1234,
      missingCount: 0,
    });

    expect(packAndUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: "ops_export_ok",
        entriesObjectKey: payload.entriesObjectKey,
        outputObjectKey: payload.outputObjectKey,
      }),
    );
    expect(postCallback).toHaveBeenCalledWith(
      payload.callbackUrl,
      SECRET,
      expect.objectContaining({
        status: "SUCCEEDED",
        outputObjectKey: payload.outputObjectKey,
        zipFileSize: 1234,
      }),
    );
  });

  it("returns 401 when bearer secret mismatches", async () => {
    const response = await handler(
      asFcBufferEvent(
        buildOfficialHttpEvent(
          {
            jobId: "ops_export_unauth",
            entriesObjectKey: "exports/ops/u.entries.json",
            outputObjectKey: "exports/ops/u.zip",
          },
          { headers: { Authorization: "Bearer wrong-secret" } },
        ),
      ),
      {},
      {
        packAndUpload: vi.fn(),
        postCallback: vi.fn(),
      },
    );

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body).code).toBe("OPS_EXPORT_FC_UNAUTHORIZED");
  });

  it("returns 400 for Buffer events that previously looked like empty job payloads", async () => {
    // Minimal envelope without a usable body — must not crash / invent fields.
    const response = await handler(
      Buffer.from(
        JSON.stringify({
          version: "v1",
          body: "",
          isBase64Encoded: false,
          headers: { Authorization: `Bearer ${SECRET}` },
        }),
        "utf8",
      ),
      {},
      {
        packAndUpload: vi.fn(),
        postCallback: vi.fn(),
      },
    );

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).code).toBe("OPS_EXPORT_FC_BAD_REQUEST");
  });

  it("posts FAILED callback when packing throws", async () => {
    const postCallback = vi.fn(async () => undefined);

    const payload = {
      jobId: "ops_export_fail",
      entriesObjectKey: "exports/ops/f.entries.json",
      outputObjectKey: "exports/ops/f.zip",
      callbackUrl: "https://talent.example/callback",
    };

    const response = await handler(
      asFcBufferEvent(buildOfficialHttpEvent(payload)),
      {},
      {
        packAndUpload: vi.fn(async () => {
          throw new Error("oss get failed");
        }),
        postCallback,
      },
    );

    expect(response.statusCode).toBe(500);
    expect(postCallback).toHaveBeenCalledWith(
      payload.callbackUrl,
      SECRET,
      expect.objectContaining({
        status: "FAILED",
        errorMessage: "oss get failed",
      }),
    );
  });
});

function getAuth(headers) {
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === "authorization") {
      return value;
    }
  }
  return "";
}
