export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      ok: true,
      service: "barbervision",
      timestamp: new Date().toISOString()
    },
    {
      headers: { "cache-control": "no-store" }
    }
  );
}
