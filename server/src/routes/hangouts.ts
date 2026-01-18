import { Router } from "express";
import {
  createHangoutController,
  getHangoutController,
} from "../controllers/hangouts.controller.js";

import { lockProposalController, getFinalController } from "../controllers/finalize.controller.js";

const r = Router();

r.post("/groups/:groupId/hangouts", createHangoutController);
r.get("/hangouts/:proposalId", getHangoutController);

r.post("/hangouts/:proposalId/lock", lockProposalController);
r.get("/hangouts/:proposalId/final", getFinalController);

export default r;
