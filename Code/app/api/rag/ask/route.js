export const runtime = "nodejs";

import { getDb } from "@/lib/sqlite";
import { isSafeSelect } from "@/lib/safeSql"; // your current validator

function pickTextFromChat(json) {
  const msg = json?.choices?.[0]?.message;
  if (typeof msg?.content === "string") return msg.content;
  if (Array.isArray(msg?.content)) return msg.content.map(p => p?.text || p).join("\n");
  return "";
}

// ✅ Bun-compatible: pass db in, and use db.query(...).all()
function buildDbContext(db) {
  const tables = db.query(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
      AND name NOT IN ('uploaded_files','_tables','inferred_relationships');
  `).all();

  const parts = [];
  for (const t of tables) {
    const table = t.name;
    const cols = db.query(`PRAGMA table_info("${table}")`).all();
    const colList = cols.map(c => `${c.name}:${c.type || "TEXT"}`).join(", ");
    const sample = db.query(`SELECT * FROM "${table}" LIMIT 3`).all();
    parts.push(`TABLE ${table}\nCOLUMNS: ${colList}\nSAMPLE: ${JSON.stringify(sample)}`);
  }

  let rels = [];
  try {
    rels = db.query(`
      SELECT parent_table,parent_key,child_table,child_key,confidence
      FROM inferred_relationships
    `).all();
  } catch {}

  const relText = rels.length
    ? "RELATIONSHIPS:\n" + rels.map(r =>
        `${r.parent_table}.${r.parent_key} -> ${r.child_table}.${r.child_key} (c=${r.confidence})`
      ).join("\n")
    : "RELATIONSHIPS:\n(none)";

  return (parts.join("\n\n") + "\n\n" + relText).slice(0, 14000);
}

async function callAzureChat(system, user, maxTokens = 700) {
  const endpoint = (process.env.AZURE_OPENAI_ENDPOINT || "").replace(/\/+$/, "");
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION;
  const deployment =
    process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT;

  if (!endpoint || !apiKey || !apiVersion || !deployment) {
    throw new Error("Missing Azure OpenAI env vars (endpoint/key/version/deployment).");
  }

  const apiUrl =
    `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}` +
    `/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;

  const resp = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": apiKey },
    body: JSON.stringify({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_completion_tokens: maxTokens,
      reasoning_effort: "minimal",
    }),
  });

  const raw = await resp.text();
  if (!resp.ok) throw new Error(`Azure failed ${resp.status}: ${raw.slice(0, 1200)}`);
  return pickTextFromChat(JSON.parse(raw)).trim();
}

export async function POST(req) {
  try {
    const { question } = await req.json();
    if (!question?.trim()) {
      return Response.json({ error: "Missing question" }, { status: 400 });
    }

    // ✅ define db once
    const db = getDb();

    // ✅ build context from actual DB
    const dbContext = buildDbContext(db);
    if (!dbContext || dbContext.length < 20) {
      return Response.json(
        { error: "No uploaded data found. Upload files first." },
        { status: 400 }
      );
    }

    // 1) generate SQL (JSON only)
    const systemSql =
      "You generate SQLite SQL for answering questions.\n" +
      "Return ONLY valid JSON: {\"sql\":\"...\",\"explanation\":\"...\"}\n" +
      "SQL MUST be a single SELECT statement.\n" +
      "Never use INSERT/UPDATE/DELETE/DROP/ALTER/PRAGMA/ATTACH.\n" +
      "Use only tables/columns in schema context.\n";

    const userSql =
      `SCHEMA:\n${dbContext}\n\nQUESTION:\n${question}\n\n` +
      `Return JSON only: {"sql":"...","explanation":"..."}\n`;

    const sqlJsonText = await callAzureChat(systemSql, userSql, 700);

    let sqlObj;
    try {
      sqlObj = JSON.parse(sqlJsonText);
    } catch {
      return Response.json(
        { error: "Model did not return JSON", modelOutput: sqlJsonText },
        { status: 500 }
      );
    }

    const sql = (sqlObj.sql || "").trim();
    const explanation = (sqlObj.explanation || "").trim();

    if (!sql) {
      return Response.json(
        { error: "Model returned empty SQL", modelOutput: sqlJsonText },
        { status: 500 }
      );
    }

    // ✅ Use your existing validator
    if (!isSafeSelect(sql)) {
      return Response.json({ error: "Unsafe SQL generated", sql }, { status: 400 });
    }

    // 2) execute SQL (✅ Bun sqlite)
    let rows = [];
    try {
      rows = db.query(sql).all();
    } catch (e) {
      return Response.json(
        { error: "SQL execution failed", sql, details: String(e) },
        { status: 500 }
      );
    }

    // 3) final answer grounded in SQL result
    const systemAnswer =
      "You answer using ONLY the SQL result JSON.\n" +
      "If empty, say no matching data.\n" +
      "Be concise and include key numbers.\n";

    const userAnswer =
      `QUESTION:\n${question}\n\nSQL:\n${sql}\n\nRESULT:\n${JSON.stringify(rows)}\n`;

    const answer = await callAzureChat(systemAnswer, userAnswer, 450);

    return Response.json({ answer, sql, explanation, rows: rows.slice(0, 50) });
  } catch (e) {
    return Response.json(
      { error: "RAG ask failed", details: String(e) },
      { status: 500 }
    );
  }
}
