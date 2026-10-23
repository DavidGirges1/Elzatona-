"use client";
import { useEffect } from "react";
export function Reveals() {
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const nodes = [...document.querySelectorAll<HTMLElement>("[data-reveal]")];
    const reveal = (node: HTMLElement) => {
      node.classList.add("revealed");
      observer.unobserve(node);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) reveal(entry.target as HTMLElement);
      },
      { threshold: 0, rootMargin: "0px 0px -24px 0px" },
    );
    function setup() {
      for (const node of nodes) {
        if (preference.matches) {
          node.classList.remove("reveal-ready");
          node.classList.add("revealed");
          observer.unobserve(node);
        } else if (!node.classList.contains("revealed")) {
          node.classList.add("reveal-ready");
          observer.observe(node);
        }
      }
    }
    function focus(event: FocusEvent) {
      if (!(event.target instanceof Element)) return;
      for (const node of nodes) if (node.contains(event.target)) reveal(node);
    }
    setup();
    preference.addEventListener("change", setup);
    document.addEventListener("focusin", focus);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", setup);
      document.removeEventListener("focusin", focus);
      nodes.forEach((n) => n.classList.remove("reveal-ready"));
    };
  }, []);
  return null;
}
