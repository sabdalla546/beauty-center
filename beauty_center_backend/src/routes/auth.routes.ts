// src/routes/authRoutes.ts
import express from "express";
import { authController } from "../controllers/auth.controller";

const router = express.Router();

/**
 * Public auth routes
 * POST /auth/register
 * POST /auth/login
 * POST /auth/refresh
 * POST /auth/logout
 */

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

export default router;
