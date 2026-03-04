// src/components/layout/Header.tsx
import { useAuth } from "@/context/AuthContext.tsx";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ThemeToggle from "@/components/layout/ThemeToggle";

import { Menu, Maximize, Minimize } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";

type HeaderProps = {
  onToggleSidebar: () => void;
};

const Header = ({ onToggleSidebar }: HeaderProps) => {
  const { user, logout } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { t } = useTranslation("common");

  const initials =
    user?.fullName
      ?.split(" ")
      .map((p) => p[0]?.toUpperCase())
      .join("") || "U";

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <header
      className="
        h-14 w-full flex items-center justify-between px-3 md:px-6
        border-b border-border
        bg-card backdrop-blur
        transition-[padding,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
        z-50
        dark:bg-card
        dark:border-border
      "
    >
      {/* LEFT — Sidebar Toggle + Title */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="
            text-foreground hover:bg-muted hover:text-foreground
            dark:text-foreground
            dark:hover:bg-muted
          "
          onClick={onToggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground dark:text-foreground">
            {t("app.title")}
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline dark:text-muted-foreground">
            {t("app.subtitle")}
          </span>
        </div>
      </div>

      {/* RIGHT — Lang, Theme, Fullscreen, User */}
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <ThemeToggle />

        {/* Fullscreen button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleFullscreen}
          className="
            text-foreground hover:bg-muted hover:text-foreground
            dark:text-foreground
            dark:hover:bg-muted
          "
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? (
            <Minimize className="h-5 w-5" />
          ) : (
            <Maximize className="h-5 w-5" />
          )}
        </Button>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-muted/80 dark:hover:bg-muted transition">
              <Avatar className="h-8 w-8 border border-border dark:border-border">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="hidden md:flex flex-col items-start">
                <span className="text-xs text-muted-foreground dark:text-muted-foreground">
                  {t("auth.logged_in_as")}
                </span>
                <span className="text-xs font-medium text-foreground dark:text-foreground">
                  {user?.email}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="
              w-48 bg-card border border-border text-foreground
              dark:bg-card
              dark:border-border
              dark:text-foreground
            "
          >
            <DropdownMenuLabel className="text-xs">
              {user?.fullName || user?.email}
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="bg-border dark:bg-border" />

            <DropdownMenuItem className="text-xs text-foreground dark:text-foreground">
              Profile (soon)
            </DropdownMenuItem>

            <DropdownMenuItem className="text-xs text-foreground dark:text-foreground">
              Settings (soon)
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-border dark:bg-border" />

            <DropdownMenuItem
              className="text-xs text-red-400 cursor-pointer"
              onClick={logout}
            >
              {t("auth.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
