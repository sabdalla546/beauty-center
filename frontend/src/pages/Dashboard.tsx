/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { FiArrowRight, FiArrowLeft } from "react-icons/fi";
import {
  Users,
  User,
  Briefcase,
  DoorOpen,
  Package,
  Users as UsersIcon,
  Shield,
  CreditCard,
} from "lucide-react";

import { ProtectedComponent } from "@/components/routing/ProtectedComponent";

import { useCustomers } from "@/hooks/customers/useCustomers";
import { useStaff } from "@/hooks/staff/useStaff";
import { useServices } from "@/hooks/services/useServices";
import { useRooms } from "@/hooks/rooms/useRooms";
import { useProducts } from "@/hooks/products/useProducts";
import { useUsers } from "@/hooks/users/useUsers";
import { useRoles } from "@/hooks/roles/useRoles";
import { usePaymentMethods } from "@/hooks/paymentMethods/usePaymentMethods";

type Section = {
  title: string;
  subtitle?: string;
  icon: any;
  route: string;
  bgClass: string; // ← changed from glowClass + accentClass
  permission?: string;
  value: number;
  isLoading: boolean;
  formatter?: (v: number) => string;
};

const Dashboard: React.FC = () => {
  const { t, i18n } = useTranslation("common");

  const customersQ = useCustomers({
    currentPage: 1,
    itemsPerPage: 1,
    searchQuery: "",
  });
  const staffQ = useStaff({ currentPage: 1, itemsPerPage: 1, searchQuery: "" });
  const servicesQ = useServices({ searchQuery: "" });
  const roomsQ = useRooms({ searchQuery: "" });
  const productsQ = useProducts({
    currentPage: 1,
    itemsPerPage: 1,
    searchQuery: "",
  });
  const usersQ = useUsers({ currentPage: 1, itemsPerPage: 1, searchQuery: "" });
  const rolesQ = useRoles();
  const paymentMethodsQ = usePaymentMethods({ activeOnly: false });

  const sections: Section[] = [
    {
      title: t("payment_methods.payment_methods") || "Payment Methods",
      icon: CreditCard,
      route: "/system/payment-methods",
      bgClass: "bg-gradient-to-r from-slate-900 to-slate-800",
      value: paymentMethodsQ.data?.length ?? 0,
      isLoading: paymentMethodsQ.isLoading,
    },
    {
      title: t("customers.customers") || "Customers",
      icon: Users,
      route: "/customers",
      bgClass: "bg-gradient-to-r from-emerald-700 to-emerald-600",
      value: customersQ.data?.meta?.total ?? customersQ.data?.data?.length ?? 0,
      isLoading: customersQ.isLoading,
    },
    {
      title: t("staff.staff") || "Staff",
      icon: User,
      route: "/staff",
      bgClass: "bg-gradient-to-r from-cyan-700 to-cyan-600",
      value: staffQ.data?.meta?.total ?? staffQ.data?.data?.length ?? 0,
      isLoading: staffQ.isLoading,
    },
    {
      title: t("services.services") || "Services",
      icon: Briefcase,
      route: "/services",
      bgClass: "bg-gradient-to-r from-indigo-700 to-indigo-600",
      value: servicesQ.data?.data?.length ?? 0,
      isLoading: servicesQ.isLoading,
    },
    {
      title: t("rooms.rooms") || "Rooms",
      icon: DoorOpen,
      route: "/rooms",
      bgClass: "bg-gradient-to-r from-amber-700 to-amber-600",
      value: roomsQ.data?.data?.length ?? 0,
      isLoading: roomsQ.isLoading,
    },
    {
      title: t("products.products") || "Products",
      icon: Package,
      route: "/inventory/products",
      bgClass: "bg-gradient-to-r from-rose-700 to-rose-600",
      value: productsQ.data?.meta?.total ?? productsQ.data?.data?.length ?? 0,
      isLoading: productsQ.isLoading,
    },
    {
      title: t("users.users") || "Users",
      icon: UsersIcon,
      route: "/system/users",
      bgClass: "bg-gradient-to-r from-violet-700 to-violet-600",
      value: usersQ.data?.meta?.total ?? usersQ.data?.data?.length ?? 0,
      isLoading: usersQ.isLoading,
    },
    {
      title: t("roles") || "Roles",
      icon: Shield,
      route: "/system/roles",
      bgClass: "bg-gradient-to-r from-sky-700 to-sky-600",
      value: rolesQ.data?.roles?.length ?? 0,
      isLoading: rolesQ.isLoading,
    },
  ];

  const renderCard = (section: Section, index: number) => {
    const Icon = section.icon;

    const content = (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.08 }}
        whileHover={{ y: -2, scale: 1.02 }}
        className={`${section.bgClass} text-white p-6 rounded-[10px] shadow-md h-36 relative overflow-hidden`}
      >
        {section.isLoading ? (
          <div className="animate-pulse flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 w-28 bg-white/20 rounded" />
              <div className="h-7 w-20 bg-white/20 rounded" />
              <div className="h-4 w-16 bg-white/10 rounded" />
            </div>
            <div className="h-12 w-12 bg-white/15 rounded-full" />
          </div>
        ) : (
          <Link
            to={section.route}
            className="flex flex-col justify-between h-full"
          >
            <div className="flex items-center justify-between z-10 relative">
              <div>
                <h2 className="text-lg font-bold">{section.title}</h2>
                <p className="text-2xl font-bold mt-1">
                  {section.formatter
                    ? section.formatter(section.value)
                    : section.value}
                </p>
                {section.subtitle && (
                  <p className="text-xs opacity-90 mt-1">{section.subtitle}</p>
                )}
              </div>

              <div className="p-3 rounded-full bg-white/15">
                <Icon className="text-xl" />
              </div>
            </div>

            <div className="mt-2 flex items-center justify-center text-sm font-medium text-white/90 pointer-events-none">
              {t("show") || "Show"}
              {i18n.language === "ar" ? (
                <FiArrowLeft className="ms-1" />
              ) : (
                <FiArrowRight className="ms-1" />
              )}
            </div>
          </Link>
        )}

        {/* decorative blurred circles */}
        <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10 blur-sm" />
        <div className="absolute -bottom-10 -right-10 w-28 h-28 rounded-full bg-white/5 blur-md" />
      </motion.div>
    );

    return (
      <ProtectedComponent permission={section.permission} key={section.route}>
        {content}
      </ProtectedComponent>
    );
  };

  return (
    <div className="px-4" dir={i18n.dir()}>
      <h1 className="text-2xl font-bold text-foreground mb-4">
        {t("dashboard.dashboard") || t("sidebar.dashboard") || "Dashboard"}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sections.map((s, i) => renderCard(s, i))}
      </div>
    </div>
  );
};

export default Dashboard;
