import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";

// Force Node.js runtime for file system access
export const runtime = "nodejs";

export async function GET() {
  const specPath = join(process.cwd(), "src/modules/api/openapi/spec.yaml");

  // Check if file exists before reading
  if (!existsSync(specPath)) {
    return NextResponse.json(
      { error: "OpenAPI specification not found" },
      { status: 404 },
    );
  }

  try {
    const spec = readFileSync(specPath, "utf-8");

    return new NextResponse(spec, {
      headers: {
        "Content-Type": "application/yaml",
        "Access-Control-Allow-Origin": "*",
        // Cache for 1 hour, revalidate in background
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Failed to read OpenAPI spec:", error);
    return NextResponse.json(
      { error: "Failed to load OpenAPI specification" },
      { status: 500 },
    );
  }
}
