import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import App from "./App";
import { I18nProvider } from "./core/i18n";
import { AuthProvider } from "./core/providers/AuthProvider";
import { QueryProvider } from "./core/providers/QueryProvider";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <QueryProvider>
          <AuthProvider>
            <App />
            <Toaster position="top-center" richColors closeButton />
          </AuthProvider>
        </QueryProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
);
