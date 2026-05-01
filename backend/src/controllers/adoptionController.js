import AdoptionRequest from "../models/adoptionRequest.js";
import Pet from "../models/pet.js";
import User from "../models/user.js";
import { sendTransactionalEmail } from "../services/emailService.js";
import { createNotification } from "../services/notificationService.js";

const sendAdoptionEmail = async ({ to, subject, text, html }) => {
  try {
    await sendTransactionalEmail({ to, subject, text, html });
  } catch (error) {
    console.error("Adoption email failed:", error.message);
  }
};

const sendAdoptionEmailInBackground = (payload) => {
  setImmediate(() => {
    sendAdoptionEmail(payload);
  });
};

const buildOwnerNotificationEmail = ({ ownerName, requester, pet, message }) => {
  const text = [
    `Hi ${ownerName || "Pet Owner"},`,
    `${requester.name} has sent a request to adopt ${pet.name}.`,
    `Requester email: ${requester.email || "Not provided"}`,
    `Requester phone: ${requester.phone || "Not provided"}`,
    message ? `Message: ${message}` : "Message: No message provided.",
    "Open PetxHub to review and approve or reject the request."
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <h2>New Adoption Request</h2>
      <p>Hi ${ownerName || "Pet Owner"},</p>
      <p><strong>${requester.name}</strong> has sent a request to adopt <strong>${pet.name}</strong>.</p>
      <p><strong>Requester email:</strong> ${requester.email || "Not provided"}</p>
      <p><strong>Requester phone:</strong> ${requester.phone || "Not provided"}</p>
      <p><strong>Message:</strong> ${message || "No message provided."}</p>
      <p>Open PetxHub to review and approve or reject the request.</p>
    </div>
  `;

  return { text, html };
};

const buildRequesterAcknowledgementEmail = ({ requesterName, ownerName, petName, message }) => {
  const text = [
    `Hi ${requesterName || "Pet Owner"},`,
    `Your adoption request for ${petName} has been sent to ${ownerName || "the pet owner"}.`,
    message ? `Your message: ${message}` : "",
    "You can track the request status in PetxHub under Adoption Requests."
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <h2>Adoption Request Sent</h2>
      <p>Hi ${requesterName || "Pet Owner"},</p>
      <p>Your adoption request for <strong>${petName}</strong> has been sent to <strong>${ownerName || "the pet owner"}</strong>.</p>
      ${message ? `<p><strong>Your message:</strong> ${message}</p>` : ""}
      <p>You can track the request status in PetxHub under Adoption Requests.</p>
    </div>
  `;

  return { text, html };
};

const buildApprovalEmail = ({ requesterName, petName, ownerName }) => {
  const text = [
    `Hi ${requesterName || "Pet Owner"},`,
    `Your adoption request for ${petName} has been approved by ${ownerName || "the pet owner"}.`,
    "Congratulations. Please open PetxHub to view the updated adoption status."
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <h2>Adoption Approved</h2>
      <p>Hi ${requesterName || "Pet Owner"},</p>
      <p>Your adoption request for <strong>${petName}</strong> has been approved by <strong>${ownerName || "the pet owner"}</strong>.</p>
      <p>Congratulations. Please open PetxHub to view the updated adoption status.</p>
    </div>
  `;

  return { text, html };
};

// Create a new adoption request
export const createAdoptionRequest = async (req, res) => {
  try {
    const { petId, message } = req.body;

    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({ message: "Pet not found" });
    }

    if (pet.owner.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot send an adoption request for your own pet" });
    }

    if (pet.adoptionStatus !== "available") {
      return res.status(400).json({ message: "Pet is not available for adoption" });
    }

    const existingRequest = await AdoptionRequest.findOne({
      requester: req.user._id,
      pet: petId,
      status: "pending"
    });

    if (existingRequest) {
      return res.status(400).json({ message: "You already have a pending request for this pet" });
    }

    const newRequest = await AdoptionRequest.create({
      requester: req.user._id,
      pet: petId,
      owner: pet.owner,
      message: message || ""
    });

    const [requester, owner] = await Promise.all([
      User.findById(req.user._id).select("name email phone"),
      User.findById(pet.owner).select("name email phone")
    ]);

    try {
      await createNotification({
        user: pet.owner,
        type: "adoption",
        title: "New Adoption Request",
        message: `${requester?.name || "Someone"} sent a request to adopt ${pet.name}.`,
        status: "pending",
        actionPath: "/adoption-requests",
        relatedModel: "AdoptionRequest",
        relatedId: newRequest._id
      });

      await createNotification({
        user: req.user._id,
        type: "adoption",
        title: "Adoption Request Sent",
        message: `Your request for ${pet.name} was sent to ${owner?.name || "the pet owner"}.`,
        status: "pending",
        actionPath: "/adoption-requests",
        relatedModel: "AdoptionRequest",
        relatedId: newRequest._id
      });
    } catch (notificationError) {
      console.error("Adoption notification write failed:", notificationError.message);
    }

    if (owner?.email) {
      const ownerEmail = buildOwnerNotificationEmail({
        ownerName: owner.name,
        requester,
        pet,
        message
      });

      sendAdoptionEmailInBackground({
        to: owner.email,
        subject: `New adoption request for ${pet.name}`,
        ...ownerEmail
      });
    }

    if (requester?.email) {
      const requesterEmail = buildRequesterAcknowledgementEmail({
        requesterName: requester.name,
        ownerName: owner?.name,
        petName: pet.name,
        message
      });

      sendAdoptionEmailInBackground({
        to: requester.email,
        subject: `Your adoption request for ${pet.name} has been sent`,
        ...requesterEmail
      });
    }

    res.status(201).json({
      message: "Adoption request sent successfully",
      adoptionRequest: newRequest
    });
  } catch (error) {
    console.error("createAdoptionRequest failed:", error);
    res.status(500).json({ message: error.message || "Failed to create adoption request" });
  }
};

// Get requests received by the logged-in user (as pet owner)
export const getIncomingRequests = async (req, res) => {
  try {
    const requests = await AdoptionRequest.find({ owner: req.user._id })
      .populate("requester", "name email phone")
      .populate("pet", "name breed photo adoptionStatus")
      .sort({ createdAt: -1 });

    res.status(200).json({ requests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get requests sent by the logged-in user
export const getOutgoingRequests = async (req, res) => {
  try {
    const requests = await AdoptionRequest.find({ requester: req.user._id })
      .populate("owner", "name email phone")
      .populate("pet", "name breed photo adoptionStatus")
      .sort({ createdAt: -1 });

    res.status(200).json({ requests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update request status (approve/reject)
export const updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const request = await AdoptionRequest.findById(id).populate("pet");

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to modify this request" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request is already processed" });
    }

    request.status = status;
    await request.save();

    if (status === "approved") {
      const pet = request.pet;
      pet.owner = request.requester;
      pet.adoptionStatus = "adopted";
      await pet.save();

      await AdoptionRequest.updateMany(
        { pet: pet._id, _id: { $ne: request._id }, status: "pending" },
        { $set: { status: "rejected" } }
      );

      const [requester, owner] = await Promise.all([
        User.findById(request.requester).select("name email phone"),
        User.findById(req.user._id).select("name email phone")
      ]);

      if (requester?.email) {
        const approvalEmail = buildApprovalEmail({
          requesterName: requester.name,
          petName: pet.name,
          ownerName: owner?.name
        });

        sendAdoptionEmailInBackground({
          to: requester.email,
          subject: `Your adoption request for ${pet.name} was approved`,
          ...approvalEmail
        });
      }

      try {
        await createNotification({
          user: request.requester,
          type: "adoption",
          title: "Adoption Approved",
          message: `Your adoption request for ${pet.name} was approved.`,
          status: "approved",
          actionPath: "/adoption-requests",
          relatedModel: "AdoptionRequest",
          relatedId: request._id
        });
      } catch (notificationError) {
        console.error("Adoption approval notification failed:", notificationError.message);
      }
    } else {
      try {
        await createNotification({
          user: request.requester,
          type: "adoption",
          title: "Adoption Request Rejected",
          message: `Your adoption request for ${request.pet?.name || "the pet"} was rejected.`,
          status: "rejected",
          actionPath: "/adoption-requests",
          relatedModel: "AdoptionRequest",
          relatedId: request._id
        });
      } catch (notificationError) {
        console.error("Adoption rejection notification failed:", notificationError.message);
      }
    }

    res.status(200).json({
      message: `Request ${status} successfully`,
      adoptionRequest: request
    });
  } catch (error) {
    console.error("updateRequestStatus failed:", error);
    res.status(500).json({ message: error.message || "Failed to update adoption request" });
  }
};
