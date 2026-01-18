// server/src/routes/hangoutVoting.ts
import { Router } from "express";
import {
  getHangoutOverlayController,
  voteTimeController,
  voteActivityController,
  voteExperienceController,
  declineProposalController,
  submitProposalController,
  finalizeAutoController,
  respondFinalController
} from "../controllers/hangoutVoting.controller.js";



const r = Router();

r.get("/hangouts/:proposalId/overlay", getHangoutOverlayController);

r.post("/hangouts/:proposalId/votes/time", voteTimeController);
r.post("/hangouts/:proposalId/votes/activity", voteActivityController);
r.post("/hangouts/:proposalId/votes/experience", voteExperienceController);

r.post("/hangouts/:proposalId/decline", declineProposalController);
r.post("/hangouts/:proposalId/submit", submitProposalController);

r.post("/hangouts/:proposalId/finalize/auto", finalizeAutoController);

r.post("/hangouts/:proposalId/respond", respondFinalController);


export default r;
