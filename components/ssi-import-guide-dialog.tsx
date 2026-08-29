"use client";

import { useTranslations } from "next-intl";

type SsiImportGuideDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function SsiImportGuideDialog({ open, onClose }: SsiImportGuideDialogProps) {
  const t = useTranslations("Home");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/50"
        onClick={onClose}
        aria-label={t("importGuide.close")}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ssi-import-guide-title"
        className="relative z-10 w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="ssi-import-guide-title" className="text-base font-semibold text-slate-900 dark:text-slate-50">
            {t("importGuide.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {t("importGuide.close")}
          </button>
        </div>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-300">
          <li>{t("importGuide.steps.step1")}</li>
          <li>{t("importGuide.steps.step2")}</li>
          <li>{t("importGuide.steps.step3")}</li>
          <li>{t("importGuide.steps.step4")}</li>
        </ol>
        <img
          src="/img/ssiImport.png"
          alt={t("importGuide.title")}
          className="mt-4 mx-auto block h-auto max-h-[500px] w-auto max-w-full rounded-lg border border-slate-200 dark:border-slate-700"
        />
      </div>
    </div>
  );
}

