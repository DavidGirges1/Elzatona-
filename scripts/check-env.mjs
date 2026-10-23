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
  `PDF uploads: ${process.env.SUPABASE_STORAGE_FUNCTION ? "managed function configured" : process.env.SUPABASE_SECRET_KEY ? "server key configured" : "disabled (configure SUPABASE_STORAGE_FUNCTION)"}`,
);
if (!valid) process.exitCode = 1;
