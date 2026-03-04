// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import AppRouter from "./router.tsx";
import "./index.css";
import "./i18n";
import { ThemeProvider } from "@/context/themeContext";

import { Toaster } from "@/components/ui/toaster"; // 👈 جديد

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <AppRouter />
      <Toaster /> {/* 👈 عشان كل التوست تظهر في أي صفحة */}
    </ThemeProvider>
  </React.StrictMode>
);
