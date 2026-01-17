import { Router } from "express";
import {
  createHangoutController,
  getHangoutController,
} from "../controllers/hangouts.controller.js";

const r = Router();

r.post("/groups/:groupId/hangouts", createHangoutController);
r.get("/hangouts/:proposalId", getHangoutController);

export default r;
