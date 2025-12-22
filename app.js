process.on("unhandledRejection", (err) => console.error("unhandledRejection", err));
process.on("uncaughtException", (err) => console.error("uncaughtException", err));

const next = require("next");
const http = require("http");

const port = parseInt(process.env.PORT || "3000", 10);
const host = process.env.HOST || "0.0.0.0";
const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  http
    .createServer((req, res) => handle(req, res))
    .listen(port, host, () => {
      console.log(`> Next ready on ${host}:${port}`);
    });
});

