"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { appPath } from "@/lib/paths";
export function Analytics() {
  const path = usePathname();
  useEffect(() => {
    if (path.startsWith("/admin")) return;
    let visitor: string;
    try {
      visitor = sessionStorage.getItem("ez-visit") || crypto.randomUUID();
      sessionStorage.setItem("ez-visit", visitor);
    } catch {
      return;
    }
    const page =
      path === "/"
        ? "landing"
        : path.includes("/resources/")
          ? "resource"
          : path.endsWith("/submit")
            ? "contribute"
            : path === "/courses"
              ? "courses"
              : path.startsWith("/courses/")
                ? "course"
                : path === "/dashboard"
                  ? "dashboard"
                  : path === "/onboarding"
                    ? "onboarding"
                    : path === "/profile"
                      ? "profile"
                      : "other";
    void fetch(appPath("/api/analytics"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: crypto.randomUUID(), visitor, page }),
      keepalive: true,
    }).catch(() => {});
  }, [path]);
  return null;
}
