import { Router } from "express";
import { authenticate } from "../middlewares/authenticate";
import { requirePermission } from "../middlewares/authorize";
import { asyncHandler } from "../middlewares/asyncHandler";
import {
  listServices,
  createService,
  updateService,
} from "../controllers/service.controller";

// ✅ multer middleware
import { uploadServiceImage } from "../middlewares/upload";

const router = Router();
router.use(authenticate);

router.get("/", requirePermission("services.read"), asyncHandler(listServices));

// ✅ create with image
router.post(
  "/",
  requirePermission("services.create"),
  uploadServiceImage.single("image"),
  asyncHandler(createService),
);

// ✅ update with optional image
router.put(
  "/:id",
  requirePermission("services.update"),
  uploadServiceImage.single("image"),
  asyncHandler(updateService),
);

export default router;
