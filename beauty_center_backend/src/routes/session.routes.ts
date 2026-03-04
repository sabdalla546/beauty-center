// src/routes/sessionRoutes.ts
import express from "express";
import {
  listSessions,
  revokeSession,
  revokeAllSessions,
} from "../controllers/session.controller";
import { authenticate } from "../middlewares/authenticate";

const router = express.Router();

router.use(authenticate); // protected endpoints

router.get("/", listSessions); // GET /auth/sessions
router.delete("/:id", revokeSession); // DELETE /auth/sessions/:id
router.delete("/", revokeAllSessions); // DELETE /auth/sessions?exceptCurrent=true

export default router;
