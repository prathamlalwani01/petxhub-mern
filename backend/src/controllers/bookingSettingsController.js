import BookingSettings from "../models/bookingSettings.js";

const DEFAULT_SETTINGS = {
  singletonKey: "default",
  vetPricing: {
    consultation: 499,
    vaccination: 799,
    diagnostics: 999,
    surgery: 1499,
    emergency: 1299,
    dental: 899,
  },
  groomingBasePricing: {
    "haircut-styling": 999,
    "paw-nail-care": 499,
    "ear-eye-cleaning": 449,
    "bath-blow-dry": 799,
    "bath-brush": 699,
    "full-grooming": 1199,
    "tick-treatment": 899,
    "spa-skin": 1099,
  },
  groomingSizeSurcharge: {
    small: 0,
    medium: 150,
    large: 300,
    giant: 450,
  },
  unpaidBookingHoldMinutes: 15,
};

export const getOrCreateBookingSettings = async () => {
  let settings = await BookingSettings.findOne({ singletonKey: "default" });

  if (!settings) {
    settings = await BookingSettings.create(DEFAULT_SETTINGS);
  }

  return settings;
};

export const getBookingSettings = async (req, res) => {
  try {
    const settings = await getOrCreateBookingSettings();
    res.json({ settings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateBookingSettings = async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can update booking settings",
      });
    }

    const settings = await getOrCreateBookingSettings();
    const {
      vetPricing,
      groomingBasePricing,
      groomingSizeSurcharge,
      unpaidBookingHoldMinutes,
    } = req.body;

    settings.vetPricing = {
      ...settings.vetPricing.toObject(),
      ...vetPricing,
    };
    settings.groomingBasePricing = {
      ...settings.groomingBasePricing.toObject(),
      ...groomingBasePricing,
    };
    settings.groomingSizeSurcharge = {
      ...settings.groomingSizeSurcharge.toObject(),
      ...groomingSizeSurcharge,
    };

    if (unpaidBookingHoldMinutes !== undefined) {
      settings.unpaidBookingHoldMinutes = unpaidBookingHoldMinutes;
    }

    await settings.save();

    res.json({
      message: "Booking settings updated successfully",
      settings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
