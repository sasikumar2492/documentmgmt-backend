import { Router } from "express";
import * as dashboardController from "../controllers/dashboardController";
import { authenticate } from "../middlewares/authenticate";

const router = Router();

router.get("/request-counts", authenticate, dashboardController.getRequestCounts);
router.get("/recent-requests", authenticate, dashboardController.getRecentRequests);
router.get("/recent-templates", authenticate, dashboardController.getRecentTemplates);
router.get("/kpis", authenticate, dashboardController.getKpis);

export default router;
