export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Papa from "papaparse";
import * as XLSX from "xlsx";

import { getDb } from "@/lib/sqlite";
import { sanitizeTableName, inferColumnTypes, createTableSQL, insertRows } from "@/lib/ingest";
import { inferRelationships } from "@/lib/inferRelationships";
import { persistRelationships } from "@/lib/er";

export async function POST(req) {
  try {
    // ✅ FIX 1: define db (this removes "db is not defined")
    const db = getDb();

    const form = await req.formData();
    const files = form.getAll("files");

    if (!files?.length) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    // Bun sqlite: exec is sync
    db.exec(`
      CREATE TABLE IF NOT EXISTS uploaded_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_name TEXT,
        table_name TEXT,
        row_count INTEGER,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    const ingested = [];

    for (const file of files) {
      const originalName = file.name || "uploaded";
      const tableName = sanitizeTableName(originalName);

      const buf = Buffer.from(await file.arrayBuffer());

      let rows = [];
      if (originalName.toLowerCase().endsWith(".csv")) {
        const text = buf.toString("utf-8");
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        rows = parsed.data || [];
      } else if (
        originalName.toLowerCase().endsWith(".xlsx") ||
        originalName.toLowerCase().endsWith(".xls")
      ) {
        const wb = XLSX.read(buf, { type: "buffer" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(sheet, { defval: null }) || [];
      } else {
        continue;
      }

      rows = rows.slice(0, 50); // ✅ limit to 50
      if (!rows.length) continue;

      const columns = Object.keys(rows[0] || {});
      const colTypes = inferColumnTypes(rows, columns);

      db.exec(`DROP TABLE IF EXISTS "${tableName}"`);
      db.exec(createTableSQL(tableName, columns, colTypes));

      // ✅ FIX 2: insertRows must be Bun-compatible (see Step B below)
      await insertRows(db, tableName, columns, rows);

      // ✅ FIX 2: Bun sqlite has no db.run(); use db.query().run()
      db.query(
        `INSERT INTO uploaded_files(original_name, table_name, row_count)
         VALUES ($o, $t, $r)`
      ).run({ $o: originalName, $t: tableName, $r: rows.length });

      ingested.push({ originalName, tableName, rowCount: rows.length, columns });
    }

    const rel = await inferRelationships(db);
    await persistRelationships(db, rel);

    return NextResponse.json({ ok: true, ingested, relationships: rel.relationships });
  } catch (e) {
    console.error("RAG upload failed:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
