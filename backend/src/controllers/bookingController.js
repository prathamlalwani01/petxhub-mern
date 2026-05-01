import Booking from "../models/booking.js";
import Service from "../models/service.js";
import crypto from "crypto";
import Razorpay from "razorpay";
import { sendTransactionalEmail } from "../services/emailService.js";
import { createNotification } from "../services/notificationService.js";
import { calculateBookingAmount, getBookingPricingSettings } from "../services/bookingPricingService.js";

const VET_TIME_SLOTS = [
  "09:00-09:30",
  "09:30-10:00",
  "10:00-10:30",
  "10:30-11:00",
  "11:00-11:30",
  "11:30-12:00",
  "12:00-12:30",
  "12:30-13:00",
  "14:00-14:30",
  "14:30-15:00",
  "15:00-15:30",
  "15:30-16:00",
  "16:00-16:30",
  "16:30-17:00",
  "17:00-17:30",
  "17:30-18:00",
];
const getRazorpayClient = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

const normalizeBookingDate = (bookingDate) => {
  const date = new Date(bookingDate);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(0, 0, 0, 0);
  return date;
};

const parseSlotStart = (timeSlot) => {
  const [startTime] = timeSlot.split("-");

  if (!startTime) {
    return null;
  }

  const [hours, minutes] = startTime.split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return { hours, minutes };
};

const isPastTimeSlot = (bookingDate, timeSlot) => {
  const slotStart = parseSlotStart(timeSlot);

  if (!slotStart) {
    return false;
  }

  const now = new Date();
  const slotDateTime = new Date(bookingDate);

  slotDateTime.setHours(slotStart.hours, slotStart.minutes, 0, 0);

  return slotDateTime <= now;
};

const buildExistingBookingQuery = ({ bookingDate, timeSlot, service, bookingCategory, bookingId }) => {
  const query = {
    bookingDate,
    timeSlot,
    status: { $ne: "cancelled" },
    paymentStatus: { $ne: "failed" },
  };

  if (bookingId) {
    query._id = { $ne: bookingId };
  }

  if (service) {
    query.service = service;
  } else {
    query.bookingCategory = bookingCategory;
  }

  return query;
};

const getPendingBookingExpiryDate = () => {
  const expiryDate = new Date();
  expiryDate.setMinutes(expiryDate.getMinutes() - 15);
  return expiryDate;
};

const clearExpiredPendingBookings = async ({ bookingDate, timeSlot, service, bookingCategory }) => {
  const pricingSettings = await getBookingPricingSettings();
  const query = buildExistingBookingQuery({
    bookingDate,
    timeSlot,
    service,
    bookingCategory,
  });

  query.paymentStatus = "pending";
  const expiryDate = new Date();
  expiryDate.setMinutes(expiryDate.getMinutes() - (pricingSettings.unpaidBookingHoldMinutes || 15));
  query.createdAt = { $lt: expiryDate };

  await Booking.deleteMany(query);
};

const ensureRazorpayConfigured = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    const error = new Error("Razorpay is not configured");
    error.statusCode = 500;
    throw error;
  }
};

const validateBookingPayload = async ({
  pet,
  service,
  bookingCategory,
  appointmentType,
  groomingPackage,
  petSize,
  bookingDate,
  timeSlot,
}) => {
  const resolvedCategory = service ? "service" : bookingCategory;

  if (!pet || !bookingDate || !timeSlot || (!service && !resolvedCategory)) {
    const error = new Error("All fields are required");
    error.statusCode = 400;
    throw error;
  }

  if (!service && !["vet", "grooming"].includes(resolvedCategory)) {
    const error = new Error("Invalid booking category");
    error.statusCode = 400;
    throw error;
  }

  if (resolvedCategory === "vet" && !appointmentType) {
    const error = new Error("Vet care type is required");
    error.statusCode = 400;
    throw error;
  }

  if (resolvedCategory === "grooming" && (!groomingPackage || !petSize)) {
    const error = new Error("Grooming package and pet size are required");
    error.statusCode = 400;
    throw error;
  }

  const date = normalizeBookingDate(bookingDate);

  if (!date) {
    const error = new Error("Invalid booking date");
    error.statusCode = 400;
    throw error;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (date < today) {
    const error = new Error("Booking date cannot be in the past");
    error.statusCode = 400;
    throw error;
  }

  if (!VET_TIME_SLOTS.includes(timeSlot)) {
    const error = new Error("Invalid time slot selected");
    error.statusCode = 400;
    throw error;
  }

  if (isPastTimeSlot(date, timeSlot)) {
    const error = new Error("This time slot has already passed");
    error.statusCode = 400;
    throw error;
  }

  let selectedService = null;

  if (service) {
    selectedService = await Service.findById(service).populate("provider", "name email");

    if (!selectedService || !selectedService.isActive) {
      const error = new Error("Service not found");
      error.statusCode = 404;
      throw error;
    }
  }

  await clearExpiredPendingBookings({
    bookingDate: date,
    timeSlot,
    service,
    bookingCategory: resolvedCategory,
  });

  const existingBooking = await Booking.findOne(
    buildExistingBookingQuery({
      bookingDate: date,
      timeSlot,
      service,
      bookingCategory: resolvedCategory,
    })
  );

  if (existingBooking) {
    const error = new Error("This time slot is already booked");
    error.statusCode = 400;
    throw error;
  }

  const amount = await calculateBookingAmount({
    bookingCategory: resolvedCategory,
    service: selectedService,
    appointmentType,
    groomingPackage,
    petSize,
  });

  return {
    resolvedCategory,
    bookingDate: date,
    serviceDoc: selectedService,
    amount,
  };
};

const createRazorpayOrder = async ({ bookingId, amount }) => {
  ensureRazorpayConfigured();
  const razorpay = getRazorpayClient();

  return razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency: "INR",
    receipt: `booking_${bookingId}`,
    notes: {
      bookingId: bookingId.toString(),
    },
  });
};

const getBookingTitle = (booking) => {
  if (booking.bookingCategory === "service") {
    return booking.service?.name || "Service Booking";
  }

  if (booking.bookingCategory === "vet") {
    return booking.appointmentType
      ? `Vet ${booking.appointmentType.charAt(0).toUpperCase()}${booking.appointmentType.slice(1)}`
      : "Vet Appointment";
  }

  if (booking.bookingCategory === "grooming") {
    return booking.groomingPackage ? `Grooming ${booking.groomingPackage}` : "Grooming Booking";
  }

  return "Booking";
};

const getBookingSummaryLines = (booking) => {
  const lines = [
    `Pet: ${booking.pet?.name || "Pet"}`,
    `Booking: ${getBookingTitle(booking)}`,
    `Date: ${new Date(booking.bookingDate).toDateString()}`,
    `Time Slot: ${booking.timeSlot}`,
    `Status: ${booking.status}`,
    `Payment Method: ${booking.paymentMethod === "pay-later" ? "Pay Later / At Service" : "Online Payment"}`,
    `Payment: ${booking.paymentStatus} (${booking.currency || "INR"} ${booking.amount || 0})`
  ];

  if (booking.bookingCategory === "service" && booking.service?.provider?.name) {
    lines.push(`Provider: ${booking.service.provider.name}`);
    lines.push(`Delivered By: ${booking.service.serviceSource === "petxhub" ? "PetXHub" : "Partner Provider"}`);
    lines.push(`Fulfillment: ${booking.service.fulfillmentMode || "partner-location"}`);
    if (booking.service.fulfillmentMode === "at-home") {
      lines.push("Location: Provider will visit your location");
    } else if (booking.service.fulfillmentMode === "online") {
      lines.push("Location: Online service");
    } else {
      const locationParts = [
        booking.service.locationName,
        booking.service.address,
      ].filter(Boolean);

      if (locationParts.length > 0) {
        lines.push(`Location: ${locationParts.join(", ")}`);
      }
    }
  }

  if (booking.bookingCategory === "vet" && booking.appointmentMode) {
    lines.push(`Mode: ${booking.appointmentMode}`);
  }

  if (booking.bookingCategory === "grooming") {
    if (booking.groomingMode) {
      lines.push(`Mode: ${booking.groomingMode}`);
    }
    if (booking.petSize) {
      lines.push(`Pet Size: ${booking.petSize}`);
    }
  }

  return lines;
};

const buildBookingEmail = ({ userName, booking, heading, intro }) => {
  const summaryLines = getBookingSummaryLines(booking);
  const text = [
    `Hi ${userName || "Pet Owner"},`,
    intro,
    "",
    ...summaryLines
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <h2>${heading}</h2>
      <p>Hi ${userName || "Pet Owner"},</p>
      <p>${intro}</p>
      <ul>
        ${summaryLines.map((line) => `<li>${line}</li>`).join("")}
      </ul>
    </div>
  `;

  return { text, html };
};

const sendBookingEmail = async ({ booking, subject, heading, intro }) => {
  const recipientEmail = booking.user?.email;

  if (!recipientEmail) {
    return;
  }

  const payload = buildBookingEmail({
    userName: booking.user?.name,
    booking,
    heading,
    intro
  });

  try {
    await sendTransactionalEmail({
      to: recipientEmail,
      subject,
      text: payload.text,
      html: payload.html
    });
  } catch (error) {
    console.error("Booking email failed:", error.message);
  }
};

const createBookingNotification = async ({ booking, title, message, status }) => {
  try {
    await createNotification({
      user: booking.user?._id || booking.user,
      type: "booking",
      title,
      message,
      status,
      actionPath: "/my-bookings",
      relatedModel: "Booking",
      relatedId: booking._id
    });
  } catch (error) {
    console.error("Booking notification failed:", error.message);
  }
};

const populateBooking = (bookingId) =>
  Booking.findById(bookingId)
    .populate("pet")
    .populate("user", "name email")
    .populate({
      path: "service",
      populate: {
        path: "provider",
        select: "name email",
      },
    });

const buildReceiptPayload = (booking) => ({
  receiptNumber: `PTX-${String(booking._id).slice(-8).toUpperCase()}`,
  issuedAt: booking.paidAt || booking.updatedAt || booking.createdAt,
  bookingTitle: getBookingTitle(booking),
  booking,
});

//Create Booking
export const createBooking = async (req, res) => {
  try {
    const {
      pet,
      service,
      bookingCategory,
      appointmentType,
      appointmentMode,
      concern,
      groomingPackage,
      groomingMode,
      petSize,
      notes,
      bookingDate,
      timeSlot,
      paymentMethod,
    } = req.body;

    const resolvedPaymentMethod = paymentMethod === "pay-later" ? "pay-later" : "online";

    if (resolvedPaymentMethod !== "pay-later" && req.user.role !== "admin") {
      return res.status(400).json({
        message: "Use the online checkout flow for online payments",
      });
    }

    const { resolvedCategory, bookingDate: date, amount } = await validateBookingPayload({
      pet,
      service,
      bookingCategory,
      appointmentType,
      groomingPackage,
      petSize,
      bookingDate,
      timeSlot,
    });

    const booking = await Booking.create({
      user: req.user._id,
      pet,
      service,
      bookingCategory: resolvedCategory,
      appointmentType,
      appointmentMode: appointmentMode || "in-clinic",
      concern,
      groomingPackage,
      groomingMode: groomingMode || "in-salon",
      petSize,
      notes,
      bookingDate: date,
      timeSlot,
      amount,
      currency: "INR",
      paymentMethod: resolvedPaymentMethod,
      paymentStatus: req.user.role === "admin" && resolvedPaymentMethod === "online" ? "paid" : "pending",
      status: req.user.role === "admin" && resolvedPaymentMethod === "online" ? "confirmed" : "confirmed",
      paidAt: req.user.role === "admin" && resolvedPaymentMethod === "online" ? new Date() : undefined,
    });

    const populatedBooking = await populateBooking(booking._id);

    await sendBookingEmail({
      booking: populatedBooking,
      subject:
        resolvedPaymentMethod === "pay-later"
          ? `Booking reserved for ${getBookingTitle(populatedBooking)}`
          : `Booking confirmed for ${getBookingTitle(populatedBooking)}`,
      heading: resolvedPaymentMethod === "pay-later" ? "Booking Reserved" : "Booking Confirmed",
      intro:
        resolvedPaymentMethod === "pay-later"
          ? "Your booking has been reserved successfully in PetxHub. You can pay later or at the time of service."
          : "Your booking has been created successfully in PetxHub."
    });

    await createBookingNotification({
      booking: populatedBooking,
      title: resolvedPaymentMethod === "pay-later" ? "Booking Reserved" : "Booking Confirmed",
      message: `${getBookingTitle(populatedBooking)} has been booked for ${new Date(populatedBooking.bookingDate).toDateString()} at ${populatedBooking.timeSlot}.`,
      status: "confirmed",
    });

    res.status(201).json({
      message: "Booking created successfully",
      booking: populatedBooking,
    });

  } catch (error) {
    console.log("BOOKING ERROR:", error);
    res.status(error.statusCode || 500).json({
      message: error.message,
    });
  }
};

export const createBookingOrder = async (req, res) => {
  let booking;

  try {
    const {
      pet,
      service,
      bookingCategory,
      appointmentType,
      appointmentMode,
      concern,
      groomingPackage,
      groomingMode,
      petSize,
      notes,
      bookingDate,
      timeSlot,
      paymentMethod,
    } = req.body;

    if (paymentMethod && paymentMethod !== "online") {
      return res.status(400).json({
        message: "Online order creation is only available for online payments",
      });
    }

    const { resolvedCategory, bookingDate: normalizedDate, amount } = await validateBookingPayload({
      pet,
      service,
      bookingCategory,
      appointmentType,
      groomingPackage,
      petSize,
      bookingDate,
      timeSlot,
    });

    if (!amount || amount <= 0) {
      return res.status(400).json({
        message: "Unable to determine booking amount for payment",
      });
    }

    booking = await Booking.create({
      user: req.user._id,
      pet,
      service,
      bookingCategory: resolvedCategory,
      appointmentType,
      appointmentMode: appointmentMode || "in-clinic",
      concern,
      groomingPackage,
      groomingMode: groomingMode || "in-salon",
      petSize,
      notes,
      bookingDate: normalizedDate,
      timeSlot,
      amount,
      currency: "INR",
      paymentMethod: "online",
      paymentStatus: "pending",
      status: "pending",
    });

    const order = await createRazorpayOrder({
      bookingId: booking._id,
      amount,
    });

    booking.paymentOrderId = order.id;
    await booking.save();

    const populatedBooking = await populateBooking(booking._id);

    res.status(201).json({
      message: "Payment order created successfully",
      booking: populatedBooking,
      order,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    if (booking?._id) {
      try {
        await Booking.findByIdAndDelete(booking._id);
      } catch (cleanupError) {
        console.error("Booking order cleanup failed:", cleanupError.message);
      }
    }

    res.status(error.statusCode || 500).json({
      message: error?.error?.description || error.message,
    });
  }
};

export const createPaymentOrderForBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate({
      path: "service",
      populate: {
        path: "provider",
        select: "name email",
      },
    });

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Not authorized",
      });
    }

    if (booking.paymentStatus === "paid") {
      return res.status(400).json({
        message: "This booking is already paid",
      });
    }

    const amount =
      booking.amount ||
      await calculateBookingAmount({
        bookingCategory: booking.bookingCategory,
        service: booking.service,
        appointmentType: booking.appointmentType,
        groomingPackage: booking.groomingPackage,
        petSize: booking.petSize,
      });

    const order = await createRazorpayOrder({
      bookingId: booking._id,
      amount,
    });

    booking.amount = amount;
    booking.currency = "INR";
    booking.paymentMethod = "online";
    booking.paymentOrderId = order.id;
    booking.paymentStatus = "pending";
    await booking.save();

    const populatedBooking = await populateBooking(booking._id);

    res.json({
      message: "Payment order created successfully",
      booking: populatedBooking,
      order,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error?.error?.description || error.message,
    });
  }
};

export const verifyBookingPayment = async (req, res) => {
  try {
    ensureRazorpayConfigured();

    const {
      bookingId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!bookingId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        message: "Payment verification details are required",
      });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Not authorized",
      });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      booking.paymentStatus = "failed";
      await booking.save();

      return res.status(400).json({
        message: "Payment verification failed",
      });
    }

    if (booking.paymentOrderId && booking.paymentOrderId !== razorpay_order_id) {
      return res.status(400).json({
        message: "Payment order does not match this booking",
      });
    }

    booking.paymentOrderId = razorpay_order_id;
    booking.paymentId = razorpay_payment_id;
    booking.paymentSignature = razorpay_signature;
    booking.paymentMethod = "online";
    booking.paymentStatus = "paid";
    booking.status = "confirmed";
    booking.paidAt = new Date();
    await booking.save();

    const populatedBooking = await populateBooking(booking._id);

    await sendBookingEmail({
      booking: populatedBooking,
      subject: `Payment received for ${getBookingTitle(populatedBooking)}`,
      heading: "Payment Successful",
      intro: "Your payment was successful and your booking is now confirmed in PetxHub."
    });

    await createBookingNotification({
      booking: populatedBooking,
      title: "Payment Successful",
      message: `${getBookingTitle(populatedBooking)} is confirmed and paid for ${new Date(populatedBooking.bookingDate).toDateString()} at ${populatedBooking.timeSlot}.`,
      status: "confirmed"
    });

    res.json({
      message: "Payment verified successfully",
      booking: populatedBooking,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error?.error?.description || error.message,
    });
  }
};

export const markBookingPaymentFailed = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Not authorized",
      });
    }

    if (booking.paymentStatus === "paid") {
      return res.status(400).json({
        message: "Paid bookings cannot be marked as failed",
      });
    }

    booking.paymentStatus = "failed";
    booking.paymentOrderId = "";
    booking.paymentId = "";
    booking.paymentSignature = "";
    await booking.save();

    return res.json({
      message: "Booking payment marked as failed",
      booking,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

export const rescheduleBooking = async (req, res) => {
  try {
    const { bookingDate, timeSlot } = req.body;

    if (!bookingDate || !timeSlot) {
      return res.status(400).json({
        message: "Booking date and time slot are required",
      });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Not authorized",
      });
    }

    if (booking.status === "cancelled" || booking.status === "completed") {
      return res.status(400).json({
        message: "This booking cannot be rescheduled",
      });
    }

    const date = normalizeBookingDate(bookingDate);

    if (!date) {
      return res.status(400).json({
        message: "Invalid booking date",
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date < today) {
      return res.status(400).json({
        message: "Booking date cannot be in the past",
      });
    }

    if (!VET_TIME_SLOTS.includes(timeSlot)) {
      return res.status(400).json({
        message: "Invalid time slot selected",
      });
    }

    if (isPastTimeSlot(date, timeSlot)) {
      return res.status(400).json({
        message: "This time slot has already passed",
      });
    }

    const existingBooking = await Booking.findOne(
      buildExistingBookingQuery({
        bookingDate: date,
        timeSlot,
        service: booking.service,
        bookingCategory: booking.bookingCategory,
        bookingId: booking._id,
      })
    );

    if (existingBooking) {
      return res.status(400).json({
        message: "This time slot is already booked",
      });
    }

    booking.bookingDate = date;
    booking.timeSlot = timeSlot;
    booking.status = "pending";
    await booking.save();

    const updatedBooking = await populateBooking(booking._id);

    await sendBookingEmail({
      booking: updatedBooking,
      subject: `Booking rescheduled for ${getBookingTitle(updatedBooking)}`,
      heading: "Booking Rescheduled",
      intro: "Your booking has been rescheduled successfully in PetxHub."
    });

    await createBookingNotification({
      booking: updatedBooking,
      title: "Booking Rescheduled",
      message: `${getBookingTitle(updatedBooking)} was moved to ${new Date(updatedBooking.bookingDate).toDateString()} at ${updatedBooking.timeSlot}.`,
      status: "pending"
    });

    res.json({
      message: "Booking rescheduled successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getAvailableSlots = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { date, category } = req.query;

    if (!date) {
      return res.status(400).json({
        message: "Date is required",
      });
    }

    const bookingDate = normalizeBookingDate(date);

    if (!bookingDate) {
      return res.status(400).json({
        message: "Invalid date",
      });
    }

    const bookingQuery = {
      bookingDate,
      status: { $ne: "cancelled" },
    };

    if (serviceId) {
      bookingQuery.service = serviceId;
    } else {
      if (!["vet", "grooming"].includes(category)) {
        return res.status(400).json({
          message: "Valid booking category is required",
        });
      }

      bookingQuery.bookingCategory = category;
    }

    const bookings = await Booking.find(bookingQuery).select("timeSlot paymentStatus createdAt");
    const pricingSettings = await getBookingPricingSettings();
    const expiredPendingCutoff = new Date();
    expiredPendingCutoff.setMinutes(
      expiredPendingCutoff.getMinutes() - (pricingSettings.unpaidBookingHoldMinutes || 15)
    );

    const filteredBookings = bookings.filter((booking) => {
      if (booking.paymentStatus === "failed") {
        return false;
      }

      if (booking.paymentStatus !== "pending") {
        return true;
      }

      return booking.createdAt && booking.createdAt >= expiredPendingCutoff;
    });

    const bookedSlots = new Set(filteredBookings.map((booking) => booking.timeSlot));
    const slots = VET_TIME_SLOTS.map((slot) => ({
      value: slot,
      isBooked: bookedSlots.has(slot) || isPastTimeSlot(bookingDate, slot),
    }));

    res.json({
      date: bookingDate,
      slots,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

//fetching bookings
export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({
      user: req.user._id,
    })
      .sort({ createdAt: -1, bookingDate: -1 })
      .populate("pet")
      .populate({
        path: "service",
        populate: {
          path: "provider",
          select: "name email",
        },
      });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getBookingReceipt = async (req, res) => {
  try {
    const booking = await populateBooking(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    if (booking.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Not authorized",
      });
    }

    if (booking.paymentStatus !== "paid") {
      return res.status(400).json({
        message: "Receipt is only available for paid bookings",
      });
    }

    return res.json(buildReceiptPayload(booking));
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

//fetching bookings for providers
export const getProviderBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("pet")
      .populate("user", "name email")
      .populate({
        path: "service",
        match: { provider: req.user._id },
        populate: {
          path: "provider",
          select: "name email",
        },
      });

    const filteredBookings = bookings.filter((b) => b.service !== null);

    res.json(filteredBookings);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getManageableBookings = async (req, res) => {
  try {
    if (req.user.role === "admin") {
      const bookings = await Booking.find()
        .populate("pet")
        .populate("user", "name email")
        .populate({
          path: "service",
          populate: {
            path: "provider",
            select: "name email",
          },
        })
        .sort({ bookingDate: 1, createdAt: -1 });

      return res.json(bookings);
    }

    if (req.user.role === "provider") {
      const bookings = await Booking.find()
        .populate("pet")
        .populate("user", "name email")
        .populate({
          path: "service",
          match: { provider: req.user._id },
          populate: {
            path: "provider",
            select: "name email",
          },
        })
        .sort({ bookingDate: 1, createdAt: -1 });

      const filteredBookings = bookings.filter((booking) => booking.service !== null);
      return res.json(filteredBookings);
    }

    return res.status(403).json({
      message: "Not authorized",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

//provider updating booking status
export const upadatingBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const booking = await Booking.findById(req.params.id).populate("service");

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    if (req.user.role === "admin") {
      booking.status = status;
      await booking.save();

      const updatedBooking = await populateBooking(booking._id);

      await sendBookingEmail({
        booking: updatedBooking,
        subject: `Booking status updated for ${getBookingTitle(updatedBooking)}`,
        heading: "Booking Status Updated",
        intro: `Your booking status has been updated to ${updatedBooking.status}.`
      });

      await createBookingNotification({
        booking: updatedBooking,
        title: "Booking Status Updated",
        message: `${getBookingTitle(updatedBooking)} is now ${updatedBooking.status}.`,
        status: updatedBooking.status
      });

      return res.json({
        message: "Booking status updated",
        booking: updatedBooking,
      });
    }

    if (!booking.service) {
      return res.status(400).json({
        message: "This booking is not linked to a provider service",
      });
    }

    if (booking.service.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Not authorized",
      });
    }

    booking.status = status;
    await booking.save();

    const updatedBooking = await populateBooking(booking._id);

    await sendBookingEmail({
      booking: updatedBooking,
      subject: `Booking status updated for ${getBookingTitle(updatedBooking)}`,
      heading: "Booking Status Updated",
      intro: `Your booking status has been updated to ${updatedBooking.status}.`
    });

    await createBookingNotification({
      booking: updatedBooking,
      title: "Booking Status Updated",
      message: `${getBookingTitle(updatedBooking)} is now ${updatedBooking.status}.`,
      status: updatedBooking.status
    });

    res.json({
      message: "Booking status updated",
      booking: updatedBooking,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

//cancel booking by user
export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found"
      });
    }

    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        messsage: "Not authorized"
      });
    }

    booking.status = "cancelled";
    await booking.save();

    const updatedBooking = await populateBooking(booking._id);

    await sendBookingEmail({
      booking: updatedBooking,
      subject: `Booking cancelled for ${getBookingTitle(updatedBooking)}`,
      heading: "Booking Cancelled",
      intro: "Your booking has been cancelled successfully in PetxHub."
    });

    await createBookingNotification({
      booking: updatedBooking,
      title: "Booking Cancelled",
      message: `${getBookingTitle(updatedBooking)} was cancelled.`,
      status: "cancelled"
    });

    res.json({
      message: "Booking cancelled",
      booking: updatedBooking
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error.message
    });
  }
};
