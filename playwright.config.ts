import { defineConfig, devices } from "@playwright/test";

const E2E_BASE_URL = "http://localhost:3100";
const OPS_USERNAME = process.env.OPS_EXPERT_FILES_USERNAME || "ops";
const OPS_PASSWORD =
  process.env.OPS_EXPERT_FILES_INITIAL_PASSWORD || "e2e-ops-pass-123";

export default defineConfig({
  testDir: "./tests/e2e",
  /** Single shared Next.js process + in-memory store; parallel tests race on global state. */
  workers: 1,
  use: {
    baseURL: E2E_BASE_URL,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "bun run dev -- --port 3100",
    env: {
      ...process.env,
      APP_RUNTIME_MODE: "memory",
      APP_BASE_URL: E2E_BASE_URL,
      BETTER_AUTH_URL: E2E_BASE_URL,
      FILE_STORAGE_MODE: "mock",
      RESUME_ANALYSIS_MODE: "mock",
      EMAIL_TRANSPORT_MODE: "recording",
      OPS_EXPERT_FILES_USERNAME: OPS_USERNAME,
      OPS_EXPERT_FILES_INITIAL_PASSWORD: OPS_PASSWORD,
    },
    port: 3100,
    reuseExistingServer: false,
  },
});

export const e2eOpsCredentials = {
  username: OPS_USERNAME,
  password: OPS_PASSWORD,
} as const;
