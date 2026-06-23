import { Button } from "@/core/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/ui/card";
import { useI18n } from "@/core/i18n";
import { Download, Share, Smartphone, X } from "lucide-react";
import { usePwaInstall } from "./PwaInstallProvider";

export function InstallAppCard() {
  const { t } = useI18n();
  const { canInstall, isInstalled, isOpen, mode, installing, openDialog, closeDialog, install } =
    usePwaInstall();

  if (isInstalled) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-4 text-sm">
          <Smartphone className="h-5 w-5 shrink-0 text-accent" />
          <span className="text-muted">{t("pwa.installed")}</span>
        </CardContent>
      </Card>
    );
  }

  if (!canInstall) return null;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("pwa.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted">{t("pwa.description")}</p>
          <Button type="button" className="w-full gap-2" onClick={openDialog}>
            <Download className="h-4 w-4" />
            {t("pwa.install")}
          </Button>
        </CardContent>
      </Card>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center"
          role="presentation"
          onClick={closeDialog}
        >
          <div
            className="w-full max-w-sm rounded-card border border-border bg-surface p-5 shadow-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src="/icon-192.png"
                  alt="19er GmbH"
                  className="h-12 w-12 rounded-2xl bg-white object-contain p-1 shadow-sm"
                />
                <div>
                  <h2 id="pwa-install-title" className="text-base font-bold">
                    {t("pwa.dialogTitle")}
                  </h2>
                  <p className="text-xs text-muted">{t("pwa.dialogDescription")}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-accent-soft/50"
                aria-label={t("common.back")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {mode === "ios" ? (
              <div className="space-y-2 rounded-xl bg-page p-3 text-sm text-muted">
                <p className="flex items-center gap-2 font-medium text-foreground">
                  <Share className="h-4 w-4 shrink-0 text-accent" />
                  {t("pwa.iosTitle")}
                </p>
                <ol className="list-inside list-decimal space-y-1 text-xs leading-relaxed">
                  <li>{t("pwa.iosStep1")}</li>
                  <li>{t("pwa.iosStep2")}</li>
                  <li>{t("pwa.iosStep3")}</li>
                </ol>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-page px-3 py-2.5 text-xs text-muted">
                <Smartphone className="h-4 w-4 shrink-0 text-accent" />
                <span>{t("pwa.nativeHint")}</span>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                {t("pwa.cancel")}
              </Button>
              <Button
                type="button"
                className="gap-2"
                onClick={() => void install()}
                disabled={installing}
              >
                <Download className="h-4 w-4" />
                {mode === "ios"
                  ? t("pwa.gotIt")
                  : installing
                    ? t("pwa.installing")
                    : t("pwa.install")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
