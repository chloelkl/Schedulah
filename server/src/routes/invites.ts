import { Router } from "express";
import { createInviteController, joinInviteController } from "../controllers/invites.controller.js";

const r = Router();

// create invite for group
r.post("/groups/:groupId/invite", createInviteController);

// join via token
r.post("/invites/:token/join", joinInviteController);

export default r;
