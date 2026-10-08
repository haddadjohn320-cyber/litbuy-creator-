const http = require("node:http");
const next = require("next");

const hostname = "0.0.0.0";
const port = 8080;

const app = next({
  dev: false,
  hostname,
  port
});

const handle = app.getRequestHandler();

app.prepare()
  .then(() => {
    http
      .createServer((req, res) => handle(req, res))
      .listen(port, hostname, () => {
        console.log("LITBUY démarré sur le port 8080");
      });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
