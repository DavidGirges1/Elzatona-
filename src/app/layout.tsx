import type { Metadata } from "next";
import { basePath } from "@/lib/paths";
import { Alexandria, Tajawal } from "next/font/google";
import { Shell } from "@/components/layout/shell";
import "./globals.css";
const headings = Alexandria({
  subsets: ["arabic", "latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-alexandria",
});
const body = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-tajawal",
});
export const metadata: Metadata = {
  robots: basePath ? { index: false, follow: false } : undefined,
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),
  title: { default: "الزتونة — موادك، من غير دوشة", template: "%s | الزتونة" },
  description: "مصادر موادك الجامعية، مترتبة وسهلة تلاقيها. من الطلبة للطلبة.",
};
export const dynamic = "force-dynamic";
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${headings.variable} ${body.variable}`}>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
