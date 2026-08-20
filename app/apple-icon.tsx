import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1b1620",
          borderRadius: 96,
        }}
      >
        <div
          style={{
            width: 300,
            height: 220,
            borderRadius: 24,
            background: "#fffcf7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: "#ff4b5c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: 70, height: 70, borderRadius: "50%", background: "#1b1620", display: "flex" }} />
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
