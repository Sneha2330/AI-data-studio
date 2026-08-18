"use client";

import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useState } from "react";
import { inferRelationship } from "@/lib/infer";
import ChartRenderer from "@/components/charts/ChartRenderer";

export default function TabCharts() {
  const [rows, setRows] = useState([]);
  const [analysis, setAnalysis] = useState(null); // kept for fallback, not displayed
  const [chartPack, setChartPack] = useState(null);
  const [selectedCharts, setSelectedCharts] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function parseFile(file) {
    const name = file.name.toLowerCase();

    if (name.endsWith(".csv")) {
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      return parsed.data;
    }

    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      return XLSX.utils.sheet_to_json(ws, { defval: "" });
    }

    throw new Error("Unsupported file type (only csv, xlsx, xls allowed)");
  }

  function fallbackCharts(columns) {
    const nums = columns.filter(c => c.type === "number").map(c => c.name);
    const cats = columns.filter(c => c.type === "string").map(c => c.name);
    const dates = columns.filter(c => c.type === "date").map(c => c.name);

    const x1 = cats[0] || dates[0] || columns[0]?.name;
    const y1 = nums[0];

    const x2 = dates[0] || cats[0] || columns[0]?.name;
    const y2 = nums[1] || nums[0];

    const x3 = cats[1] || cats[0] || columns[0]?.name;
    const y3 = nums[2] || nums[1] || nums[0];

    return [
      { title: "Bar Summary", type: "bar", x: x1, y: y1, agg: "sum" },
      { title: "Trend", type: "line", x: x2, y: y2, agg: "sum" },
      { title: "Category Split", type: "pie", x: x3, y: y3, agg: "sum" },
    ].filter(c => c.x && c.y);
  }

  function fallbackSuggestions(columns) {
    const nums = columns.filter(c => c.type === "number").map(c => c.name);
    const cats = columns.filter(c => c.type === "string").map(c => c.name);
    const dates = columns.filter(c => c.type === "date").map(c => c.name);

    const xA = cats[0] || dates[0] || columns[0]?.name;
    const yA = nums[0] || nums[1];

    const xB = cats[1] || cats[0] || columns[0]?.name;
    const yB = nums[1] || nums[0];

    const xC = dates[0] || cats[0] || columns[0]?.name;
    const yC = nums[2] || nums[1] || nums[0];

    return [
      { title: "Scatter Insight", type: "scatter", x: xA, y: yA, agg: "none" },
      { title: "Avg by Category", type: "bar", x: xB, y: yB, agg: "avg" },
      { title: "Count by Group", type: "line", x: xC, y: yC, agg: "count" },
    ].filter(s => s.x && s.y);
  }

  async function onUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setLoading(true);
    setChartPack(null);
    setSelectedCharts([]);

    try {
      const parsedRows = await parseFile(file);
      const a = inferRelationship(parsedRows);

      setRows(parsedRows);
      setAnalysis(a);

      const res = await fetch("/api/charts/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(a),
      });

      const raw = await res.text();
      let data;

      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(`API returned non-JSON.\nStatus: ${res.status}\n\n${raw.slice(0, 1200)}`);
      }

      if (!res.ok) {
        throw new Error(`${data.error || "API error"}${data.details ? " | " + data.details : ""}`);
      }

      // Use AI charts if provided, else fallback
      const aiCharts = Array.isArray(data.charts) ? data.charts : [];
      const aiSuggestions = Array.isArray(data.suggestions) ? data.suggestions : [];

      const chartsToUse = aiCharts.length >= 3 ? aiCharts : fallbackCharts(a.columns);
      const suggToUse = aiSuggestions.length >= 3 ? aiSuggestions : fallbackSuggestions(a.columns);

      setSelectedCharts(chartsToUse);
      setChartPack({ ...data, suggestions: suggToUse });
    } catch (err) {
      const msg = String(err?.message || err);
      setError(msg);

      // fallback charts + fallback suggestions always
      if (analysis?.columns) {
        const fbCharts = fallbackCharts(analysis.columns);
        const fbSuggs = fallbackSuggestions(analysis.columns);
        setSelectedCharts(fbCharts);
        setChartPack({ charts: fbCharts, suggestions: fbSuggs });
      }
    } finally {
      setLoading(false);
    }
  }

  function addSuggestion(s) {
    setSelectedCharts(prev => [...prev, s]);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border p-4">
        <h2 className="text-xl font-semibold">AI Chart Builder</h2>
        <p className="text-sm text-gray-600">
          Upload CSV/XLSX → AI picks charts (min 3) + more suggestions.
        </p>
        <input className="mt-3" type="file" accept=".csv,.xlsx,.xls" onChange={onUpload} />
      </div>

      {loading && (
        <div className="rounded-xl bg-yellow-50 p-3 text-sm">
          Generating AI charts…
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-xs whitespace-pre-wrap">
          <b>Chart API Error:</b>{"\n"}{error}
        </div>
      )}

      {selectedCharts?.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {selectedCharts.map((spec, idx) => (
            <div key={idx} className="rounded-2xl border p-4">
              <ChartRenderer rows={rows} spec={spec} />
            </div>
          ))}
        </div>
      )}

      {chartPack?.suggestions?.length > 0 && (
        <div className="rounded-2xl border p-4">
          <h3 className="font-semibold">More suggested charts</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {chartPack.suggestions.slice(0, 6).map((s, i) => (
              <button
                key={i}
                className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() => addSuggestion(s)}
              >
                + {s.title} ({s.type})
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
