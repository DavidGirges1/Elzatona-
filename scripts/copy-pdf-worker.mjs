import { copyFileSync, cpSync, mkdirSync } from "node:fs";
mkdirSync("public/pdf", { recursive: true });
copyFileSync(
  "node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
  "public/pdf/pdf.worker.min.mjs",
);

for (const name of ["cmaps", "standard_fonts", "wasm"])
  cpSync(`node_modules/pdfjs-dist/${name}`, `public/pdf/${name}`, {
    recursive: true,
  });
