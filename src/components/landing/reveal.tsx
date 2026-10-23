"use client";
import { useEffect } from "react";
export function Reveals() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const nodes = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            e.target.classList.add("revealed");
            observer.unobserve(e.target);
          }
      },
      { threshold: 0.12 },
    );
    nodes.forEach((n) => {
      n.classList.add("reveal-ready");
      observer.observe(n);
    });
    return () => {
      observer.disconnect();
      nodes.forEach((n) => n.classList.remove("reveal-ready"));
    };
  }, []);
  return null;
}
