import mongoose from "mongoose";

const bookingSettingsSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      default: "default",
      unique: true,
    },
    vetPricing: {
      consultation: { type: Number, default: 499, min: 0 },
      vaccination: { type: Number, default: 799, min: 0 },
      diagnostics: { type: Number, default: 999, min: 0 },
      surgery: { type: Number, default: 1499, min: 0 },
      emergency: { type: Number, default: 1299, min: 0 },
      dental: { type: Number, default: 899, min: 0 },
    },
    groomingBasePricing: {
      "haircut-styling": { type: Number, default: 999, min: 0 },
      "paw-nail-care": { type: Number, default: 499, min: 0 },
      "ear-eye-cleaning": { type: Number, default: 449, min: 0 },
      "bath-blow-dry": { type: Number, default: 799, min: 0 },
      "bath-brush": { type: Number, default: 699, min: 0 },
      "full-grooming": { type: Number, default: 1199, min: 0 },
      "tick-treatment": { type: Number, default: 899, min: 0 },
      "spa-skin": { type: Number, default: 1099, min: 0 },
    },
    groomingSizeSurcharge: {
      small: { type: Number, default: 0, min: 0 },
      medium: { type: Number, default: 150, min: 0 },
      large: { type: Number, default: 300, min: 0 },
      giant: { type: Number, default: 450, min: 0 },
    },
    unpaidBookingHoldMinutes: {
      type: Number,
      default: 15,
      min: 1,
      max: 120,
    },
  },
  { timestamps: true }
);

export default mongoose.model("BookingSettings", bookingSettingsSchema);
