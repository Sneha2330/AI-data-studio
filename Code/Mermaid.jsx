"use client";

import { useEffect, useRef } from "react";
import mermaid from "mermaid";

export default function Mermaid({ chart }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!chart || !ref.current) return;

    mermaid.initialize({ startOnLoad: false });

    const id = "mmd-" + Math.random().toString(36).slice(2);
    mermaid
      .render(id, chart)
      .then(({ svg }) => {
        if (ref.current) ref.current.innerHTML = svg;
      })
      .catch(() => {
        if (ref.current) ref.current.innerHTML = "<p>Failed to render ER diagram</p>";
      });
  }, [chart]);

  return <div ref={ref} className="overflow-auto" />;
}
