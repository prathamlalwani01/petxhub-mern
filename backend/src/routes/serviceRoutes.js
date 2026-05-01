import express, { request } from "express";
import {
  createService,
  deleteService,
  getAllServices,
  getMyServices,
  updateService,
} from "../controllers/serviceController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();

router.post("/", protect, createService);
router.get("/", protect, getAllServices);
router.get("/my-services", protect, getMyServices);
router.put("/:id", protect, updateService);
router.delete("/:id", protect, deleteService);

export default router;
