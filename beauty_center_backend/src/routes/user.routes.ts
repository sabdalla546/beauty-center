// src/routes/userRoutes.ts
import express from "express";
import { userController } from "../controllers/user.controller";
import { requirePermission } from "../middlewares/authorize"; // your RBAC middleware
import { authenticate } from "../middlewares/authenticate"; // middleware that populates req.user

const router = express.Router();

// Admin-style endpoints (require RBAC permissions)
router.post(
  "/",
  authenticate,
  requirePermission("users.create"),
  userController.createUser,
);
router.get(
  "/",
  authenticate,
  requirePermission("users.read"),
  userController.listUsers,
);
router.get(
  "/:id",
  authenticate,
  requirePermission("users.read"),
  userController.getUser,
);
router.put(
  "/:id",
  authenticate,
  requirePermission("users.update"),
  userController.updateUser,
);
router.delete(
  "/:id",
  authenticate,
  requirePermission("users.delete"),
  userController.deleteUser,
);
router.put(
  "/:id/restore",
  authenticate,
  requirePermission("users.restore"),
  userController.restoreUser,
);
// Profile endpoints for authenticated user
router.get(
  "/me/profile",
  authenticate,
  // requirePermission("users.profile.read"),
  userController.getProfile,
);
router.put(
  "/me/profile",
  authenticate,
  requirePermission("users.profile.update"),
  userController.updateProfile,
);

export default router;
