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

export const VET_PRICING = DEFAULT_VET_PRICING;
export const GROOMING_BASE_PRICING = DEFAULT_GROOMING_BASE_PRICING;
export const GROOMING_SIZE_SURCHARGE = DEFAULT_GROOMING_SIZE_SURCHARGE;

export const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
