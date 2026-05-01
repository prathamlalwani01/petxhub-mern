import Service from "../models/service.js";
import User from "../models/user.js";

const DEFAULT_LOCATION = {
  locationName: "PetXHub Groom Studio",
  address: "PetXHub Care Center",
};

const DEFAULT_GROOMING_SERVICES = [
  {
    name: "Haircut & Styling",
    description: "Breed-specific haircut, coat shaping, face trim, and clean finishing for a polished look.",
    price: 999,
    duration: 75,
    serviceSource: "petxhub",
    fulfillmentMode: "partner-location",
  },
  {
    name: "Paw & Nail Care",
    description: "Nail trimming, paw pad cleanup, and hygiene care for better comfort and walking support.",
    price: 499,
    duration: 30,
    serviceSource: "petxhub",
    fulfillmentMode: "partner-location",
  },
  {
    name: "Ear & Eye Cleaning",
    description: "Gentle ear and eye-area cleaning to reduce buildup, irritation, and hygiene discomfort.",
    price: 449,
    duration: 25,
    serviceSource: "petxhub",
    fulfillmentMode: "partner-location",
  },
  {
    name: "Bath & Blow-Dry",
    description: "Deep cleansing bath, coat conditioning, blow-dry, and brushing for a fresh fluffy finish.",
    price: 799,
    duration: 45,
    serviceSource: "petxhub",
    fulfillmentMode: "partner-location",
  },
  {
    name: "Spa & Skin Care",
    description: "Coat nourishment, de-shedding, skin comfort care, and relaxing spa treatment for healthy fur.",
    price: 1099,
    duration: 75,
    serviceSource: "petxhub",
    fulfillmentMode: "partner-location",
  },
];

const findSeedProvider = async () => {
  const admin = await User.findOne({ role: "admin" }).select("_id");
  if (admin) return admin._id;

  const provider = await User.findOne({ role: "provider" }).select("_id");
  if (provider) return provider._id;

  const anyUser = await User.findOne({}).select("_id");
  return anyUser?._id || null;
};

export const seedDefaultServices = async () => {
  try {
    const providerId = await findSeedProvider();

    if (!providerId) {
      console.warn("No users found yet. Skipping default service seeding.");
      return;
    }

    let createdCount = 0;

    for (const service of DEFAULT_GROOMING_SERVICES) {
      const existing = await Service.findOne({ name: service.name }).select("_id");
      if (existing) {
        continue;
      }

      await Service.create({
        ...service,
        ...DEFAULT_LOCATION,
        provider: providerId,
        isActive: true,
      });

      createdCount += 1;
    }

    if (createdCount > 0) {
      console.log(`Seeded ${createdCount} default services.`);
    }
  } catch (error) {
    console.error("Default service seeding failed:", error.message);
  }
};
