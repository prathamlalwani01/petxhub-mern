import express from "express";
import {
  createBooking,
  createBookingOrder,
  createPaymentOrderForBooking,
  getAvailableSlots,
  getBookingReceipt,
  getManageableBookings,
  getMyBookings,
  getProviderBookings,
  markBookingPaymentFailed,
  rescheduleBooking,
  upadatingBookingStatus,
  verifyBookingPayment,
} from "../controllers/bookingController.js";
import { protect } from "../middleware/authMiddleware.js";
import { cancelBooking } from "../controllers/bookingController.js";

const router = express.Router();

router.get("/slots", protect, getAvailableSlots);
router.get("/slots/:serviceId", protect, getAvailableSlots);
router.post("/", protect, createBooking);
router.post("/create-order", protect, createBookingOrder);
router.post("/:id/create-payment-order", protect, createPaymentOrderForBooking);
router.post("/:id/payment-failed", protect, markBookingPaymentFailed);
router.post("/verify-payment", protect, verifyBookingPayment);
router.get("/manage", protect, getManageableBookings);
router.get("/my", protect, getMyBookings);
router.get("/:id/receipt", protect, getBookingReceipt);
router.get('/provider',protect,getProviderBookings);
router.patch("/:id/reschedule", protect, rescheduleBooking);
router.patch('/:id/status',protect,upadatingBookingStatus);
router.put("/cancel/:id", protect, cancelBooking);

export default router;
