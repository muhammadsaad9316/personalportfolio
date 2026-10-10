import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: "64px 72px", background: "#fcf9f4", color: "#171812" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30 }}>
        <span>Abdullah.</span><span>Designer × Developer</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", fontSize: 88, fontWeight: 700, lineHeight: 1.05, letterSpacing: "-4px" }}>
        <span>Digital products.</span><span style={{ color: "#657548" }}>Real impact.</span>
      </div>
      <div style={{ display: "flex", borderTop: "1px solid #c9c8bd", paddingTop: 24, fontSize: 24 }}>Thoughtful interfaces. Solid products.</div>
    </div>, { width: 1200, height: 630 },
  );
}
