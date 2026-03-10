import { Router } from "express";
import { authenticate } from "../middlewares/authenticate";
import { requirePermission } from "../middlewares/authorize";
import { asyncHandler } from "../middlewares/asyncHandler";
import {
  listProducts,
  createProduct,
  updateProduct,
  adjustProductStock,
} from "../controllers/product.controller";

// ✅ multer middleware
import { uploadProductImage } from "../middlewares/upload";

const router = Router();
router.use(authenticate);

router.get("/", requirePermission("products.read"), asyncHandler(listProducts));

// ✅ create with image
router.post(
  "/",
  requirePermission("products.create"),
  uploadProductImage.single("image"),
  asyncHandler(createProduct),
);

// ✅ update with optional image
router.put(
  "/:id",
  requirePermission("products.update"),
  uploadProductImage.single("image"), // <-- optional
  asyncHandler(updateProduct),
);

// no image here
router.post(
  "/:id/adjust-stock",
  requirePermission("products.adjust_stock"),
  asyncHandler(adjustProductStock),
);

export default router;
