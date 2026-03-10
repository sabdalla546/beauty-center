// src/routes/userRoutes.ts
import express from "express";
import { userController } from "../controllers/user.controller";
import { requirePermission } from "../middlewares/authorize"; // your RBAC middleware
import { authenticate } from "../middlewares/authenticate"; // middleware that populates req.user
import { asyncHandler } from "../middlewares/asyncHandler";

const router = express.Router();

// Admin-style endpoints (require RBAC permissions)
router.post(
  "/",
  authenticate,
  requirePermission("users.create"),
  asyncHandler(userController.createUser),
);
router.get(
  "/",
  authenticate,
  requirePermission("users.read"),
  asyncHandler(userController.listUsers),
);
router.get(
  "/:id",
  authenticate,
  requirePermission("users.read"),
  asyncHandler(userController.getUser),
);
router.put(
  "/:id",
  authenticate,
  requirePermission("users.update"),
  asyncHandler(userController.updateUser),
);
router.delete(
  "/:id",
  authenticate,
  requirePermission("users.delete"),
  asyncHandler(userController.deleteUser),
);
router.put(
  "/:id/restore",
  authenticate,
  requirePermission("users.restore"),
  asyncHandler(userController.restoreUser),
);
// Profile endpoints for authenticated user
router.get(
  "/me/profile",
  authenticate,
  // requirePermission("users.profile.read"),
  asyncHandler(userController.getProfile),
);
router.put(
  "/me/profile",
  authenticate,
  requirePermission("users.profile.update"),
  asyncHandler(userController.updateProfile),
);

export default router;
