// src/routes/roleRoutes.ts
import express from "express";
import { roleController } from "../controllers/role.controller";
import { authenticate } from "../middlewares/authenticate";
import { requireRole } from "../middlewares/authorize";

const router = express.Router();

// Protect these routes: only admin can manage roles/permissions
router.use(authenticate, requireRole("admin"));

// ------------------
// Roles
// ------------------
router.get("/", roleController.listRoles);
router.post("/", roleController.createRole);
router.put("/:roleId", roleController.updateRole);
router.delete("/:roleId", roleController.deleteRole);

// ------------------
// Permissions
// ------------------
router.get("/permissions", roleController.listPermissions);
router.post("/permissions", roleController.createPermission);

// Update permission (keep this path before /:roleId/permissions to avoid conflicts)
router.put("/permissions/:permissionId", roleController.updatePermission);

// Assign permissions to role
router.post("/:roleId/permissions", roleController.assignPermissionsToRole);

// ------------------
// User role assignment
// ------------------
router.post("/users/:userId/roles", roleController.assignRoleToUser);
router.get("/users/:userId/roles", roleController.listUserRoles);
router.delete(
  "/users/:userId/roles/:roleId",
  roleController.removeRoleFromUser,
);

export default router;
