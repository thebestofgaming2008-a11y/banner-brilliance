import { useEffect } from "react";

export function useStoreReveal() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-store-reveal]"));
    if (reducedMotion) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -7% 0px", threshold: 0.08 },
    );

    const observe = (element: HTMLElement, index = 0) => {
      if (element.classList.contains("is-visible")) return;
      element.style.setProperty("--store-reveal-delay", `${Math.min(index % 4, 3) * 28}ms`);
      observer.observe(element);
    };

    elements.forEach(observe);
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) =>
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches("[data-store-reveal]")) observe(node);
          node
            .querySelectorAll<HTMLElement>("[data-store-reveal]")
            .forEach((element, index) => observe(element, index));
        }),
      );
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, []);
}
