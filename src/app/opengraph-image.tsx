import { ImageResponse } from "next/og";
import { landingDescription } from "@/lib/landing-seo";

export const alt = "Fides: booking and business management for service businesses";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "#c35000",
          color: "#ffffeb",
        }}
      >
        <div style={{ fontSize: 168, lineHeight: 1, fontFamily: "serif" }}>Fides</div>
        <div style={{ marginTop: 28, fontSize: 40, lineHeight: 1.3, maxWidth: 900 }}>
          {landingDescription}
        </div>
        <div
          style={{
            marginTop: 48,
            alignSelf: "flex-start",
            padding: "14px 32px",
            borderRadius: 999,
            background: "#add8e6",
            color: "#09101d",
            fontSize: 30,
          }}
        >
          Booking site and dashboard in one place
        </div>
      </div>
    ),
    size
  );
}
