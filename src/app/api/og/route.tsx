import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const title = searchParams.get("title") || "小豪哥體育資訊網";
    const subtitle = searchParams.get("subtitle") || "";
    const type = searchParams.get("type") || "article";

    // Choose accent color based on type
    const accentColor =
      type === "game"
        ? "#f97316"
        : type === "team"
          ? "#3b82f6"
          : "#8b5cf6";

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "60px",
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
            fontFamily: "sans-serif",
          }}
        >
          {/* Top accent bar */}
          <div
            style={{
              width: "80px",
              height: "6px",
              background: accentColor,
              borderRadius: "3px",
              display: "flex",
            }}
          />

          {/* Main content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              flex: 1,
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: "56px",
                fontWeight: 700,
                color: "#ffffff",
                lineHeight: 1.2,
                display: "flex",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {title.length > 40 ? title.slice(0, 40) + "..." : title}
            </div>
            {subtitle && (
              <div
                style={{
                  fontSize: "28px",
                  color: "#94a3b8",
                  display: "flex",
                }}
              >
                {subtitle}
              </div>
            )}
          </div>

          {/* Bottom branding */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                fontSize: "24px",
                color: "#64748b",
                display: "flex",
              }}
            >
              小豪哥體育資訊網
            </div>
            <div
              style={{
                fontSize: "18px",
                color: "#475569",
                display: "flex",
              }}
            >
              howger-sport.com
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch {
    return new Response("Failed to generate OG image", { status: 500 });
  }
}
