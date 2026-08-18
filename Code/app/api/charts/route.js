export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    ok: true,
    route: "/api/charts/suggest",
    methods: ["GET", "POST"],
  });
}

export async function POST(req) {
  const body = await req.json();
  return Response.json({
    ok: true,
    receivedKeys: Object.keys(body || {}),
  });
}
