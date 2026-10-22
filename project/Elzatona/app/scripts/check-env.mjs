import fs from "node:fs";

if (typeof process.loadEnvFile === "function") {
  if (fs.existsSync(".env.local")) {
    process.loadEnvFile(".env.local");
  } else if (fs.existsSync(".env")) {
    process.loadEnvFile(".env");
  }
}

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_APP_URL",
];
let valid = true;
for (const name of required) {
  const value = process.env[name];
  let ok = Boolean(value);
  if (name.includes("URL") && value) {
    try {
      const url = new URL(value);
      ok =
        ["https:", "http:"].includes(url.protocol) &&
        !url.username &&
        !url.password;
      if (process.env.VERCEL && url.protocol !== "https:") ok = false;
    } catch {
      ok = false;
    }
  }
  console.log(`${name}: ${ok ? "present and valid" : "missing or invalid"}`);
  if (!ok) valid = false;
}
console.log(
  `SUPABASE_SECRET_KEY: ${process.env.SUPABASE_SECRET_KEY ? "present (PDF signing available)" : "missing (PDF uploads disabled)"}`,
);
if (!valid) process.exitCode = 1;
