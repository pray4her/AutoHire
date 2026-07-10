import { getEnv } from "@/lib/env";

export type OpsExportFcInvokePayload = {
  jobId: string;
  bucket: string;
  entriesObjectKey: string;
  outputObjectKey: string;
  callbackUrl: string;
};

export async function invokeOpsExportFunction(
  payload: OpsExportFcInvokePayload,
) {
  const env = getEnv();

  if (
    !env.OPS_EXPORT_FC_ENDPOINT ||
    !env.OPS_EXPORT_FC_ACCESS_KEY_ID ||
    !env.OPS_EXPORT_FC_ACCESS_KEY_SECRET
  ) {
    // Dev/test fallback: mark as "invoked" without calling remote FC.
    // Production must configure FC; createExportJob will still proceed and
    // rely on callback or lease timeout.
    if (process.env.NODE_ENV === "test" || env.FILE_STORAGE_MODE === "mock") {
      return { invoked: false as const, reason: "fc_not_configured" };
    }

    throw new Error(
      "Function Compute is not configured for ops expert-file exports.",
    );
  }

  // HTTP trigger style invoke with shared secret in header.
  // Prefer async: fire-and-forget; FC posts callback when done.
  const response = await fetch(env.OPS_EXPORT_FC_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.OPS_EXPORT_CALLBACK_SECRET ?? ""}`,
      "x-fc-invocation-type": "Async",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok && response.status !== 202) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `FC invoke failed with status ${response.status}: ${text.slice(0, 200)}`,
    );
  }

  return { invoked: true as const };
}
