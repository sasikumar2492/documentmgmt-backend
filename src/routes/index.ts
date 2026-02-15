import { Router } from "express";
import authRoutes from "./authRoutes";
import identityRoutes from "./identityRoutes";
import dashboardRoutes from "./dashboardRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/identity", identityRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;

