// Turns a DRF error response into { fields: {...}, general: "..." }
export function parseError(error) {
  const data = error?.response?.data;
  if (!data || typeof data !== "object") {
    return { fields: {}, general: "Could not reach the server. Please try again." };
  }
  const { detail, non_field_errors, ...fields } = data;
  const flat = {};
  Object.entries(fields).forEach(([key, value]) => {
    flat[key] = Array.isArray(value) ? value.join(" ") : String(value);
  });
  const general = detail || (non_field_errors ? non_field_errors.join(" ") : "");
  return { fields: flat, general };
}