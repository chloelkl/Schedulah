// server/src/routes/groups.ts
import { Router } from "express";
import {
  createGroupController,
  getGroupDetailController,
  listMyGroupsController,
  updateGroupController,
  leaveGroupController,
  listGroupMembersController,
} from "../controllers/groups.controller.js";

const r = Router();

// list groups for Groups page
r.get("/", listMyGroupsController);

// create a group
r.post("/", createGroupController);

// group detail
r.get("/:groupId", getGroupDetailController);

// update group (host/admin)
r.patch("/:groupId", updateGroupController);

// leave group
r.post("/:groupId/leave", leaveGroupController);

// list members
r.get("/:groupId/members", listGroupMembersController);

export default r;
