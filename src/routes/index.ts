import { Router } from "express";
import authRoutes from "./authRoutes";
import identityRoutes from "./identityRoutes";
import dashboardRoutes from "./dashboardRoutes";
import templateRoutes from "./templateRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/identity", identityRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/templates", templateRoutes);

export default router;

