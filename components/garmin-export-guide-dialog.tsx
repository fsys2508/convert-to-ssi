"use client";

import { useTranslations } from "next-intl";

type GarminExportGuideDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function GarminExportGuideDialog({ open, onClose }: GarminExportGuideDialogProps) {
  const t = useTranslations("Home");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/50"
        onClick={onClose}
        aria-label={t("guide.close")}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="garmin-guide-title"
        className="relative z-10 w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="garmin-guide-title" className="text-base font-semibold text-slate-900 dark:text-slate-50">
            {t("guide.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {t("guide.close")}
          </button>
        </div>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-300">
          <li>{t("guide.steps.step1")}</li>
          <li>{t("guide.steps.step2")}</li>
          <li>{t("guide.steps.step3")}</li>
          <li>{t("guide.steps.step4")}<br/>{t("guide.steps.step4_1")}</li>
          <li>{t("guide.steps.step5")}</li>
          <li>{t("guide.steps.step6")}</li>
        </ol>
        <a
          className="mt-4 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
          href="https://connect.garmin.com/"
          target="_blank"
          rel="noreferrer"
        >
          {t("guide.openGarmin")}
        </a>
      </div>
    </div>
  );
}

