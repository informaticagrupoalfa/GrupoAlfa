import { app } from "./app.js";
import { PORT, HOST } from "./config.js";

app.listen(PORT, HOST, () => {
  console.log(`Servidor escuchando en http://127.0.0.1:${PORT} (${HOST}:${PORT})`);
});
