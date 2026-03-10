// src/routes/roleRoutes.ts
import express from "express";
import { roleController } from "../controllers/role.controller";
import { authenticate } from "../middlewares/authenticate";
import { requireRole } from "../middlewares/authorize";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = express.Router();

// Protect these routes: only admin can manage roles/permissions
router.use(authenticate, requireRole("admin"));

// ------------------
// Roles
// ------------------
router.get("/", asyncHandler(roleController.listRoles));
router.post("/", asyncHandler(roleController.createRole));
router.put("/:roleId", asyncHandler(roleController.updateRole));
router.delete("/:roleId", asyncHandler(roleController.deleteRole));

// ------------------
// Permissions
// ------------------
router.get("/permissions", asyncHandler(roleController.listPermissions));
router.post("/permissions", asyncHandler(roleController.createPermission));

// Update permission (keep this path before /:roleId/permissions to avoid conflicts)
router.put(
  "/permissions/:permissionId",
  asyncHandler(roleController.updatePermission),
);

// Assign permissions to role
router.post(
  "/:roleId/permissions",
  asyncHandler(roleController.assignPermissionsToRole),
);

// ------------------
// User role assignment
// ------------------
router.post("/users/:userId/roles", asyncHandler(roleController.assignRoleToUser));
router.get("/users/:userId/roles", asyncHandler(roleController.listUserRoles));
router.delete(
  "/users/:userId/roles/:roleId",
  asyncHandler(roleController.removeRoleFromUser),
);

export default router;
