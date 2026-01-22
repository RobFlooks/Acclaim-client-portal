import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { scheduleReportProcessor } from "./scheduled-reports";
import { storage } from "./storage";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Setup Vite in development only (after all other routes)
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Always listen on the port provided by the host (Azure sets PORT).
  // If it's missing, default to 8080 (Azure's common default).
  const port = Number(process.env.PORT) || 8080;

  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);

      // Start the scheduled report processor
      scheduleReportProcessor();

      // Start audit log retention cleanup (runs daily)
      const AUDIT_LOG_RETENTION_DAYS = 365; // Keep logs for 1 year by default

      const runAuditLogCleanup = async () => {
        try {
          const deletedCount = await storage.deleteOldAuditLogs(
            AUDIT_LOG_RETENTION_DAYS
          );
          if (deletedCount > 0) {
            log(
              `Audit log cleanup: deleted ${deletedCount} logs older than ${AUDIT_LOG_RETENTION_DAYS} days`
            );
          }
        } catch (error) {
          console.error("Error during audit log cleanup:", error);
        }
      };

      // Run cleanup once at startup (after 30 seconds)
      setTimeout(runAuditLogCleanup, 30000);

      // Then run daily (every 24 hours)
      setInterval(runAuditLogCleanup, 24 * 60 * 60 * 1000);

      log("Audit log retention cleanup scheduled (runs daily, 365-day retention)");
    }
  );
})();