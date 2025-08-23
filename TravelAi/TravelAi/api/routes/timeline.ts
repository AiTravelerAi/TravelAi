// api/routes/timeline.ts

import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// In-memory log (replace with DB or blockchain in production)
let timelineEvents: any[] = [];

/**
 * @route   POST /timeline
 * @desc    Add a new event to the AI timeline archive
 * @body    {
 *            eventType: string, // prediction_created | prediction_updated | capsule_created | capsule_resolved
 *            signalId?: string,
 *            capsuleId?: string,
 *            confidence?: number,
 *            riskTier?: string,
 *            outcome?: string,
 *            payoutRatio?: number
 *          }
 */
router.post("/", (req: Request, res: Response) => {
  try {
    const {
      eventType,
      signalId,
      capsuleId,
      confidence,
      riskTier,
      outcome,
      payoutRatio,
    } = req.body;

    if (!eventType) {
      return res.status(400).json({ error: "Missing required field: eventType" });
    }

    const newEvent = {
      id: uuidv4(),
      eventType,
      signalId: signalId || null,
      capsuleId: capsuleId || null,
      confidence: confidence || null,
      riskTier: riskTier || null,
      outcome: outcome || null,
      payoutRatio: payoutRatio || null,
      timestamp: new Date().toISOString(),
      blockchainHash: null, // filled after writing to Solana/IPFS
    };

    // TODO: Add logic to send event to Solana smart contract & IPFS
    // Example:
    // const hash = await writeEventToSolana(newEvent);
    // newEvent.blockchainHash = hash;

    timelineEvents.push(newEvent);

    res.status(201).json({
      message: "Timeline event recorded",
      event: newEvent,
    });
  } catch (error) {
    console.error("Error creating timeline event:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route   GET /timeline
 * @desc    Retrieve all timeline events (with optional filters)
 * @query   ?eventType=&signalId=&capsuleId=
 */
router.get("/", (req: Request, res: Response) => {
  const { eventType, signalId, capsuleId } = req.query;

  let filtered = [...timelineEvents];

  if (eventType) filtered = filtered.filter((e) => e.eventType === eventType);
  if (signalId) filtered = filtered.filter((e) => e.signalId === signalId);
  if (capsuleId) filtered = filtered.filter((e) => e.capsuleId === capsuleId);

  res.json({ timeline: filtered });
});

/**
 * @route   GET /timeline/:id
 * @desc    Retrieve a single timeline event by ID
 */
router.get("/:id", (req: Request, res: Response) => {
  const event = timelineEvents.find((e) => e.id === req.params.id);
  if (!event) {
    return res.status(404).json({ error: "Timeline event not found" });
  }
  res.json(event);
});

export default router;
// Timeline routes
