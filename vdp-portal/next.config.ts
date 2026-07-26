import type { NextConfig } from "next";
import fs from "fs";
import path from "path";
import { assertSafeBaDraftEnvironment, isBaDraftMode as checkBaDraftMode } from "./src/lib/ba-draft/config";

// BA Draft mode must never load real infrastructure config from
// .env.company.local — see src/lib/ba-draft/config.ts for the fail-closed
// startup contract that rejects real credentials/endpoints when this mode
// is on. Imported via a relative path (not the app's "@/" alias, which
// next.config.ts's minimal config-loading compiler doesn't resolve).
//
// This assertion runs here — not only in src/instrumentation.ts — because
// instrumentation's register() hook is not guaranteed to execute during
// `next build`'s static/page-data-collection phase, and the build itself
// must fail closed on an unsafe BA Draft environment, not just the server.
const isBaDraftMode = checkBaDraftMode();
if (isBaDraftMode) {
  assertSafeBaDraftEnvironment();
}

const envPath = path.resolve(process.cwd(), ".env.company.local");
if (!isBaDraftMode && fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf-8");
  envConfig.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const nextConfig: NextConfig = {
  output: 'standalone',
};

export default nextConfig;
