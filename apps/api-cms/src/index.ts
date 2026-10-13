import {serve} from "@hono/node-server";
import { createApp } from "./app";

const app = createApp();
const port = Number(process.env.PORT ?? 4001)

serve({fetch: app.fetch, port}, (info) =>{
    console.log(`api-cms listening on http://localhost:${info.port}`)
})