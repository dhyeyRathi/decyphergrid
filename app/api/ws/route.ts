export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const upgradeHeader = req.headers.get("upgrade");
  if (upgradeHeader !== "websocket") {
    return new NextResponse("Expected Upgrade: websocket", { status: 426 });
  }

  // Vercel Native WebSocket endpoint handler response
  return new NextResponse("Vercel Native WebSocket Endpoint Active", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
