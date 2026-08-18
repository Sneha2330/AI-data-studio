"use client";

import { useEffect, useState } from "react";
import Mermaid from "@/components/Mermaid";

export default function TabRag() {
  const [files, setFiles] = useState([]);
  const [uploadMsg, setUploadMsg] = useState("");
  const [mermaid, setMermaid] = useState("");
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);

  async function refreshER() {
    const res = await fetch("/api/rag/er");
    const data = await res.json();
    setMermaid(data?.mermaid || "");
  }

  useEffect(() => {
    refreshER().catch(() => {});
  }, []);

  async function onUpload() {
    if (!files.length) return;

    setUploadMsg("Uploading...");
    const fd = new FormData();
    for (const f of files) fd.append("files", f);

    const res = await fetch("/api/rag/upload", { method: "POST", body: fd });
    const data = await res.json();

    if (!res.ok) {
      setUploadMsg(data?.error || "Upload failed");
      return;
    }

    setUploadMsg(`Uploaded: ${data.ingested?.length || 0} file(s).`);
    await refreshER();
  }

  async function onAsk() {
    const q = question.trim();
    if (!q) return;

    setLoading(true);
    setChat((c) => [...c, { role: "user", text: q }]);
    setQuestion("");

    try {
      const res = await fetch("/api/rag/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();

      if (!res.ok) {
        setChat((c) => [...c, { role: "assistant", text: `Error: ${data?.error || "Failed"}` }]);
      } else {
        setChat((c) => [
          ...c,
          { role: "assistant", text: data.answer, sql: data.sql },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border p-4 space-y-3">
        <h2 className="text-xl font-semibold">RAG + ER Diagram</h2>

        <div className="flex flex-col gap-2">
          <input
            type="file"
            multiple
            accept=".csv,.xlsx,.xls"
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
          <button
            onClick={onUpload}
            className="w-fit rounded-xl px-4 py-2 border hover:bg-gray-50"
          >
            Upload to Database
          </button>
          {uploadMsg && <p className="text-sm text-gray-700">{uploadMsg}</p>}
        </div>
      </div>

      <div className="rounded-2xl border p-4 space-y-3">
        <h3 className="font-semibold">ER Diagram</h3>
        {mermaid ? <Mermaid chart={mermaid} /> : <p className="text-sm text-gray-500">No diagram yet. Upload files.</p>}
      </div>

      <div className="rounded-2xl border p-4 space-y-3">
        <h3 className="font-semibold">Ask your data</h3>

        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="flex-1 rounded-xl border px-3 py-2"
            placeholder="e.g. What is total revenue in 2023?"
          />
          <button
            onClick={onAsk}
            disabled={loading}
            className="rounded-xl px-4 py-2 border hover:bg-gray-50 disabled:opacity-50"
          >
            Ask
          </button>
        </div>

        <div className="space-y-3">
          {chat.map((m, i) => (
            <div key={i} className={`p-3 rounded-xl ${m.role === "user" ? "bg-gray-50" : "bg-white border"}`}>
              <div className="text-sm font-semibold">{m.role}</div>
              <div className="whitespace-pre-wrap">{m.text}</div>
              {m.sql && (
                <pre className="mt-2 text-xs bg-gray-50 border rounded-xl p-2 overflow-auto">
                  {m.sql}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
