// src/routes/sessionRoutes.ts
import express from "express";
import {
  listSessions,
  revokeSession,
  revokeAllSessions,
} from "../controllers/session.controller";
import { authenticate } from "../middlewares/authenticate";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = express.Router();

router.use(authenticate); // protected endpoints

router.get("/", asyncHandler(listSessions)); // GET /auth/sessions
router.delete("/:id", asyncHandler(revokeSession)); // DELETE /auth/sessions/:id
router.delete("/", asyncHandler(revokeAllSessions)); // DELETE /auth/sessions?exceptCurrent=true

export default router;
