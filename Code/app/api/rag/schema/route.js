export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getDb } from "@/lib/sqlite";
//import { inferRelationships } from "@/lib/infer";
import { inferRelationships } from "@/lib/inferRelationships";
export async function GET() {
  const db = getDb();
  const rel = await inferRelationships(db);
  return NextResponse.json(rel);
}
