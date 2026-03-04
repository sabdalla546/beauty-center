import { Router } from "express";
import { authenticate } from "../middlewares/authenticate";
import { requirePermission } from "../middlewares/authorize";
import {
  createRoom,
  listRooms,
  updateRoom,
} from "../controllers/room.controller";

const router = Router();
router.use(authenticate);

router.get("/", requirePermission("rooms.read"), listRooms);
router.post("/", requirePermission("rooms.create"), createRoom);
router.put("/:id", requirePermission("rooms.update"), updateRoom);

export default router;
