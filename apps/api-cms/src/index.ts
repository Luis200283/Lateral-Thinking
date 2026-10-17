import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { env } from "./env";

const app = createApp();
const port = env.PORT;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`api-cms listening on http://localhost:${info.port}`);
});