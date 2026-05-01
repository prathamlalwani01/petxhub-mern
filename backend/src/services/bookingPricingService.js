import { getOrCreateBookingSettings } from "../controllers/bookingSettingsController.js";

export const DEFAULT_VET_PRICING = {
  consultation: 499,
  vaccination: 799,
  diagnostics: 999,
  surgery: 1499,
  emergency: 1299,
  dental: 899,
};

export const DEFAULT_GROOMING_BASE_PRICING = {
  "haircut-styling": 999,
  "paw-nail-care": 499,
  "ear-eye-cleaning": 449,
  "bath-blow-dry": 799,
  "bath-brush": 699,
  "full-grooming": 1199,
  "tick-treatment": 899,
  "spa-skin": 1099,
};

export const DEFAULT_GROOMING_SIZE_SURCHARGE = {
  small: 0,
  medium: 150,
  large: 300,
  giant: 450,
};

export const getBookingPricingSettings = async () => {
  const settings = await getOrCreateBookingSettings();

  return {
    vetPricing: settings.vetPricing?.toObject?.() || DEFAULT_VET_PRICING,
    groomingBasePricing: settings.groomingBasePricing?.toObject?.() || DEFAULT_GROOMING_BASE_PRICING,
    groomingSizeSurcharge: settings.groomingSizeSurcharge?.toObject?.() || DEFAULT_GROOMING_SIZE_SURCHARGE,
    unpaidBookingHoldMinutes: settings.unpaidBookingHoldMinutes || 15,
  };
};

export const calculateBookingAmount = async ({
  bookingCategory,
  service,
  appointmentType,
  groomingPackage,
  petSize,
}) => {
  if (bookingCategory === "service") {
    return Number(service?.price || 0);
  }

  const pricing = await getBookingPricingSettings();

  if (bookingCategory === "vet") {
    return pricing.vetPricing[appointmentType] || pricing.vetPricing.consultation;
  }

  if (bookingCategory === "grooming") {
    return (pricing.groomingBasePricing[groomingPackage] || 0) + (pricing.groomingSizeSurcharge[petSize] || 0);
  }

  return 0;
};
