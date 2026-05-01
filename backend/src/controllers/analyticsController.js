import User from "../models/user.js";
import Pet from "../models/pet.js";
import Service from "../models/service.js";
import Booking from "../models/booking.js";
import AdoptionRequest from "../models/adoptionRequest.js";
import HealthRecord from "../models/healthRecords.js";
import ContactMessage from "../models/contactMessage.js";
import { formatReminder } from "./healthController.js";

const buildCountMap = (items) =>
  items.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

export const getAdminAnalytics = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const [
      roleCounts,
      petCount,
      serviceTypeCounts,
      serviceModeCounts,
      bookingStatusCounts,
      bookingCategoryCounts,
      paymentStatusCounts,
      bookingRevenue,
      adoptionStatusCounts,
      contactStatusCounts,
      reminderRecords,
      recentBookings,
      recentAdoptions,
      recentServices,
    ] = await Promise.all([
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      Pet.countDocuments(),
      Service.aggregate([{ $group: { _id: "$serviceSource", count: { $sum: 1 } } }]),
      Service.aggregate([{ $group: { _id: "$fulfillmentMode", count: { $sum: 1 } } }]),
      Booking.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Booking.aggregate([{ $group: { _id: "$bookingCategory", count: { $sum: 1 } } }]),
      Booking.aggregate([{ $group: { _id: "$paymentStatus", count: { $sum: 1 } } }]),
      Booking.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $group: { _id: null, totalRevenue: { $sum: "$amount" }, paidBookings: { $sum: 1 } } }
      ]),
      AdoptionRequest.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      ContactMessage.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      HealthRecord.find({ reminderEnabled: true }).select("pet reminderDate title reminderStatus completedAt").populate("pet", "name"),
      Booking.find().sort({ createdAt: -1 }).limit(5).populate("pet", "name").populate("user", "name email").populate({
        path: "service",
        populate: { path: "provider", select: "name email" }
      }),
      AdoptionRequest.find().sort({ createdAt: -1 }).limit(5).populate("pet", "name breed").populate("requester", "name email").populate("owner", "name email"),
      Service.find().sort({ createdAt: -1 }).limit(5).populate("provider", "name email"),
    ]);

    const reminderSummary = { overdue: 0, dueSoon: 0, scheduled: 0, completed: 0 };

    reminderRecords.forEach((record) => {
      const formatted = formatReminder(record);
      if (formatted.reminderStatus && reminderSummary[formatted.reminderStatus] !== undefined) {
        reminderSummary[formatted.reminderStatus] += 1;
      }
    });

    const bookingRevenueSummary = bookingRevenue?.[0] || { totalRevenue: 0, paidBookings: 0 };

    res.json({
      summary: {
        users: {
          total: roleCounts.reduce((sum, item) => sum + item.count, 0),
          user: buildCountMap(roleCounts).user || 0,
          provider: buildCountMap(roleCounts).provider || 0,
          admin: buildCountMap(roleCounts).admin || 0,
        },
        pets: {
          total: petCount,
        },
        services: {
          total: serviceTypeCounts.reduce((sum, item) => sum + item.count, 0),
          petxhub: buildCountMap(serviceTypeCounts).petxhub || 0,
          partner: buildCountMap(serviceTypeCounts).partner || 0,
          inStore: buildCountMap(serviceModeCounts)["in-store"] || 0,
          partnerLocation: buildCountMap(serviceModeCounts)["partner-location"] || 0,
          atHome: buildCountMap(serviceModeCounts)["at-home"] || 0,
          online: buildCountMap(serviceModeCounts).online || 0,
        },
        bookings: {
          total: bookingStatusCounts.reduce((sum, item) => sum + item.count, 0),
          pending: buildCountMap(bookingStatusCounts).pending || 0,
          confirmed: buildCountMap(bookingStatusCounts).confirmed || 0,
          completed: buildCountMap(bookingStatusCounts).completed || 0,
          cancelled: buildCountMap(bookingStatusCounts).cancelled || 0,
          paid: buildCountMap(paymentStatusCounts).paid || 0,
          paymentPending: buildCountMap(paymentStatusCounts).pending || 0,
          paymentFailed: buildCountMap(paymentStatusCounts).failed || 0,
          revenue: bookingRevenueSummary.totalRevenue || 0,
          paidBookings: bookingRevenueSummary.paidBookings || 0,
        },
        adoptions: {
          total: adoptionStatusCounts.reduce((sum, item) => sum + item.count, 0),
          pending: buildCountMap(adoptionStatusCounts).pending || 0,
          approved: buildCountMap(adoptionStatusCounts).approved || 0,
          rejected: buildCountMap(adoptionStatusCounts).rejected || 0,
        },
        contactMessages: {
          total: contactStatusCounts.reduce((sum, item) => sum + item.count, 0),
          new: buildCountMap(contactStatusCounts).new || 0,
          inProgress: buildCountMap(contactStatusCounts)["in-progress"] || 0,
          reviewed: buildCountMap(contactStatusCounts).reviewed || 0,
          resolved: buildCountMap(contactStatusCounts).resolved || 0,
        },
        reminders: {
          total: reminderRecords.length,
          overdue: reminderSummary.overdue,
          dueSoon: reminderSummary.dueSoon,
          scheduled: reminderSummary.scheduled,
          completed: reminderSummary.completed,
        },
      },
      recentBookings,
      recentAdoptions,
      recentServices,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
