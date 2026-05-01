import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
    createAdoptionRequest,
    getIncomingRequests,
    getOutgoingRequests,
    updateRequestStatus
} from "../controllers/adoptionController.js";

const router = express.Router();

router.post("/", protect, createAdoptionRequest);
router.get("/incoming", protect, getIncomingRequests);
router.get("/outgoing", protect, getOutgoingRequests);
router.put("/:id/status", protect, updateRequestStatus);

export default router;
