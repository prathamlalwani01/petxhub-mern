import HealthRecord from "../models/healthRecords.js";
import Pet from "../models/pet.js";

const REMINDER_WINDOW_DAYS = 7;

const DEFAULT_REMINDER_CHANNELS = {
  inApp: true,
  browser: true,
  email: true,
  sms: false,
  whatsapp: false
};

const DEFAULT_RECURRENCE = {
  enabled: false,
  frequency: "yearly",
  interval: 1
};

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const normalizeReminderChannels = (channels = {}) => ({
  ...DEFAULT_REMINDER_CHANNELS,
  ...Object.fromEntries(
    Object.entries(channels).map(([key, value]) => [key, Boolean(value)])
  )
});

const normalizeRecurrence = (recurrence = {}) => {
  const interval = Number(recurrence.interval);

  return {
    enabled: Boolean(recurrence.enabled),
    frequency: ["weekly", "monthly", "quarterly", "yearly"].includes(recurrence.frequency)
      ? recurrence.frequency
      : DEFAULT_RECURRENCE.frequency,
    interval: Number.isFinite(interval) && interval > 0 ? interval : DEFAULT_RECURRENCE.interval
  };
};

const addRecurrenceToDate = (dateValue, recurrence) => {
  const nextDate = new Date(dateValue);
  const interval = recurrence.interval || 1;

  if (recurrence.frequency === "weekly") {
    nextDate.setDate(nextDate.getDate() + 7 * interval);
    return nextDate;
  }

  if (recurrence.frequency === "monthly") {
    nextDate.setMonth(nextDate.getMonth() + interval);
    return nextDate;
  }

  if (recurrence.frequency === "quarterly") {
    nextDate.setMonth(nextDate.getMonth() + (3 * interval));
    return nextDate;
  }

  nextDate.setFullYear(nextDate.getFullYear() + interval);
  return nextDate;
};

export const formatReminder = (record) => {
  const plainRecord = record.toObject ? record.toObject() : record;
  const today = startOfDay(new Date());
  const recurrence = normalizeRecurrence(plainRecord.recurrence);

  if (plainRecord.reminderCompleted) {
    return {
      ...plainRecord,
      recurrence,
      reminderChannels: normalizeReminderChannels(plainRecord.reminderChannels),
      reminderStatus: "completed",
      daysUntilReminder: null
    };
  }

  if (!plainRecord.reminderEnabled || !plainRecord.reminderDate) {
    return {
      ...plainRecord,
      recurrence,
      reminderChannels: normalizeReminderChannels(plainRecord.reminderChannels),
      reminderStatus: "none",
      daysUntilReminder: null
    };
  }

  const reminderDate = startOfDay(plainRecord.reminderDate);
  const daysUntilReminder = Math.round(
    (reminderDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  let reminderStatus = "scheduled";

  if (daysUntilReminder < 0) {
    reminderStatus = "overdue";
  } else if (daysUntilReminder <= REMINDER_WINDOW_DAYS) {
    reminderStatus = "due-soon";
  }

  return {
    ...plainRecord,
    recurrence,
    reminderChannels: normalizeReminderChannels(plainRecord.reminderChannels),
    daysUntilReminder,
    reminderStatus
  };
};

const ensurePetOwnership = async (petId, userId) => {
  const pet = await Pet.findById(petId);

  if (!pet) {
    return { error: { status: 404, message: "Pet not found" } };
  }

  if (pet.owner.toString() !== userId.toString()) {
    return { error: { status: 403, message: "Not authorized for this pet" } };
  }

  return { pet };
};

const ensureRecordOwnership = async (recordId, userId) => {
  const record = await HealthRecord.findById(recordId);

  if (!record) {
    return { error: { status: 404, message: "Record not found" } };
  }

  const ownership = await ensurePetOwnership(record.pet, userId);

  if (ownership.error) {
    return ownership;
  }

  return { record };
};

export const addHealthRecord = async (req, res) => {
  try {
    const {
      pet,
      type,
      title,
      description,
      date,
      reminderEnabled,
      reminderDate,
      reminderNote,
      reminderChannels,
      recurrence
    } = req.body;

    const ownership = await ensurePetOwnership(pet, req.user._id);

    if (ownership.error) {
      return res.status(ownership.error.status).json({ message: ownership.error.message });
    }

    if (reminderEnabled && !reminderDate) {
      return res.status(400).json({ message: "Reminder date is required when reminders are enabled" });
    }

    const normalizedRecurrence = normalizeRecurrence(recurrence);

    const record = await HealthRecord.create({
      pet,
      type,
      title,
      description,
      date,
      reminderEnabled: Boolean(reminderEnabled && reminderDate),
      reminderDate: reminderEnabled ? reminderDate : null,
      reminderNote: reminderEnabled ? reminderNote : "",
      reminderChannels: reminderEnabled
        ? normalizeReminderChannels(reminderChannels)
        : DEFAULT_REMINDER_CHANNELS,
      recurrence: reminderEnabled ? normalizedRecurrence : DEFAULT_RECURRENCE,
      reminderCompleted: false,
      completedAt: null
    });

    res.status(201).json(formatReminder(record));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPetHealthRecords = async (req, res) => {
  try {
    const ownership = await ensurePetOwnership(req.params.petId, req.user._id);

    if (ownership.error) {
      return res.status(ownership.error.status).json({ message: ownership.error.message });
    }

    const records = await HealthRecord.find({
      pet: req.params.petId
    }).sort({ date: -1 });

    res.json(records.map(formatReminder));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyReminders = async (req, res) => {
  try {
    const pets = await Pet.find({ owner: req.user._id }).select("_id name");
    const petIds = pets.map((pet) => pet._id);
    const petNameById = new Map(pets.map((pet) => [pet._id.toString(), pet.name]));

    const records = await HealthRecord.find({
      pet: { $in: petIds }
    }).sort({ reminderDate: 1, date: -1 });

    const reminders = records
      .map((record) => {
        const formatted = formatReminder(record);
        return {
          ...formatted,
          petName: petNameById.get(record.pet.toString()) || "Pet"
        };
      })
      .filter((record) => record.reminderStatus !== "none");

    const summary = reminders.reduce((accumulator, reminder) => {
      if (reminder.reminderStatus === "overdue") {
        accumulator.overdue += 1;
      } else if (reminder.reminderStatus === "due-soon") {
        accumulator.dueSoon += 1;
      } else if (reminder.reminderStatus === "scheduled") {
        accumulator.scheduled += 1;
      } else if (reminder.reminderStatus === "completed") {
        accumulator.completed += 1;
      }

      return accumulator;
    }, { overdue: 0, dueSoon: 0, scheduled: 0, completed: 0 });

    res.json({
      reminders,
      summary
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteHealthRecord = async (req, res) => {
  try {
    const ownership = await ensureRecordOwnership(req.params.id, req.user._id);

    if (ownership.error) {
      return res.status(ownership.error.status).json({ message: ownership.error.message });
    }

    await ownership.record.deleteOne();

    res.json({ message: "Record deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateHealthRecord = async (req, res) => {
  try {
    const {
      type,
      title,
      description,
      date,
      reminderEnabled,
      reminderDate,
      reminderNote,
      reminderChannels,
      recurrence
    } = req.body;

    const ownership = await ensureRecordOwnership(req.params.id, req.user._id);

    if (ownership.error) {
      return res.status(ownership.error.status).json({ message: ownership.error.message });
    }

    const record = ownership.record;
    const reminderEnabledFlag = typeof reminderEnabled === "boolean"
      ? reminderEnabled
      : record.reminderEnabled;

    record.type = type || record.type;
    record.title = title || record.title;
    record.description = description ?? record.description;
    record.date = date || record.date;

    if (reminderEnabledFlag && !(reminderDate || record.reminderDate)) {
      return res.status(400).json({ message: "Reminder date is required when reminders are enabled" });
    }

    record.reminderEnabled = Boolean(reminderEnabledFlag && (reminderDate || record.reminderDate));
    record.reminderDate = record.reminderEnabled ? (reminderDate || record.reminderDate) : null;
    record.reminderNote = record.reminderEnabled
      ? (reminderNote ?? record.reminderNote)
      : "";
    record.reminderChannels = record.reminderEnabled
      ? normalizeReminderChannels(reminderChannels ?? record.reminderChannels)
      : DEFAULT_REMINDER_CHANNELS;
    record.recurrence = record.reminderEnabled
      ? normalizeRecurrence(recurrence ?? record.recurrence)
      : DEFAULT_RECURRENCE;

    if (record.reminderEnabled) {
      record.reminderCompleted = false;
      record.completedAt = null;
    }

    await record.save();

    res.json(formatReminder(record));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const completeHealthReminder = async (req, res) => {
  try {
    const ownership = await ensureRecordOwnership(req.params.id, req.user._id);

    if (ownership.error) {
      return res.status(ownership.error.status).json({ message: ownership.error.message });
    }

    const record = ownership.record;

    if (!record.reminderEnabled || !record.reminderDate) {
      return res.status(400).json({ message: "This record does not have an active reminder" });
    }

    const normalizedRecurrence = normalizeRecurrence(record.recurrence);
    const completedAt = new Date();

    record.lastCompletedAt = completedAt;

    if (normalizedRecurrence.enabled) {
      const cycleBaseDate = startOfDay(record.reminderDate > completedAt ? record.reminderDate : completedAt);
      record.reminderDate = addRecurrenceToDate(cycleBaseDate, normalizedRecurrence);
      record.reminderCompleted = false;
      record.completedAt = null;
      record.notificationLog = [];
    } else {
      record.reminderCompleted = true;
      record.completedAt = completedAt;
      record.reminderEnabled = false;
    }

    await record.save();

    res.json({
      message: normalizedRecurrence.enabled
        ? "Reminder completed and next occurrence scheduled"
        : "Reminder marked as completed",
      record: formatReminder(record)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
