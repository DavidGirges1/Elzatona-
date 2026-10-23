import Image from "next/image";
import { appPath } from "@/lib/paths";

export function BrandMark({ rail = false }: { rail?: boolean }) {
  return (
    <span
      className={rail ? "brand-mark brand-mark-rail" : "brand-mark"}
      aria-hidden="true"
    >
      <Image
        src={appPath("/brand/elzatona-logo.png")}
        alt=""
        width={80}
        height={80}
        className="brand-image"
        sizes={rail ? "60px" : "(max-width: 767px) 45px, 50px"}
      />
    </span>
  );
}
export function BrandName({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={compact ? "brand-lockup brand-lockup-compact" : "brand-lockup"}
    >
      <BrandMark />
      <span>الزتونة.</span>
    </span>
  );
}
