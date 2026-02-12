import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";

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

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend server listening on port ${PORT}`);
});

