import Notification from "../models/notification.js";

export const createNotification = async ({
  user,
  type,
  title,
  message,
  status,
  actionPath,
  relatedModel,
  relatedId
}) => {
  const payload = {
    user,
    type,
    title,
    message,
    status,
    actionPath,
    relatedModel,
    relatedId
  };

  if (!payload.relatedModel) delete payload.relatedModel;
  if (!payload.relatedId) delete payload.relatedId;

  try {
    return await Notification.create(payload);
  } catch (error) {
    if (error?.code === 11000) {
      const existing = await Notification.findOne({
        user,
        relatedModel,
        relatedId,
        title,
        status,
        actionPath
      });

      if (existing) {
        return existing;
      }
    }

    throw error;
  }
};

export const findMatchingNotification = async ({
  user,
  relatedModel,
  relatedId,
  title,
  status,
  actionPath
}) => Notification.findOne({
  user,
  relatedModel,
  relatedId,
  title,
  status,
  actionPath
});

export const createUniqueNotification = async ({
  user,
  type,
  title,
  message,
  status,
  actionPath,
  relatedModel,
  relatedId,
  dedupeKey
}) => {
  const hasDedupeKey = typeof dedupeKey === "string" && dedupeKey.trim().length > 0;
  const query = hasDedupeKey
    ? { user, dedupeKey: dedupeKey.trim() }
    : { user, relatedModel, relatedId, title, status, actionPath };

  const setPayload = {
    type,
    title,
    message,
    status,
    actionPath,
    relatedModel,
    relatedId
  };

  if (!setPayload.relatedModel) delete setPayload.relatedModel;
  if (!setPayload.relatedId) delete setPayload.relatedId;

  const update = {
    $set: setPayload,
    $setOnInsert: {
      isRead: false
    }
  };

  if (hasDedupeKey) {
    update.$set.dedupeKey = dedupeKey.trim();
  } else {
    update.$unset = { dedupeKey: 1 };
  }

  return Notification.findOneAndUpdate(query, update, {
    upsert: true,
    returnDocument: "after",
    setDefaultsOnInsert: true
  });
};
