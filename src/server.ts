import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes";
import { errorHandler } from "./middlewares/errorHandler";
import { initPrisma } from "./config/prisma";
import { config } from "./config/env";

async function bootstrap(): Promise<void> {
  await initPrisma();

  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: "*", // TODO: tighten for production
    })
  );
  app.use(express.json());

  // Simple health check route
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", service: "documentmgmt-backend" });
  });

  // Phase 1 routes: auth + basic identity
  app.use("/api", routes);

  // Global error handler
  app.use(errorHandler);

  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend server listening on port ${config.port}`);
  });
}

void bootstrap();

