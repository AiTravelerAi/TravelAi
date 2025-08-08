// api/routes/predictions.ts

import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// Temporary in-memory store (replace with DB in production)
let predictions: any[] = [];

/**
 * @route   POST /predictions
 * @desc    Create a new AI-generated prediction signal
 * @body    {
 *            tokenSymbol: string,
 *            prediction: string,
 *            confidence: number, // 0-100
 *            riskTier: string,   // low | medium | high
 *            timeHorizon: string // short | medium | long
 *          }
 */
router.post("/", (req: Request, res: Response) => {
  try {
    const { tokenSymbol, prediction, confidence, riskTier, timeHorizon } = req.body;

    if (!tokenSymbol || !prediction || confidence === undefined || !riskTier || !timeHorizon) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newPrediction = {
      id: uuidv4(),
      tokenSymbol,
      prediction,
      confidence,
      riskTier,
      timeHorizon,
      createdAt: new Date().toISOString(),
      status: "active", // active | expired
      outcome: null, // win | loss | null
    };

    predictions.push(newPrediction);

    res.status(201).json({
      message: "Prediction created successfully",
      prediction: newPrediction,
    });
  } catch (error) {
    console.error("Error creating prediction:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route   GET /predictions
 * @desc    Get all active predictions
 */
router.get("/", (req: Request, res: Response) => {
  const activePredictions = predictions.filter((p) => p.status === "active");
  res.json({ predictions: activePredictions });
});

/**
 * @route   GET /predictions/:id
 * @desc    Get a single prediction by ID
 */
router.get("/:id", (req: Request, res: Response) => {
  const prediction = predictions.find((p) => p.id === req.params.id);
  if (!prediction) {
    return res.status(404).json({ error: "Prediction not found" });
  }
  res.json(prediction);
});

/**
 * @route   PATCH /predictions/:id
 * @desc    Update prediction outcome or status
 * @body    { status?: string, outcome?: string }
 */
router.patch("/:id", (req: Request, res: Response) => {
  const { status, outcome } = req.body;
  const predictionIndex = predictions.findIndex((p) => p.id === req.params.id);

  if (predictionIndex === -1) {
    return res.status(404).json({ error: "Prediction not found" });
  }

  if (status && !["active", "expired"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  if (outcome && !["win", "loss"].includes(outcome)) {
    return res.status(400).json({ error: "Invalid outcome value" });
  }

  if (status) predictions[predictionIndex].status = status;
  if (outcome) predictions[predictionIndex].outcome = outcome;

  predictions[predictionIndex].updatedAt = new Date().toISOString();

  res.json({
    message: "Prediction updated",
    prediction: predictions[predictionIndex],
  });
});

export default router;
// Prediction routes
