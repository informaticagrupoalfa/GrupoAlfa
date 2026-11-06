import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env'), override: true });

import { app } from "./app.js";
import { PORT, HOST } from "./config.js";

app.listen(PORT ?? 4000, HOST ?? "0.0.0.0", () => {
  console.log(`Servidor escuchando en http://127.0.0.1:${PORT ?? 4000} (${HOST ?? "0.0.0.0"}:${PORT ?? 4000})`);
});
