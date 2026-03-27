"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";

function parseSsiDatetime(raw: string): Date | null {
  // raw in (YYYYMMDDHHmm)
  if (!/^\d{12}$/.test(raw)) return null;
  const y = Number(raw.slice(0, 4));
  const m = Number(raw.slice(4, 6));
  const d = Number(raw.slice(6, 8));
  const hh = Number(raw.slice(8, 10));
  const mm = Number(raw.slice(10, 12));
  if (![y, m, d, hh, mm].every(Number.isFinite)) return null;
  return new Date(y, m - 1, d, hh, mm);
}

function formatYmdHm(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

function formatSsiDatetimeForDisplay(raw: string): string {
  const parsed = parseSsiDatetime(raw);
  return parsed ? formatYmdHm(parsed) : raw;
}

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
  avg_depth_m?: number;
  watertemp_c?: number;
  watertemp_max_c?: number;
  airtemp_c?: number;
  surface_interval_s?: number;
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
    { value: "empty", labelKey: "ssiOptions.empty" },
    { value: "21", labelKey: "ssiOptions.var_entry_id.shore" },
    { value: "22", labelKey: "ssiOptions.var_entry_id.boat" },
    { value: "custom", labelKey: "ssiOptions.custom" },
  ],
  var_water_body_id: [
    { value: "empty", labelKey: "ssiOptions.empty" },
    { value: "13", labelKey: "ssiOptions.var_water_body_id.ocean" },
    { value: "custom", labelKey: "ssiOptions.custom" },
  ],
  var_watertype_id: [
    { value: "empty", labelKey: "ssiOptions.empty" },
    { value: "4", labelKey: "ssiOptions.var_watertype_id.fresh" },
    { value: "5", labelKey: "ssiOptions.var_watertype_id.salt" },
    { value: "custom", labelKey: "ssiOptions.custom" },
  ],
  var_current_id: [
    { value: "empty", labelKey: "ssiOptions.empty" },
    { value: "6", labelKey: "ssiOptions.var_current_id.no" },
    { value: "7", labelKey: "ssiOptions.var_current_id.light" },
    { value: "8", labelKey: "ssiOptions.var_current_id.strong" },
    { value: "9", labelKey: "ssiOptions.var_current_id.ripping" },
    { value: "custom", labelKey: "ssiOptions.custom" },
  ],
  var_surface_id: [
    { value: "empty", labelKey: "ssiOptions.empty" },
    { value: "10", labelKey: "ssiOptions.var_surface_id.calm" },
    { value: "11", labelKey: "ssiOptions.var_surface_id.moving" },
    { value: "12", labelKey: "ssiOptions.var_surface_id.stormy" },
    { value: "custom", labelKey: "ssiOptions.custom" },
  ],
  var_weather_id: [
    { value: "empty", labelKey: "ssiOptions.empty" },
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
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  const isDark = useMemo(() => (mounted ? theme === "dark" : true), [mounted, theme]);

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

  function effectiveVarValue(field: VarField): string | null {
    const mode = varMode[field];
    if (mode === "empty") return null;
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
        const v = effectiveVarValue(k);
        if (v == null) return;
        formData.append(k, v);
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
    <main className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="ml-auto mr-0 w-fit flex items-center gap-3 text-sm">
        <a
              href={locale === "en" ? "/zh" : "/en"}
              className="font-medium text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
          >
            {locale === "en" ? "繁體中文" : "English"}
          </a>
          <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? (
                <SunIcon className="h-5 w-5" aria-hidden="true" />
            ) : (
                <MoonIcon className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
        <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
              {t("heading")}
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {t("intro")}
            </p>
          </div>

        <section className="mt-8 space-y-6">
          <details open className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <summary className="cursor-pointer select-none list-none px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-50 [&::-webkit-details-marker]:hidden">
              <div className="flex items-center justify-between">
                <span>{t("ssiDefaultsTitle")}</span>
                <span className="text-slate-500 dark:text-slate-400">▼</span>
              </div>
            </summary>
            <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-800">
              <div className="grid gap-4">
                {(Object.keys(DEFAULT_VARS) as VarField[]).map((field) => (
                  <div key={field} className="grid gap-2 sm:grid-cols-2 sm:items-start">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {t(`ssiFieldLabels.${field}`)}
                    </label>
                    <div className="grid gap-2">
                      <select
                        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-50 dark:disabled:bg-slate-900/40 dark:disabled:text-slate-400"
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
                          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-50 dark:disabled:bg-slate-900/40 dark:disabled:text-slate-400"
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
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {t("ssiDefaultsHint")}
                </p>
              </div>
            </div>
          </details>

          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="inline-flex w-full cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200 dark:hover:bg-slate-950/50">
                <span className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">
                  .fit
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {file ? file.name : t("filePlaceholder")}
                </span>
                <input
                  className="hidden"
                  type="file"
                  accept=".fit"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  disabled={loading}
                />
              </label>

              <button
                type="submit"
                disabled={!file || loading}
                className="inline-flex h-10 w-fit self-start items-center justify-center whitespace-nowrap rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
              >
                {loading ? t("processing") : t("upload")}
              </button>
            </div>
          </form>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          {result && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <div className="w-fit mx-auto grid gap-4 sm:grid-cols-[240px,1fr] sm:items-start">
                <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/20">
                  <img className="h-auto w-full" src={result.qrDataUrl} alt={t("qrAlt")} />
                </div>
                {/*<div className="text-sm text-slate-600">*/}
                {/*  <p className="font-medium text-slate-700">{t("scanTitle")}</p>*/}
                {/*  <p className="mt-1 break-words">*/}
                {/*    {t("scanHint", { payload: result.qrPayload })}*/}
                {/*  </p>*/}
                {/*</div>*/}
              </div>
              <div className="mt-4">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {t("diveTable.label")}
                </p>
                <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      <tr>
                        <td className="w-1/2 bg-slate-50 px-3 py-2 font-medium text-slate-700 dark:bg-slate-950/30 dark:text-slate-200">
                          {t("diveTable.fields.datetime")}
                        </td>
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-50">
                          {formatSsiDatetimeForDisplay(result.dive.datetime)}
                        </td>
                      </tr>
                      <tr>
                        <td className="bg-slate-50 px-3 py-2 font-medium text-slate-700 dark:bg-slate-950/30 dark:text-slate-200">
                          {t("diveTable.fields.divetime")}
                        </td>
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-50">
                          {result.dive.divetime}
                        </td>
                      </tr>
                      <tr>
                        <td className="bg-slate-50 px-3 py-2 font-medium text-slate-700 dark:bg-slate-950/30 dark:text-slate-200">
                          {t("diveTable.fields.depth_m")}
                        </td>
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-50">
                          {result.dive.depth_m}
                        </td>
                      </tr>
                      <tr>
                        <td className="bg-slate-50 px-3 py-2 font-medium text-slate-700 dark:bg-slate-950/30 dark:text-slate-200">
                          {t("diveTable.fields.avg_depth_m")}
                        </td>
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-50">
                          {result.dive.avg_depth_m ?? "—"}
                        </td>
                      </tr>
                      <tr>
                        <td className="bg-slate-50 px-3 py-2 font-medium text-slate-700 dark:bg-slate-950/30 dark:text-slate-200">
                          {t("diveTable.fields.watertemp_c")}
                        </td>
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-50">
                          {result.dive.watertemp_c ?? "—"}
                        </td>
                      </tr>
                      <tr>
                        <td className="bg-slate-50 px-3 py-2 font-medium text-slate-700 dark:bg-slate-950/30 dark:text-slate-200">
                          {t("diveTable.fields.watertemp_max_c")}
                        </td>
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-50">
                          {result.dive.watertemp_max_c ?? "—"}
                        </td>
                      </tr>
                      <tr>
                        <td className="bg-slate-50 px-3 py-2 font-medium text-slate-700 dark:bg-slate-950/30 dark:text-slate-200">
                          {t("diveTable.fields.airtemp_c")}
                        </td>
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-50">
                          {result.dive.airtemp_c ?? "—"}
                        </td>
                      </tr>
                      <tr>
                        <td className="bg-slate-50 px-3 py-2 font-medium text-slate-700 dark:bg-slate-950/30 dark:text-slate-200">
                          {t("diveTable.fields.surface_interval_min")}
                        </td>
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-50">
                          {result.dive.surface_interval_s != null
                            ? Math.round((result.dive.surface_interval_s / 60) * 10) / 10
                            : "—"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

