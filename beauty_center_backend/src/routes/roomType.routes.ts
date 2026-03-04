import { Router } from "express";
import { authenticate } from "../middlewares/authenticate";
import { requirePermission } from "../middlewares/authorize";
import { asyncHandler } from "../middlewares/asyncHandler";
import {
  listRoomTypes,
  createRoomType,
  updateRoomType,
} from "../controllers/roomType.controller";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  requirePermission("room_types.read"),
  asyncHandler(listRoomTypes),
);
router.post(
  "/",
  requirePermission("room_types.create"),
  asyncHandler(createRoomType),
);
router.put(
  "/:id",
  requirePermission("room_types.update"),
  asyncHandler(updateRoomType),
);

export default router;
