export const TextUtils = {
  sanitize: (text) => {
    if (!text) return "";
    return text.toString().trim();
  },

  normalizeBoolean: (value) => {
    const normalized = TextUtils.sanitize(value).toLowerCase();
    return ["sí", "si", "true"].includes(normalized);
  },
};

export const PriceUtils = {
  calculateUnitPrice: (rawValue) => {
    if (!rawValue) return 0;
    let bundlePrice = 0;

    if (typeof rawValue === "number") {
      bundlePrice = rawValue;
    } else {
      const cleanString = rawValue.replace(/\./g, "").replace(",", ".");
      bundlePrice = parseFloat(cleanString);
    }

    if (isNaN(bundlePrice) || bundlePrice <= 0) return 0;

    return bundlePrice / 50;
  },
};
