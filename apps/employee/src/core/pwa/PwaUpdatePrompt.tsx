import { useI18n } from "@/core/i18n";
import { useEffect } from "react";
import { toast } from "sonner";
import { registerSW } from "virtual:pwa-register";

export function PwaUpdatePrompt() {
  const { t } = useI18n();

  useEffect(() => {
    const updateSW = registerSW({
      onNeedRefresh() {
        toast.info(t("pwa.updateAvailable"), {
          duration: Infinity,
          action: {
            label: t("pwa.reload"),
            onClick: () => updateSW(true),
          },
        });
      },
    });
  }, [t]);

  return null;
}
