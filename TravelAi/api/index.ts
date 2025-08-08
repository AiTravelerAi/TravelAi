// api/index.ts

import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import cors from "cors";

// Route imports
import capsulesRoute from "./routes/capsules";
import predictionsRoute from "./routes/predictions";
import timelineRoute from "./routes/timeline";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Health Check Endpoint
app.get("/", (req: Request, res: Response) => {
  res.send({
    status: "✅ API is running",
    endpoints: [
      { path: "/capsules", methods: ["GET", "POST"] },
      { path: "/predictions", methods: ["GET", "POST"] },
      { path: "/timeline", methods: ["GET", "POST"] },
    ],
  });
});

// Mount routes
app.use("/capsules", capsulesRoute);
app.use("/predictions", predictionsRoute);
app.use("/timeline", timelineRoute);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: Function) => {
  console.error("🚨 API Error:", err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TravelAI API server running on http://localhost:${PORT}`);
});
