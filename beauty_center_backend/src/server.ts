import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import path from "path";

import { connectDB, sequelize } from "./db";
import { startRefreshTokenMaintenance } from "./utils/jwt";
import { logger } from "./utils/logger";

import { notFoundHandler } from "./middlewares/notFound";
import { globalErrorHandler } from "./middlewares/errorHandler";
import { i18next, i18nextMiddleware } from "./utils/i18n";
import { requestLogger } from "./middlewares/requestLogger";
import { multerErrorHandler } from "./middlewares/upload";
import authRoutes from "./routes/auth.routes";
import roleRoutes from "./routes/role.routes";
import sessionRoutes from "./routes/session.routes";
import userRoutes from "./routes/user.routes";
import customerRoutes from "./routes/customer.routes";
import staffRoutes from "./routes/staff.routes";
import roomTypeRoutes from "./routes/roomType.routes";
import roomRoutes from "./routes/room.routes";
import productRoutes from "./routes/product.routes";
import paymentMethodRoutes from "./routes/paymentMethods.routes";
import serviceRoutes from "./routes/service.routes";
import appointmentRoutes from "./routes/appointment.routes";
import shiftRoutes from "./routes/shift.routes";
import posRoutes from "./routes/pos.routes";
import packagesRoutes from "./routes/packages.routes";
import reportsRoutes from "./routes/reports.routes";

const app = express();

// ----------------------
// Global Middlewares
// ----------------------
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);
app.use(i18nextMiddleware.handle(i18next));

// ----------------------
// Unified response envelope
// Ensures all controllers return a consistent top-level shape:
// success: { ok: true, ... }
// error:   { ok: false, error: ... }
// ----------------------
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = ((body: any) => {
    if (body && typeof body === "object") {
      if (Object.prototype.hasOwnProperty.call(body, "ok")) {
        return originalJson(body);
      }

      if (Object.prototype.hasOwnProperty.call(body, "error")) {
        return originalJson({ ok: false, ...body });
      }

      if (res.statusCode >= 400) {
        return originalJson({
          ok: false,
          error: {
            code: "request_failed",
            message: "Request failed",
            details: body,
          },
        });
      }

      return originalJson({ ok: true, ...body });
    }

    if (res.statusCode >= 400) {
      return originalJson({
        ok: false,
        error: {
          code: "request_failed",
          message: "Request failed",
          details: body,
        },
      });
    }

    return originalJson({ ok: true, data: body });
  }) as typeof res.json;

  next();
});

// ----------------------
// Rate limiting (Auth only)
// ----------------------
app.use(
  "/api/v1/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
// ----------------------
// Static files (uploads)
// ----------------------
// URL: /uploads/products/xxx.jpg  |  /uploads/services/xxx.jpg
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"), {
    maxAge: "7d",
    etag: true,
    fallthrough: false,
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  }),
);

// ----------------------
// Routes
// ----------------------
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/auth/sessions", sessionRoutes);

app.use("/api/v1/roles", roleRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/staff", staffRoutes);

app.use("/api/v1/room-types", roomTypeRoutes);
app.use("/api/v1/rooms", roomRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/payment-methods", paymentMethodRoutes);
app.use("/api/v1/services", serviceRoutes);
app.use("/api/v1/appointments", appointmentRoutes);
app.use("/api/v1/shifts", shiftRoutes);
app.use("/api/v1/pos", posRoutes);
app.use("/api/v1/packages", packagesRoutes);
app.use("/api/v1/reports", reportsRoutes);

app.use(multerErrorHandler);
// 404 + error
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ----------------------
// Start DB + Server
// ----------------------
connectDB()
  .then(async () => {
    logger.info("Database connected — starting server");

    // IMPORTANT: load associations always (cheap + prevents runtime include errors)
    await import("./models/index");

    const isDev = process.env.NODE_ENV === "development";
    const shouldSync = isDev && process.env.DB_SYNC === "true";
    const shouldAlter = isDev && process.env.DB_SYNC_ALTER === "true";

    if (shouldSync) {
      try {
        if (shouldAlter) {
          logger.warn(
            "DB_SYNC_ALTER=true enabled. This can create duplicate indexes in MySQL; use only temporarily.",
          );
          await sequelize.sync({ alter: true });
        } else {
          await sequelize.sync();
        }
      } catch (err: any) {
        const code = err?.original?.code ?? err?.parent?.code;
        if (code === "ER_TOO_MANY_KEYS") {
          logger.error(
            "Sequelize sync skipped because MySQL table hit max keys. Run `npm run fix:users-indexes` once, then restart.",
            {
              sql: err?.sql,
              message: err?.message,
            },
          );
        } else {
          throw err;
        }
      }
    } else {
      logger.info(
        "DB sync is disabled. (In dev set DB_SYNC=true, and optionally DB_SYNC_ALTER=true)",
      );
    }

    const PORT = Number(process.env.PORT || 5000);
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

    const { pruneId, cleanupId } = startRefreshTokenMaintenance();
    process.on("SIGINT", () => {
      console.log("Shutting down...");
      clearInterval(pruneId);
      clearInterval(cleanupId);
      process.exit(0);
    });
  })
  .catch((err) => {
    logger.error("Database connection failed", err);
  });

process.on("uncaughtException", (err: Error) => {
  logger.error("UNCAUGHT EXCEPTION, shutting down", {
    message: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("UNHANDLED REJECTION", { reason });
});
