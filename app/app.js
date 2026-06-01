const express = require("express");
const promClient = require("prom-client");

const app = express();
const PORT = process.env.PORT || 8080;

let isReady = true;

/*
 * Prometheus Metrics
 */

const register = new promClient.Registry();

promClient.collectDefaultMetrics({
  register
});

const httpRequestsTotal = new promClient.Counter({
  name: "http_requests_total",
  help: "Total HTTP Requests",
  labelNames: ["method", "route", "status"]
});

const requestDuration = new promClient.Histogram({
  name: "http_request_duration_seconds",
  help: "Request duration",
  labelNames: ["method", "route", "status"],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5]
});

register.registerMetric(httpRequestsTotal);
register.registerMetric(requestDuration);

/*
 * Middleware
 */

app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;

    httpRequestsTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status: res.statusCode
    });

    requestDuration.observe(
      {
        method: req.method,
        route: req.route?.path || req.path,
        status: res.statusCode
      },
      duration
    );
  });

  next();
});

/*
 * Routes
 */

app.get("/", (req, res) => {
  res.json({
    service: "sample-service",
    status: "running"
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy"
  });
});

app.get("/ready", (req, res) => {
  if (!isReady) {
    return res.status(503).json({
      status: "not-ready"
    });
  }

  res.status(200).json({
    status: "ready"
  });
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

/*
 * Graceful Shutdown
 */

process.on("SIGTERM", () => {
  console.log("SIGTERM received");

  isReady = false;

  setTimeout(() => {
    process.exit(0);
  }, 10000);
});

process.on("SIGINT", () => {
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);
});