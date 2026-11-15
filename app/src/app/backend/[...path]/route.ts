
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ path: string[] }>;
};

async function proxy(
  request: NextRequest,
  context: Context
) {
  const { path } = await context.params;

  const baseUrl =
    process.env.FASTAPI_URL ?? "http://127.0.0.1:8000";

  const url = new URL(
    path.map(encodeURIComponent).join("/"),
    `${baseUrl.replace(/\/$/, "")}/`
  );

  url.search = request.nextUrl.search;

  try {
    const response = await fetch(url, {
      method: request.method,
      headers: {
        "Content-Type": "application/json",
      },
      body:
        request.method === "GET"
          ? undefined
          : await request.text(),
      cache: "no-store",
      signal: request.signal,
    });

    const headers = new Headers();

    for (const header of [
      "content-type",
      "content-disposition",
      "x-dataset-id",
      "x-entry-count",
    ]) {
      const value = response.headers.get(header);

      if (value) {
        headers.set(header, value);
      }
    }

    return new NextResponse(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error("FastAPI proxy error:", error);

    return NextResponse.json(
      { detail: "Unable to connect to FastAPI." },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: Context
) {
  return proxy(request, context);
}

export async function POST(
  request: NextRequest,
  context: Context
) {
  return proxy(request, context);
}
