import Service from "../models/service.js";
//creating service
export const createService = async (req, res) => {
  try {
    //only providers can create the service
    if (req.user.role !== "provider") {
      return res.status(403).json({
        message: "Not authorized to create the service",
      });
    }

    const {
      name,
      description,
      price,
      duration,
      serviceSource,
      fulfillmentMode,
      locationName,
      address,
      mapLink,
      imageUrl,
    } = req.body;

    const resolvedSource = serviceSource || "partner";
    const resolvedMode = fulfillmentMode || "partner-location";
    const requiresPhysicalLocation = ["in-store", "partner-location"].includes(resolvedMode);

    if (requiresPhysicalLocation && (!locationName || !address)) {
      return res.status(400).json({
        message: "Location name and address are required for in-person services",
      });
    }

    const service = await Service.create({
      name,
      description,
      price,
      duration,
      serviceSource: resolvedSource,
      fulfillmentMode: resolvedMode,
      locationName: locationName?.trim() || "",
      address: address?.trim() || "",
      mapLink: mapLink?.trim() || "",
      imageUrl: imageUrl?.trim() || "",
      provider: req.user._id,
    });
    res.status(201).json({
      message: "Service Created Successfully",
      service,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
//get all services
export const getAllServices = async (req, res) => {
  try {
    const services = await Service.find().populate("provider", "name email");

    return res.status(200).json({
      message: "Services:",
      services,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
//getting my services(for providers)
export const getMyServices = async (req, res) => {
    try {
      const services = await Service.find({
        provider: req.user._id,
      });
  
      res.json(services);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };

export const updateService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        message: "Service not found",
      });
    }

    if (req.user.role !== "admin" && service.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Not authorized to update this service",
      });
    }

    const {
      name,
      description,
      price,
      duration,
      serviceSource,
      fulfillmentMode,
      locationName,
      address,
      mapLink,
      imageUrl,
      isActive,
    } = req.body;

    const resolvedMode = fulfillmentMode ?? service.fulfillmentMode;
    const requiresPhysicalLocation = ["in-store", "partner-location"].includes(resolvedMode);

    const nextLocationName = locationName !== undefined ? locationName?.trim() || "" : service.locationName || "";
    const nextAddress = address !== undefined ? address?.trim() || "" : service.address || "";

    if (requiresPhysicalLocation && (!nextLocationName || !nextAddress)) {
      return res.status(400).json({
        message: "Location name and address are required for in-person services",
      });
    }

    service.name = name ?? service.name;
    service.description = description ?? service.description;
    service.price = price ?? service.price;
    service.duration = duration ?? service.duration;
    service.serviceSource = serviceSource ?? service.serviceSource;
    service.fulfillmentMode = resolvedMode;
    service.locationName = nextLocationName;
    service.address = nextAddress;
    service.mapLink = mapLink !== undefined ? mapLink?.trim() || "" : service.mapLink;
    service.imageUrl = imageUrl !== undefined ? imageUrl?.trim() || "" : service.imageUrl;
    if (typeof isActive === "boolean") {
      service.isActive = isActive;
    }

    const updatedService = await service.save();

    res.json({
      message: "Service updated successfully",
      service: updatedService,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        message: "Service not found",
      });
    }

    if (req.user.role !== "admin" && service.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Not authorized to delete this service",
      });
    }

    await service.deleteOne();

    res.json({
      message: "Service deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
