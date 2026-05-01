import HealthRecord from "../models/healthRecords.js";
import { formatReminder } from "../controllers/healthController.js";
import { sendTransactionalEmail } from "./emailService.js";
import { createUniqueNotification } from "./notificationService.js";

const DELIVERY_CHANNELS = ["email", "sms", "whatsapp"];
const DELIVERY_WINDOW_STATUSES = new Set(["due-soon", "overdue"]);
const REMINDER_CHECK_INTERVAL_MS = 60 * 1000;

const getCycleKey = (reminderDate) => new Date(reminderDate).toISOString().split("T")[0];

const hasSuccessfulDeliveryForStatus = (record, channel, reminderStatus, deliveryDateKey) =>
  (record.notificationLog || []).some(
    (entry) =>
      entry.channel === channel &&
      entry.deliveryDateKey === deliveryDateKey &&
      entry.reminderStatus === reminderStatus &&
      entry.status === "sent"
  );

const buildMessage = ({ ownerName, petName, title, reminderDate, reminderNote, reminderStatus }) => {
  const statusText = reminderStatus === "overdue" ? "is overdue" : "is coming up soon";
  const reminderDateLabel = new Date(reminderDate).toDateString();

  return [
    `Hi ${ownerName || "Pet Owner"},`,
    `${petName}'s reminder for "${title}" ${statusText}.`,
    `Reminder date: ${reminderDateLabel}.`,
    reminderNote ? `Note: ${reminderNote}.` : "",
    "Please open PetxHub to review the health record."
  ]
    .filter(Boolean)
    .join(" ");
};

const buildHtmlMessage = ({ ownerName, petName, title, reminderDate, reminderNote, reminderStatus }) => {
  const statusText = reminderStatus === "overdue" ? "is overdue" : "is coming up soon";

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <h2 style="margin-bottom: 12px;">PetxHub Reminder</h2>
      <p>Hi ${ownerName || "Pet Owner"},</p>
      <p><strong>${petName}</strong>'s reminder for <strong>${title}</strong> ${statusText}.</p>
      <p><strong>Reminder date:</strong> ${new Date(reminderDate).toDateString()}</p>
      ${reminderNote ? `<p><strong>Note:</strong> ${reminderNote}</p>` : ""}
      <p>Please open PetxHub to review the health record.</p>
    </div>
  `;
};

const sendEmailReminder = async ({ owner, payload }) => {
  if (!owner.email) {
    throw new Error("Recipient email is missing");
  }

  await sendTransactionalEmail({
    to: owner.email,
    subject: payload.subject,
    text: payload.message,
    html: payload.html
  });
};

const sendSmsReminder = async () => {
  throw new Error("SMS delivery is not configured yet");
};

const sendWhatsAppReminder = async () => {
  throw new Error("WhatsApp delivery is not configured yet");
};

const sendByChannel = async ({ channel, owner, payload }) => {
  if (channel === "email") {
    await sendEmailReminder({ owner, payload });
    return;
  }

  if (channel === "sms") {
    await sendSmsReminder({ owner, payload });
    return;
  }

  if (channel === "whatsapp") {
    await sendWhatsAppReminder({ owner, payload });
  }
};

const processSingleReminder = async (record) => {
  const formatted = formatReminder(record);

  if (!DELIVERY_WINDOW_STATUSES.has(formatted.reminderStatus)) {
    return;
  }

  const owner = record.pet?.owner;
  const pet = record.pet;

  if (!owner || !pet) {
    return;
  }

  const payload = {
    subject: `PetxHub reminder for ${pet.name}`,
    message: buildMessage({
      ownerName: owner.name,
      petName: pet.name,
      title: record.title,
      reminderDate: record.reminderDate,
      reminderNote: record.reminderNote,
      reminderStatus: formatted.reminderStatus
    }),
    html: buildHtmlMessage({
      ownerName: owner.name,
      petName: pet.name,
      title: record.title,
      reminderDate: record.reminderDate,
      reminderNote: record.reminderNote,
      reminderStatus: formatted.reminderStatus
    })
  };
  const deliveryDateKey = getCycleKey(record.reminderDate);

  try {
    await createUniqueNotification({
      user: owner._id || owner,
      type: "reminder",
      title: "Care Reminder",
      message: buildMessage({
        ownerName: owner.name,
        petName: pet.name,
        title: record.title,
        reminderDate: record.reminderDate,
        reminderNote: record.reminderNote,
        reminderStatus: formatted.reminderStatus
      }),
      status: formatted.reminderStatus,
      actionPath: "/health-records",
      relatedModel: "HealthRecord",
      relatedId: record._id,
      dedupeKey: `reminder-${record._id}-${formatted.reminderStatus}-${deliveryDateKey}`
    });
  } catch (error) {
    console.error("Reminder notification failed:", error.message);
  }

  for (const channel of DELIVERY_CHANNELS) {
    if (!formatted.reminderChannels?.[channel]) {
      continue;
    }

    if (hasSuccessfulDeliveryForStatus(record, channel, formatted.reminderStatus, deliveryDateKey)) {
      continue;
    }

    try {
      await sendByChannel({ channel, owner, payload });
      record.notificationLog.push({
        channel,
        deliveryDateKey,
        reminderStatus: formatted.reminderStatus,
        status: "sent",
        sentAt: new Date()
      });
    } catch (error) {
      record.notificationLog.push({
        channel,
        deliveryDateKey,
        reminderStatus: formatted.reminderStatus,
        status: "failed",
        sentAt: new Date(),
        error: error.message
      });
    }
  }

  await record.save();
};

export const processDueReminders = async () => {
  const records = await HealthRecord.find({
    reminderEnabled: true,
    reminderDate: { $ne: null }
  }).populate({
    path: "pet",
    populate: {
      path: "owner",
      select: "name email phone"
    }
  });

  for (const record of records) {
    await processSingleReminder(record);
  }
};

export const startReminderScheduler = () => {
  processDueReminders().catch((error) => {
    console.error("Initial reminder processing failed", error);
  });

  setInterval(() => {
    processDueReminders().catch((error) => {
      console.error("Reminder processing failed", error);
    });
  }, REMINDER_CHECK_INTERVAL_MS);
};
