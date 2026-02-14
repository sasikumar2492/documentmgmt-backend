import { Router } from "express";
import authRoutes from "./authRoutes";
import identityRoutes from "./identityRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/identity", identityRoutes);

export default router;

