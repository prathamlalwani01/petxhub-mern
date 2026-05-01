import Notification from "../models/notification.js";
import Booking from "../models/booking.js";
import AdoptionRequest from "../models/adoptionRequest.js";
import HealthRecord from "../models/healthRecords.js";
import Pet from "../models/pet.js";
import { formatReminder } from "./healthController.js";
import { createUniqueNotification } from "../services/notificationService.js";

const getReminderMessage = (reminder) => {
  if (reminder.reminderStatus === "overdue") {
    return `${reminder.petName}: ${reminder.title} is overdue.`;
  }

  if (reminder.reminderStatus === "due-soon") {
    return `${reminder.petName}: ${reminder.title} is due soon.`;
  }

  if (reminder.reminderStatus === "completed") {
    return `${reminder.petName}: ${reminder.title} has been completed.`;
  }

  return `${reminder.petName}: ${reminder.title} is scheduled.`;
};

const getBookingTitle = (booking) => {
  if (booking.bookingCategory === "service") {
    return booking.service?.name || "service booking";
  }

  if (booking.bookingCategory === "vet") {
    return `${booking.appointmentType || "vet"} booking`;
  }

  return `${booking.groomingPackage || "grooming"} booking`;
};

const getBookingMessage = (booking) =>
  `${booking.pet?.name || "Your pet"} has a ${booking.status} ${getBookingTitle(booking)} on ${new Date(booking.bookingDate).toDateString()} at ${booking.timeSlot}.`;

const getAdoptionMessage = (request, currentUserId) => {
  if (request.owner?._id?.toString() === currentUserId.toString()) {
    return `${request.requester?.name || "Someone"} sent an adoption request for ${request.pet?.name || "your pet"}.`;
  }

  return `Your adoption request for ${request.pet?.name || "a pet"} is ${request.status}.`;
};

const syncReminderNotifications = async (userId) => {
  const pets = await Pet.find({ owner: userId }).select("_id name");
  const petIds = pets.map((pet) => pet._id);
  const petNameById = new Map(pets.map((pet) => [pet._id.toString(), pet.name]));

  const records = await HealthRecord.find({
    pet: { $in: petIds }
  }).sort({ updatedAt: -1 });

  for (const record of records) {
    const formatted = formatReminder(record);

    if (formatted.reminderStatus === "none") {
      continue;
    }

    const petName = petNameById.get(record.pet.toString()) || "Pet";
    const cycleKey = record.reminderDate
      ? new Date(record.reminderDate).toISOString().split("T")[0]
      : "no-date";

    await createUniqueNotification({
      user: userId,
      type: "reminder",
      title: "Care Reminder",
      message: getReminderMessage({ ...formatted, petName }),
      status: formatted.reminderStatus,
      actionPath: "/health-records",
      relatedModel: "HealthRecord",
      relatedId: record._id,
      dedupeKey: `backfill-reminder-${record._id}-${formatted.reminderStatus}-${cycleKey}`
    });
  }
};

const syncBookingNotifications = async (userId) => {
  const bookings = await Booking.find({ user: userId })
    .populate("pet")
    .populate({
      path: "service",
      populate: {
        path: "provider",
        select: "name email"
      }
    })
    .sort({ updatedAt: -1 });

  for (const booking of bookings) {
    await createUniqueNotification({
      user: userId,
      type: "booking",
      title: "Booking Update",
      message: getBookingMessage(booking),
      status: booking.status,
      actionPath: "/my-bookings",
      relatedModel: "Booking",
      relatedId: booking._id,
      dedupeKey: `backfill-booking-${booking._id}-${booking.status}-${booking.updatedAt?.toISOString?.() || booking.updatedAt}`
    });
  }
};

const syncAdoptionNotifications = async (userId) => {
  const [incomingRequests, outgoingRequests] = await Promise.all([
    AdoptionRequest.find({ owner: userId })
      .populate("requester", "name email phone")
      .populate("pet", "name breed photo adoptionStatus")
      .populate("owner", "name email phone")
      .sort({ updatedAt: -1 }),
    AdoptionRequest.find({ requester: userId })
      .populate("requester", "name email phone")
      .populate("owner", "name email phone")
      .populate("pet", "name breed photo adoptionStatus")
      .sort({ updatedAt: -1 })
  ]);

  for (const request of [...incomingRequests, ...outgoingRequests]) {
    const perspective = request.owner?._id?.toString() === userId.toString() ? "owner" : "requester";

    await createUniqueNotification({
      user: userId,
      type: "adoption",
      title: "Adoption Activity",
      message: getAdoptionMessage(request, userId),
      status: request.status,
      actionPath: "/adoption-requests",
      relatedModel: "AdoptionRequest",
      relatedId: request._id,
      dedupeKey: `backfill-adoption-${request._id}-${perspective}-${request.status}-${request.updatedAt?.toISOString?.() || request.updatedAt}`
    });
  }
};

const syncNotificationsForUser = async (userId) => {
  await Promise.all([
    syncReminderNotifications(userId),
    syncBookingNotifications(userId),
    syncAdoptionNotifications(userId)
  ]);
};

export const getMyNotifications = async (req, res) => {
  try {
    await syncNotificationsForUser(req.user._id);

    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);

    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      isRead: false
    });

    res.json({
      notifications,
      unreadCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUnreadNotificationCount = async (req, res) => {
  try {
    await syncNotificationsForUser(req.user._id);

    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      isRead: false
    });

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (notification.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({
      message: "Notification marked as read",
      notification
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
