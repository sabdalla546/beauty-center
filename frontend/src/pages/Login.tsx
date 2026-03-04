/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import type { TFunction } from "i18next";
import { z } from "zod";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/context/AuthContext.tsx";
import { useToast } from "@/hooks/use-toast";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

const createLoginSchema = (t: TFunction) =>
  z.object({
    email: z.string().email(t("invalid_email")),
    password: z.string().min(1, t("auth.password_required")),
  });

type LoginForm = z.infer<ReturnType<typeof createLoginSchema>>;

const BeautyCenterLogin: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation("common");
  const loginSchema = React.useMemo(
    () => createLoginSchema(t),
    [t, i18n.language]
  );

  const [form, setForm] = React.useState<LoginForm>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = React.useState<Partial<LoginForm>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const handleChange = (field: keyof LoginForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setServerError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const result = loginSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
      });
      return;
    }

    try {
      setLoading(true);
      await login(form.email, form.password);

      toast({
        title: `${t("auth.welcome")} 👋`,
        description: t("auth.signed_in_success"),
      });
      navigate("/", { replace: true });
    } catch (err: any) {
      console.error(err);

      const message =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        t("auth.login_failed_default");

      setServerError(message);

      toast({
        variant: "destructive",
        title: t("auth.login_failed"),
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#070A12]"
      dir={i18n.dir()}
    >
      {/* ===== Background (modern + colorful but clean) ===== */}
      <div className="pointer-events-none absolute inset-0">
        {/* Glow blobs */}
        <div className="absolute -top-32 -left-32 h-[32rem] w-[32rem] rounded-full bg-fuchsia-500/25 blur-3xl" />
        <div className="absolute top-1/4 -right-40 h-[34rem] w-[34rem] rounded-full bg-cyan-400/18 blur-3xl" />
        <div className="absolute bottom-[-12rem] left-1/3 h-[34rem] w-[34rem] rounded-full bg-emerald-400/14 blur-3xl" />

        {/* Subtle grid + vignette */}
        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:40px_40px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/60" />
      </div>

      {/* ===== Content ===== */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <Card className="relative overflow-hidden rounded-2xl border-white/10 bg-white/5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] backdrop-blur-xl">
            {/* top gradient strip */}
            <div className="h-1.5 w-full bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400" />

            <div className="px-8 pt-8 pb-6">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                  <span className="text-lg">💎</span>
                </div>
                <div>
                  <h1 className="text-xl font-semibold tracking-tight text-white">
                    {t("auth.login_title")}
                  </h1>
                  <p className="text-sm text-white/60">
                    {t("auth.login_subtitle")}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-8 pb-8">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/80">
                    {t("auth.email")}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder={t("auth.placeholder_email")}
                    autoComplete="email"
                    className={[
                      "h-11 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/40",
                      "focus-visible:ring-2 focus-visible:ring-cyan-400/40 focus-visible:border-cyan-400/30",
                      errors.email
                        ? "border-red-500/40 focus-visible:ring-red-500/30"
                        : "",
                    ].join(" ")}
                  />
                  {errors.email && (
                    <p className="text-xs text-red-300">{errors.email}</p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-white/80">
                      {t("auth.password")}
                    </Label>
                    <button
                      type="button"
                      className="text-xs text-white/55 hover:text-white transition"
                      onClick={() =>
                        toast({
                          title: t("auth.forgot_password_title"),
                          description:
                            t("auth.forgot_password_hint"),
                        })
                      }
                    >
                      {t("auth.forgot")}
                    </button>
                  </div>

                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      placeholder={t("auth.placeholder_password")}
                      autoComplete="current-password"
                      className={[
                        "h-11 rounded-xl border-white/10 bg-white/5 pr-12 text-white placeholder:text-white/40",
                        "focus-visible:ring-2 focus-visible:ring-fuchsia-400/35 focus-visible:border-fuchsia-400/25",
                        errors.password
                          ? "border-red-500/40 focus-visible:ring-red-500/30"
                          : "",
                      ].join(" ")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-2 my-auto h-9 rounded-lg px-3 text-xs text-white/60 hover:text-white hover:bg-white/10 transition"
                      aria-label={
                        showPassword
                          ? t("auth.hide_password")
                          : t("auth.show_password")
                      }
                    >
                      {showPassword ? t("auth.hide") : t("auth.show")}
                    </button>
                  </div>

                  {errors.password && (
                    <p className="text-xs text-red-300">{errors.password}</p>
                  )}
                </div>

                {/* Server error */}
                {serverError && (
                  <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2">
                    <p className="text-xs text-red-200">{serverError}</p>
                  </div>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={loading}
                  className={[
                    "mt-1 h-11 w-full rounded-xl font-semibold text-white",
                    "bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400",
                    "shadow-lg shadow-fuchsia-500/15",
                    "hover:opacity-95 active:opacity-90 disabled:opacity-70",
                  ].join(" ")}
                >
                  {loading ? t("auth.signing_in") : t("auth.sign_in")}
                </Button>

                {/* Footer */}
                <div className="pt-2 text-center text-xs text-white/45">
                  {t("auth.tip_after_login")}
                </div>
              </form>
            </div>

            {/* subtle border glow */}
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/10" />
          </Card>

          <p className="mt-4 text-center text-xs text-white/35">
            {[
              t("auth.security_access"),
              t("auth.security_role_permissions"),
              t("auth.security_server_totals"),
            ].join(" • ")}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default BeautyCenterLogin;
