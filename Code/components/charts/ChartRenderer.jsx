"use client";

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer
} from "recharts";

function groupAgg(rows, x, y, agg) {
  const map = new Map();
  for (const r of rows) {
    const key = `${r[x] ?? ""}`;
    const val = Number(r[y]);
    if (!map.has(key)) map.set(key, []);
    if (!isNaN(val)) map.get(key).push(val);
  }
  const out = [];
  for (const [k, arr] of map.entries()) {
    let v = 0;
    if (agg === "count") v = arr.length;
    else if (agg === "avg") v = arr.reduce((a,b)=>a+b,0) / (arr.length || 1);
    else v = arr.reduce((a,b)=>a+b,0); // sum default
    out.push({ x: k, y: Number.isFinite(v) ? v : 0 });
  }
  return out.slice(0, 30);
}

export default function ChartRenderer({ rows, spec }) {
  const { title, type, x, y, agg = "sum" } = spec;
  const data = (x && y) ? groupAgg(rows, x, y, agg) : [];

  return (
    <div>
      <div className="mb-2">
        <h4 className="text-lg font-semibold">{title}</h4>
        <p className="text-xs text-gray-500">{type} {x && y ? `• ${agg}(${y}) by ${x}` : ""}</p>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {type === "bar" ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" hide={false} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="y" fill="#2563eb" />
            </BarChart>
          ) : type === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="y" stroke="#16a34a" strokeWidth={2} />
            </LineChart>
          ) : type === "pie" ? (
            <PieChart>
              <Tooltip />
              <Legend />
              <Pie data={data} dataKey="y" nameKey="x" outerRadius={90}>
                {data.map((_, i) => (
                  <Cell key={i} fill={["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#a855f7"][i % 5]} />
                ))}
              </Pie>
            </PieChart>
          ) : type === "scatter" ? (
            <ScatterChart>
              <CartesianGrid />
              <XAxis dataKey="x" />
              <YAxis />
              <Tooltip />
              <Scatter data={data} fill="#a855f7" />
            </ScatterChart>
          ) : (
            <div className="text-sm text-gray-600">Unsupported chart type or missing x/y.</div>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
