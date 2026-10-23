import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
const css = readFileSync(
  new URL("../src/app/elzatona.tokens.css", import.meta.url),
  "utf8",
);
function token(name: string) {
  const found = css.match(new RegExp(`--ez-${name}:\\s*(#[a-fA-F0-9]{6})`));
  if (!found) throw new Error(`Missing token: ${name}`);
  return found[1];
}
function luminance(hex: string) {
  const rgb = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const x = luminance(token(a)),
    y = luminance(token(b));
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
it.each([
  ["on-primary", "primary"],
  ["ink", "page"],
  ["ink-muted", "page"],
  ["sky-ink", "sky"],
  ["lavender-ink", "lavender"],
  ["pink-ink", "pink"],
  ["sunshine-ink", "sunshine"],
  ["mint-ink", "mint"],
  ["peach-ink", "peach"],
  ["danger", "surface"],
])("%s on %s meets WCAG AA normal-text contrast", (foreground, background) => {
  expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
});
