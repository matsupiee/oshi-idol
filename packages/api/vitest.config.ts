import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "cloudflare:workers": fileURLToPath(
        new URL("../env/src/cloudflare-local.ts", import.meta.url),
      ),
    },
  },
  test: {
    globals: true,
  },
});
