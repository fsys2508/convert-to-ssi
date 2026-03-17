"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

type VarField =
  | "var_weather_id"
  | "var_entry_id"
  | "var_water_body_id"
  | "var_watertype_id"
  | "var_current_id"
  | "var_surface_id";

type SelectOption = { value: string; labelKey: string };

type Dive = {
  datetime: string;
  divetime: number;
  depth_m: number;
  [key: string]: unknown;
};

type Result = { dive: Dive; qrDataUrl: string; qrPayload: string };

const DEFAULT_VARS: Record<VarField, number> = {
  var_weather_id: 1,
  var_entry_id: 22,
  var_water_body_id: 13,
  var_watertype_id: 5,
  var_current_id: 7,
  var_surface_id: 10,
};

const VAR_OPTIONS: Record<VarField, SelectOption[]> = {
  var_entry_id: [
    { value: "21", labelKey: "ssiOptions.var_entry_id.shore" },
    { value: "22", labelKey: "ssiOptions.var_entry_id.boat" },
    { value: "custom", labelKey: "ssiOptions.custom" },
  ],
  var_water_body_id: [
    { value: "13", labelKey: "ssiOptions.var_water_body_id.ocean" },
    { value: "custom", labelKey: "ssiOptions.custom" },
  ],
  var_watertype_id: [
    { value: "4", labelKey: "ssiOptions.var_watertype_id.fresh" },
    { value: "5", labelKey: "ssiOptions.var_watertype_id.salt" },
    { value: "custom", labelKey: "ssiOptions.custom" },
  ],
  var_current_id: [
    { value: "6", labelKey: "ssiOptions.var_current_id.no" },
    { value: "7", labelKey: "ssiOptions.var_current_id.light" },
    { value: "8", labelKey: "ssiOptions.var_current_id.strong" },
    { value: "9", labelKey: "ssiOptions.var_current_id.ripping" },
    { value: "custom", labelKey: "ssiOptions.custom" },
  ],
  var_surface_id: [
    { value: "10", labelKey: "ssiOptions.var_surface_id.calm" },
    { value: "11", labelKey: "ssiOptions.var_surface_id.moving" },
    { value: "12", labelKey: "ssiOptions.var_surface_id.stormy" },
    { value: "custom", labelKey: "ssiOptions.custom" },
  ],
  var_weather_id: [
    { value: "1", labelKey: "ssiOptions.var_weather_id.cloudless" },
    { value: "2", labelKey: "ssiOptions.var_weather_id.cloudy" },
    { value: "3", labelKey: "ssiOptions.var_weather_id.rainy" },
    { value: "4", labelKey: "ssiOptions.var_weather_id.snow" },
    { value: "custom", labelKey: "ssiOptions.custom" },
  ],
};

export default function Home() {
  const t = useTranslations("Home");
  const locale = useLocale();

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const [varMode, setVarMode] = useState<Record<VarField, string>>({
    var_weather_id: String(DEFAULT_VARS.var_weather_id),
    var_entry_id: String(DEFAULT_VARS.var_entry_id),
    var_water_body_id: String(DEFAULT_VARS.var_water_body_id),
    var_watertype_id: String(DEFAULT_VARS.var_watertype_id),
    var_current_id: String(DEFAULT_VARS.var_current_id),
    var_surface_id: String(DEFAULT_VARS.var_surface_id),
  });

  const [varCustom, setVarCustom] = useState<Record<VarField, string>>({
    var_weather_id: String(DEFAULT_VARS.var_weather_id),
    var_entry_id: String(DEFAULT_VARS.var_entry_id),
    var_water_body_id: String(DEFAULT_VARS.var_water_body_id),
    var_watertype_id: String(DEFAULT_VARS.var_watertype_id),
    var_current_id: String(DEFAULT_VARS.var_current_id),
    var_surface_id: String(DEFAULT_VARS.var_surface_id),
  });

  function effectiveVarValue(field: VarField): string {
    const mode = varMode[field];
    return mode === "custom" ? varCustom[field] : mode;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      (Object.keys(DEFAULT_VARS) as VarField[]).forEach((k) => {
        formData.append(k, effectiveVarValue(k));
      });
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

      <details open style={{ marginTop: "1rem" }}>
        <summary style={{ cursor: "pointer" }}>{t("ssiDefaultsTitle")}</summary>
        <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.75rem" }}>
          {(Object.keys(DEFAULT_VARS) as VarField[]).map((field) => (
            <div key={field} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.9rem", color: "#333" }}>
                {t(`ssiFieldLabels.${field}`)}
              </label>
              <div style={{ display: "grid", gap: "0.5rem" }}>
                <select
                  value={varMode[field]}
                  onChange={(e) => setVarMode((prev) => ({ ...prev, [field]: e.target.value }))}
                  disabled={loading}
                >
                  {VAR_OPTIONS[field].map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(opt.labelKey)}
                    </option>
                  ))}
                </select>
                {varMode[field] === "custom" && (
                  <input
                    type="number"
                    inputMode="numeric"
                    value={varCustom[field]}
                    onChange={(e) => setVarCustom((prev) => ({ ...prev, [field]: e.target.value }))}
                    disabled={loading}
                    placeholder={String(DEFAULT_VARS[field])}
                  />
                )}
              </div>
            </div>
          ))}
          <div style={{ fontSize: "0.85rem", color: "#666" }}>
            {t("ssiDefaultsHint")}
          </div>
        </div>
      </details>

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

