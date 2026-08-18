"use client";

import { useState } from "react";
import TabCharts from "@/components/TabCharts";
import TabScrape from "@/components/TabScrape";
import TabRag from "@/components/TabRag";

const tabs = [
  { id: "charts", label: "1) AI Charts", component: TabCharts },
  { id: "agents", label: "2) Scrape + Summarize", component: TabScrape },
  { id: "rag", label: "3) RAG + ER Diagram", component: TabRag },
];

export default function Page() {
  const [active, setActive] = useState("charts");
  const Active = tabs.find(t => t.id === active)?.component ?? TabCharts;

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-4">
      <h1 className="text-3xl font-bold">AI Data Studio</h1>

      <div className="flex flex-wrap gap-2">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`rounded-2xl px-4 py-2 text-sm border ${
              active === t.id ? "bg-black text-white" : "hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Active />
    </div>
  );
}
