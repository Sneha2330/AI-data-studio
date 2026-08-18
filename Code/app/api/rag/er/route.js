export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getDb } from "@/lib/sqlite";
//import { inferRelationships } from "@/lib/infer";
import { inferRelationships } from "@/lib/inferRelationships";
import { toMermaidER } from "@/lib/er";

export async function GET() {
  const db = getDb();
  const rel = await inferRelationships(db);
  const mermaid = toMermaidER(rel, rel.relationships);
  return NextResponse.json({ mermaid, relationships: rel.relationships });
}
