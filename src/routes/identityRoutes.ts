import { Router } from "express";
import * as identityController from "../controllers/identityController";
import { authenticate } from "../middlewares/authenticate";

const router = Router();

router.get("/me", authenticate, identityController.getMe);
router.get("/roles", authenticate, identityController.getRoles);
router.get("/departments", authenticate, identityController.getDepartments);

export default router;

