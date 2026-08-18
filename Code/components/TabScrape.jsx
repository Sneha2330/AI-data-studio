"use client";

import { useState } from "react";

export default function TabScrape() {
  const [url, setUrl] = useState("");
  const [scraped, setScraped] = useState(null);

  // ✅ Use null so we can render even if summary is empty
  const [summary, setSummary] = useState(null);

  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(""); // "scraping" | "summarizing"
  const [error, setError] = useState("");

  async function runAgents() {
    setLoading(true);
    setStage("scraping");
    setError("");
    setScraped(null);
    setSummary(null);

    try {
      // -------------------------
      // Agent 1: Scrape
      // -------------------------
      const s1Res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const s1Raw = await s1Res.text();
      let s1;
      try {
        s1 = JSON.parse(s1Raw);
      } catch {
        throw new Error(`Scrape returned non-JSON (status ${s1Res.status})\n${s1Raw.slice(0, 800)}`);
      }

      if (!s1Res.ok) {
        throw new Error(`Scrape failed (status ${s1Res.status})\n${JSON.stringify(s1, null, 2)}`);
      }

      setScraped(s1);

      // -------------------------
      // Agent 2: Summarize
      // -------------------------
      setStage("summarizing");

      const s2Res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extractedText: s1.extractedText,
          url: s1.url || url,
          title: s1.title,
        }),
      });

      const s2Raw = await s2Res.text();
      let s2;
      try {
        s2 = JSON.parse(s2Raw);
      } catch {
        throw new Error(`Summarize returned non-JSON (status ${s2Res.status})\n${s2Raw.slice(0, 800)}`);
      }

      if (!s2Res.ok) {
        throw new Error(`Summarize failed (status ${s2Res.status})\n${JSON.stringify(s2, null, 2)}`);
      }

      // ✅ Store summary (even if empty string, we still show panel)
      setSummary(s2.summary ?? "");

    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
      setStage("");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border p-4">
        <h2 className="text-xl font-semibold">Two AI Agents: Scrape + Summarize</h2>
        <p className="text-sm text-gray-600">
          Agent-1 scrapes server-side, Agent-2 summarizes scraped text.
        </p>

        <div className="mt-3 flex gap-2">
          <input
            className="w-full rounded-xl border px-3 py-2"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50"
            disabled={!url || loading}
            onClick={runAgents}
          >
            {loading ? (stage === "summarizing" ? "Summarizing..." : "Scraping...") : "Run"}
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm whitespace-pre-wrap">
            {error}
          </div>
        )}
      </div>

      {scraped && (
        <div className="rounded-2xl border p-4">
          <h3 className="font-semibold">Agent‑1 Output (Scraped)</h3>
          <div className="mt-2 text-sm space-y-2">
            <div><b>Title:</b> {scraped.title || "-"}</div>
            <div><b>Description:</b> {scraped.metaDesc || "-"}</div>

            <details>
              <summary className="cursor-pointer text-sm text-gray-600">Show extracted text</summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-gray-50 p-3 text-xs whitespace-pre-wrap">
                {scraped.extractedText || ""}
              </pre>
            </details>
          </div>
        </div>
      )}

      {/* ✅ Agent‑2 Output always shows once summarize returns */}
      {summary !== null && (
        <div className="rounded-2xl border p-4">
          <h3 className="font-semibold">Agent‑2 Output (Summary)</h3>
          <div className="whitespace-pre-wrap text-sm">
            {summary.trim() ? summary : "No summary returned from model."}
          </div>
        </div>
      )}
    </div>
  );
}
