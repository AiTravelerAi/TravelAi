// api/routes/capsules.ts

import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// In-memory store (replace with database in production)
let capsules: any[] = [];

/**
 * @route   POST /capsules
 * @desc    Create a new Capsule (prediction container)
 * @body    {
 *            signalId: string,
 *            prediction: string,
 *            multiplier: number,
 *            expiry: string (ISO date),
 *            userWallet: string
 *          }
 */
router.post("/", (req: Request, res: Response) => {
  try {
    const { signalId, prediction, multiplier, expiry, userWallet } = req.body;

    if (!signalId || !prediction || !multiplier || !expiry || !userWallet) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newCapsule = {
      id: uuidv4(),
      signalId,
      prediction,
      multiplier,
      expiry,
      userWallet,
      createdAt: new Date().toISOString(),
      status: "pending", // pending | win | loss
    };

    capsules.push(newCapsule);

    res.status(201).json({
      message: "Capsule created successfully",
      capsule: newCapsule,
    });
  } catch (error) {
    console.error("Error creating capsule:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route   GET /capsules
 * @desc    Get all Capsules
 */
router.get("/", (req: Request, res: Response) => {
  res.json({ capsules });
});

/**
 * @route   GET /capsules/:id
 * @desc    Get a single Capsule by ID
 */
router.get("/:id", (req: Request, res: Response) => {
  const capsule = capsules.find((c) => c.id === req.params.id);
  if (!capsule) {
    return res.status(404).json({ error: "Capsule not found" });
  }
  res.json(capsule);
});

/**
 * @route   PATCH /capsules/:id
 * @desc    Update Capsule status (e.g., mark as win/loss)
 */
router.patch("/:id", (req: Request, res: Response) => {
  const { status } = req.body;
  const capsuleIndex = capsules.findIndex((c) => c.id === req.params.id);

  if (capsuleIndex === -1) {
    return res.status(404).json({ error: "Capsule not found" });
  }

  if (!["win", "loss", "pending"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  capsules[capsuleIndex].status = status;
  capsules[capsuleIndex].updatedAt = new Date().toISOString();

  res.json({
    message: "Capsule status updated",
    capsule: capsules[capsuleIndex],
  });
});

export default router;
// Capsule routes
