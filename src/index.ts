import { networkInterfaces } from "node:os";
import { loadConfig } from "./config.js";
import { LogNotifier } from "./notify/index.js";
import { Poller } from "./poller.js";
import { startServer } from "./server.js";
import { Store } from "./state.js";

function main(): void {
  const config = loadConfig();
  const store = new Store();
  const notifiers = [new LogNotifier()];
  const poller = new Poller(config, store, notifiers);

  const stopPolling = poller.start();
  const server = startServer(store, config.httpPort);

  const sources = [`${config.indoorSensors.length} indoor sensor(s)`, "Open-Meteo"];
  if (config.metOfficeApiKey) sources.push("Met Office");
  else console.warn("METOFFICE_API_KEY not set — running on Open-Meteo only.");

  console.log(`🪟 Window Manager started.`);
  console.log(`   Sources: ${sources.join(", ")}`);
  console.log(`   Polling every ${config.pollIntervalMinutes} min · hysteresis ±${config.hysteresisC}°C`);

  const shutdown = () => {
    console.log("\nShutting down…");
    stopPolling();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();
