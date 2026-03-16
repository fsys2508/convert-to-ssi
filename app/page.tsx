"use client";

import { useState } from "react";

type Dive = {
  datetime: string;
  divetime: number;
  depth_m: number;
  [key: string]: unknown;
};

type Result = { dive: Dive; qrDataUrl: string; qrPayload: string };

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setResult({ dive: data.dive, qrDataUrl: data.qrDataUrl, qrPayload: data.qrPayload });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "40rem", margin: "0 auto" }}>
      <h1>Convert to SSI</h1>
      <p style={{ marginTop: "0.5rem", color: "#666" }}>
        Upload a dive log file (e.g. .fit from Garmin) to generate a QR code for the SSI app.
      </p>

      <form onSubmit={handleSubmit} style={{ marginTop: "1.5rem" }}>
        <input
          type="file"
          accept=".fit"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={loading}
        />
        <button type="submit" disabled={!file || loading} style={{ marginLeft: "0.5rem" }}>
          {loading ? "Processing…" : "Upload"}
        </button>
      </form>

      {error && (
        <p style={{ marginTop: "1rem", color: "#c00" }}>{error}</p>
      )}

      {result && (
        <div style={{ marginTop: "1.5rem" }}>
          <p><strong>Dive</strong>: {result.dive.datetime} — {result.dive.divetime} min, max {result.dive.depth_m} m</p>
          <div style={{ marginTop: "0.5rem" }}>
            <img src={result.qrDataUrl} alt="QR code for SSI" />
          </div>
          <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#666" }}>
            Scan with SSI app. Payload: {result.qrPayload}
          </p>
        </div>
      )}
    </main>
  );
}
