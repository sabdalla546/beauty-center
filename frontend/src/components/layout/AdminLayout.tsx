// src/components/layout/AdminLayout.tsx
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

const AdminLayout: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  // ✅ Header offset (so it doesn't overlap the sidebar on desktop)
  const headerOffsetClass = useMemo(() => {
    // desktop only: respect sidebar width
    if (sidebarOpen) {
      return isRTL ? "md:right-60 md:left-0" : "md:left-60 md:right-0";
    }
    return isRTL
      ? "md:right-[4.6rem] md:left-0"
      : "md:left-[4.6rem] md:right-0";
  }, [sidebarOpen, isRTL]);

  // ✅ Main content margin (same logic you already had)
  const contentOffsetClass = sidebarOpen
    ? isRTL
      ? "md:mr-60"
      : "md:ml-60"
    : isRTL
      ? "md:mr-[4.6rem]"
      : "md:ml-[4.6rem]";

  return (
    <div
      className="
    min-h-screen text-foreground
    bg-[#edeff5] dark:bg-[hsl(225_22%_8%)]
    relative overflow-hidden
  "
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Subtle background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-32 h-[32rem] w-[32rem] rounded-full bg-[hsl(var(--brand-2))]/10 blur-3xl" />
        <div className="absolute top-1/4 -right-40 h-[34rem] w-[34rem] rounded-full bg-[hsl(var(--brand-1))]/10 blur-3xl" />
        <div className="absolute bottom-[-12rem] left-1/3 h-[34rem] w-[34rem] rounded-full bg-[hsl(var(--brand-3))]/10 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/10 to-muted/25" />
      </div>

      {/* Desktop Sidebar */}
      <div
        className={`hidden md:block fixed ${
          isRTL ? "right-0" : "left-0"
        } top-0 h-full z-40
          ${sidebarOpen ? "w-60" : "w-[4.6rem]"}
          transition-[width] duration-300 ease-[cubic-bezier(0.2,0,0,1)]`}
      >
        <Sidebar isOpen={sidebarOpen} />
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/40 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`md:hidden fixed ${
          isRTL ? "right-0" : "left-0"
        } top-0 h-full z-40 transform ${
          sidebarOpen
            ? "translate-x-0"
            : isRTL
              ? "translate-x-full"
              : "-translate-x-full"
        } transition-transform duration-300`}
      >
        <Sidebar isOpen={true} onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* ✅ Fixed Header */}
      <div
        className={`fixed top-0 left-0 right-0 ${headerOffsetClass} z-50 transition-[left,right] duration-300 ease-[cubic-bezier(0.2,0,0,1)]`}
      >
        <Header onToggleSidebar={toggleSidebar} />
      </div>

      {/* ✅ Main Content (pt-14 to avoid going under fixed header) */}
      <div
        className={`min-h-screen transition-[margin] duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${contentOffsetClass} pt-14`}
      >
        <main className="p-3 sm:p-4">{children || <Outlet />}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
