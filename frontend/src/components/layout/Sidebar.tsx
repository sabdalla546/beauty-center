/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import type { IconType } from "react-icons";
import {
  FiHome,
  FiChevronDown,
  FiChevronRight,
  FiChevronLeft,
} from "react-icons/fi";
import {
  FaUsers,
  FaUserTie,
  FaUserFriends,
  FaBalanceScale,
  FaRegCalendarAlt,
  FaGavel,
  FaBriefcase,
  FaFileAlt,
  FaChartBar,
  FaListAlt,
  FaMoneyCheckAlt,
  FaHistory,
  FaExchangeAlt,
  FaFileInvoiceDollar,
  FaHourglassHalf,
  FaBoxOpen,
  FaGift,
  FaChartLine,
  FaChartPie,
} from "react-icons/fa";
import { MdAccountBalanceWallet } from "react-icons/md";
import { RiMoneyDollarCircleFill } from "react-icons/ri";
import { IoSettings } from "react-icons/io5";
import { Shield, UserCircle2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext.tsx";
import { useTranslation } from "react-i18next";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";

type NavItem = {
  id: string;
  labelKey: string;
  label?: string;
  path?: string;
  icon: IconType;
  children?: NavItem[];
  permission?: string;
  anyOf?: string[];
  allOf?: string[];
};

type SidebarProps = {
  isOpen: boolean;
  toggleSidebar?: () => void;
  onNavigate?: () => void;
  className?: string;
};

const Sidebar = ({ isOpen, className, onNavigate }: SidebarProps) => {
  const location = useLocation();
  const { logout, user } = useAuth();
  const { t, i18n } = useTranslation("common");

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    {},
  );
  const [hoverOpen, setHoverOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const isRTL = i18n.dir() === "rtl";
  const showFull = isOpen || hoverOpen;
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setHoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen && !hoverOpen) {
      setExpandedItems({});
    }
  }, [isOpen, hoverOpen]);

  const navItems: NavItem[] = [
    {
      id: "dashboard",
      labelKey: "sidebar.dashboard",
      path: "/",
      icon: FiHome,
    },

    {
      id: "pos",
      labelKey: "sidebar.pos",
      label: "POS",
      path: "/pos",
      icon: RiMoneyDollarCircleFill,
      // permission: "pos.access",
    },

    {
      id: "appointments",
      labelKey: "sidebar.appointments",
      label: "Appointments",
      path: "/appointments",
      icon: FaRegCalendarAlt,
      // permission: "appointments.read",
    },

    {
      id: "orders",
      labelKey: "sidebar.orders",
      label: "Orders",
      icon: FaFileInvoiceDollar,
      // anyOf: ["pos.access", "orders.read"],
      children: [
        {
          id: "orders-history",
          labelKey: "sidebar.orders_history",
          label: "Orders History",
          path: "/pos/history",
          icon: FaHistory,
          // anyOf: ["pos.access", "orders.read"],
        },
      ],
    },

    {
      id: "shifts",
      labelKey: "sidebar.shifts",
      label: "Shifts",
      icon: FaHourglassHalf,
      // anyOf: ["shifts.open", "shifts.close", "shifts.read"],
      children: [
        {
          id: "shift-open",
          labelKey: "sidebar.open_shift",
          label: "Open Shift",
          path: "/shifts/open",
          icon: FaMoneyCheckAlt,
          // permission: "shifts.open",
        },
        {
          id: "shift-close",
          labelKey: "sidebar.close_shift",
          label: "Close Shift",
          path: "/shifts/close",
          icon: FaExchangeAlt,
          //  permission: "shifts.close",
        },
        {
          id: "shift-summary",
          labelKey: "sidebar.shift_summary",
          label: "Shift Summary",
          path: "/shifts/summary",
          icon: FaChartBar,
          // permission: "shifts.read",
        },
      ],
    },

    {
      id: "inventory",
      labelKey: "sidebar.inventory",
      label: "Inventory",
      icon: FaBoxOpen,
      //  permission: "inventory.read",
      children: [
        {
          id: "products",
          labelKey: "sidebar.products",
          label: "Products",
          path: "/inventory/products",
          icon: FaBoxOpen,
          // permission: "inventory.read",
        },
      ],
    },

    {
      id: "customers",
      labelKey: "sidebar.customers",
      label: "Customers",
      path: "/customers",
      icon: FaUsers,
      //  permission: "customers.read",
    },

    {
      id: "staff",
      labelKey: "sidebar.staff",
      label: "Staff",
      path: "/staff",
      icon: FaUserTie,
      //  permission: "staff.read",
    },
    {
      id: "services",
      labelKey: "sidebar.services",
      label: "Services",
      path: "/services",
      icon: FaBriefcase,
      // permission: "services.read",
    },
    {
      id: "packages",
      labelKey: "sidebar.packages",
      label: "Packages",
      icon: FaGift,
      children: [
        {
          id: "packages-plans",
          labelKey: "sidebar.package_plans",
          label: "Package plans",
          path: "/packages/plans",
          icon: FaGift,
        },
        {
          id: "packages-customers",
          labelKey: "sidebar.customer_packages",
          label: "Customer packages",
          path: "/packages/customers",
          icon: FaUsers,
        },
        {
          id: "packages-usages",
          labelKey: "sidebar.package_usages",
          label: "Package usage",
          path: "/packages/usages",
          icon: FaChartLine,
        },
      ],
    },
    {
      id: "rooms",
      labelKey: "sidebar.rooms",
      label: "Rooms",
      path: "/rooms",
      icon: FaListAlt,
      // permission: "rooms.read",
    },
    {
      id: "room-types",
      labelKey: "rooms.room_types",
      label: "Room types",
      path: "/rooms/types",
      icon: FaListAlt,
      // permission: "room_types.read",
    },

    {
      id: "system",
      labelKey: "sidebar.system",
      label: "System",
      icon: IoSettings,
      //  anyOf: ["users.read", "roles.read"],
      children: [
        {
          id: "system-users",
          labelKey: "sidebar.users",
          label: "Users",
          path: "/system/users",
          icon: UserCircle2 as any,
          // permission: "users.read",
        },
        {
          id: "system-roles",
          labelKey: "sidebar.roles_permissions",
          label: "Roles & Permissions",
          path: "/system/roles",
          icon: Shield as any,
          // permission: "roles.read",
        },
        {
          id: "system-payment-methods",
          labelKey: "sidebar.payment_methods",
          label: "Payment Methods",
          path: "/system/payment-methods",
          icon: FaMoneyCheckAlt,
          // permission: "payment_methods.read",
        },
      ],
    },
  ];

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isActive = (path?: string) =>
    path ? location.pathname === path : false;

  const hasActiveChild = (item: NavItem): boolean =>
    item.children?.some((child) =>
      child.path ? isActive(child.path) : hasActiveChild(child),
    ) ?? false;

  const renderNavItem = (item: NavItem, depth = 0) => {
    const hasChildren = !!item.children?.length;
    const isExpanded = !!expandedItems[item.id];
    const active = isActive(item.path);
    const childActive = hasActiveChild(item);

    const iconSize = depth > 0 ? 16 : 20;
    const textSize = depth > 0 ? "text-xs" : "text-sm";
    const translatedLabel = t(item.labelKey);
    const label =
      translatedLabel === item.labelKey && item.label
        ? item.label
        : translatedLabel;

    const content = (
      <div key={item.id} className="mb-1">
        <div
          className={[
            "group relative rounded-xl transition-all duration-200",
            "px-2",
            depth > 0 ? "py-0.5" : "py-0.5",
            active
              ? "bg-primary text-primary-foreground shadow-sm"
              : childActive
                ? "text-primary"
                : "text-foreground hover:bg-muted",
            isRTL ? "flex-row-reverse" : "flex-row",
          ].join(" ")}
        >
          <div className="flex items-center justify-between w-full">
            <NavLink
              to={item.path || "#"}
              className={`flex items-center flex-grow min-w-0 ${
                !showFull ? "justify-center" : ""
              }`}
              onClick={(e) => {
                if (hasChildren && showFull) {
                  e.preventDefault();
                  toggleItem(item.id);
                  return;
                }
                if (item.path && onNavigate) {
                  onNavigate();
                }
              }}
              title={!showFull ? label : ""}
            >
              {/* Icon box */}
              <div
                className={`flex items-center flex-shrink-0 ${
                  showFull ? "w-[44px]" : "w-full"
                }`}
              >
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  transition={{ duration: 0.2 }}
                  className={[
                    "grid place-items-center",
                    depth > 0 ? "h-8 w-8" : "h-9 w-9",
                    "rounded-lg",
                    active
                      ? "bg-primary-foreground/15"
                      : "bg-transparent group-hover:bg-foreground/5",
                  ].join(" ")}
                >
                  <item.icon
                    size={iconSize}
                    className={`${
                      active
                        ? "text-primary-foreground"
                        : childActive && depth === 0
                          ? "text-primary"
                          : "text-muted-foreground"
                    }`}
                  />
                </motion.div>
              </div>

              {/* Label */}
              <div
                className={`
                  flex-grow overflow-hidden transition-all duration-300 ease-in-out
                  ${showFull ? "w-auto opacity-100 ml-3" : "w-0 opacity-0 ml-0"}
                `}
              >
                <span
                  className={`${textSize} font-medium block truncate`}
                  dir="auto"
                >
                  {label}
                </span>
              </div>
            </NavLink>

            {/* Chevron */}
            {hasChildren && showFull && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleItem(item.id);
                }}
                className={[
                  "flex-shrink-0 grid place-items-center",
                  "h-8 w-8 rounded-lg",
                  "hover:bg-foreground/5",
                  active
                    ? "text-primary-foreground/90"
                    : childActive
                      ? "text-foreground"
                      : "text-muted-foreground",
                ].join(" ")}
              >
                {isExpanded ? (
                  <FiChevronDown size={14} />
                ) : isRTL ? (
                  <FiChevronLeft size={14} />
                ) : (
                  <FiChevronRight size={14} />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Children */}
        <AnimatePresence initial={false}>
          {hasChildren && isExpanded && showFull && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              style={{ overflow: "hidden" }}
              className={["mt-1", isRTL ? "pr-4" : "pl-4", "relative"].join(
                " ",
              )}
            >
              {/* Rail */}
              <div
                className={`absolute top-0 bottom-0 ${
                  isRTL ? "right-3" : "left-3"
                } w-px border-border bg-border/60`}
              />
              <div className="space-y-1">
                {item.children?.map((child) => renderNavItem(child, depth + 1))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );

    if (item.permission || item.anyOf || item.allOf) {
      return (
        <ProtectedComponent
          key={item.id}
          permission={item.permission}
          anyOf={item.anyOf}
          allOf={item.allOf}
        >
          {content}
        </ProtectedComponent>
      );
    }

    return content;
  };

  // const initials = ... (unused in this simplified version if we don't show user mini, but let's keep it if needed later or just omit if unused in the visible part)

  return (
    <div
      ref={sidebarRef}
      className={[
        "h-full min-h-0 flex flex-col z-50 custom-scrollbar",
        "bg-card text-foreground border-border",
        "transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]", // smooth width animation
        isOpen ? "w-60" : "w-[70px]", // Standardized: w-60 (open), w-[59px] (closed)
        hoverOpen && !isOpen ? "!w-60" : "", // Hover expands to full width `w-60`
        isRTL ? "right-0 border-l" : "left-0 border-r",
        className || "",
      ].join(" ")}
      dir={isRTL ? "rtl" : "ltr"}
      onMouseEnter={() => !isOpen && setHoverOpen(true)}
      onMouseLeave={() => !isOpen && setHoverOpen(false)}
    >
      {/* Logo */}
      <div className="border-b border-border flex items-center h-14 w-full bg-card px-3">
        <img
          src="/images/beautyLogo.webp"
          alt="logo"
          className="h-10 w-10 rounded-xl object-contain bg-foreground/5 p-1"
        />
        {showFull && (
          <div className={`min-w-0 ${isRTL ? "mr-3" : "ml-3"}`}>
            <div className="text-sm font-semibold truncate">
              {t("Beauty Center") || "Beauty"}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {"Beauty Center"}
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <nav className="p-2 text-[12px]">
          {navItems.map((i) => renderNavItem(i))}
        </nav>
      </div>

      {/* <div className="px-3 py-2 border-t border-border dark:border-[var(--color-border-subtle)] bg-card dark:bg-[var(--color-bg-elevated)]">
        <button
          onClick={logout}
          className={[
            "flex items-center w-full px-2 py-2 rounded-xl",
            "text-foreground hover:bg-muted",
            "dark:text-[var(--color-text-main)] dark:hover:bg-[var(--color-bg-subtle)]",
            showFull ? "justify-start gap-2" : "justify-center",
          ].join(" ")}
          title={!showFull ? t("auth.logout") : ""}
        >
          <FiLogOut className="text-lg flex-shrink-0 text-muted-foreground dark:text-[var(--color-text-muted)]" />
          {showFull && <span className="truncate">{t("auth.logout")}</span>}
        </button>
      </div> */}
    </div>
  );
};

export default Sidebar;
