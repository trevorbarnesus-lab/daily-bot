export const PRODUCT_DISPLAY_NAME = "Daily Bot";

/** Apply the fork name to UI copy before inserting user-supplied values. */
export function brandProductCopy(copy: string, source = copy): string {
  // These labels point to services and downloads operated by upstream.
  if (
    source === "Rakazo Cloud" ||
    source === "Rakazo also has apps for" ||
    source === "Rakazo is open source. If you like it," ||
    source === "Self-host Rakazo"
  )
    return copy;
  return copy.replace(/\bRakazo\b/g, PRODUCT_DISPLAY_NAME);
}
