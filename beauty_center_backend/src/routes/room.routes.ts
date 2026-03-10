import { Router } from "express";
import { authenticate } from "../middlewares/authenticate";
import { requirePermission } from "../middlewares/authorize";
import { asyncHandler } from "../middlewares/asyncHandler";
import {
  createRoom,
  listRooms,
  updateRoom,
} from "../controllers/room.controller";

const router = Router();
router.use(authenticate);

router.get("/", requirePermission("rooms.read"), asyncHandler(listRooms));
router.post("/", requirePermission("rooms.create"), asyncHandler(createRoom));
router.put("/:id", requirePermission("rooms.update"), asyncHandler(updateRoom));

export default router;
