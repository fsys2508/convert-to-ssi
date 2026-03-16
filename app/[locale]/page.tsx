"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

type Dive = {
  datetime: string;
  divetime: number;
  depth_m: number;
  [key: string]: unknown;
};

type Result = { dive: Dive; qrDataUrl: string; qrPayload: string };

export default function Home() {
  const t = useTranslations("Home");
  const locale = useLocale();

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
      if (!res.ok) throw new Error(data.error ?? t("uploadFailed"));
      setResult({ dive: data.dive, qrDataUrl: data.qrDataUrl, qrPayload: data.qrPayload });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("uploadFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "40rem", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "baseline" }}>
        <h1 style={{ margin: 0 }}>{t("heading")}</h1>
        <div style={{ fontSize: "0.9rem" }}>
          <a href={locale === "en" ? "/zh" : "/en"} style={{ color: "#0366d6", textDecoration: "none" }}>
            {locale === "en" ? "繁體中文" : "English"}
          </a>
        </div>
      </div>
      <p style={{ marginTop: "0.5rem", color: "#666" }}>
        {t("intro")}
      </p>

      <form onSubmit={handleSubmit} style={{ marginTop: "1.5rem" }}>
        <input
          type="file"
          accept=".fit"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={loading}
        />
        <button type="submit" disabled={!file || loading} style={{ marginLeft: "0.5rem" }}>
          {loading ? t("processing") : t("upload")}
        </button>
      </form>

      {error && (
        <p style={{ marginTop: "1rem", color: "#c00" }}>{error}</p>
      )}

      {result && (
        <div style={{ marginTop: "1.5rem" }}>
          <p>
            <strong>{t("diveLine", {
              datetime: result.dive.datetime,
              divetime: result.dive.divetime,
              depth_m: result.dive.depth_m
            })}</strong>
          </p>
          <div style={{ marginTop: "0.5rem" }}>
            <img src={result.qrDataUrl} alt={t("qrAlt")} />
          </div>
          <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#666" }}>
            {t("scanHint", { payload: result.qrPayload })}
          </p>
        </div>
      )}
    </main>
  );
}

