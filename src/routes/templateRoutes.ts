import { Router } from "express";
import multer from "multer";
import * as templateController from "../controllers/templateController";
import { authenticate } from "../middlewares/authenticate";

const router = Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
});

// All template routes require authentication
router.use(authenticate);

// Upload template (multipart/form-data)
router.post(
  "/upload",
  upload.single("file"),
  templateController.uploadTemplate
);

// Get templates list (with pagination and filters)
router.get("/", templateController.getTemplates);

// Get single template by ID
router.get("/:id", templateController.getTemplate);

// Get template download/preview URL (presigned URL)
router.get("/:id/download", templateController.getTemplateDownload);
router.get("/:id/preview", templateController.getTemplateDownload); // Alias for download

// Update template metadata
router.patch("/:id", templateController.updateTemplate);

// Approve template
router.post("/:id/approve", templateController.approveTemplate);

// Get template versions
router.get("/:id/versions", templateController.getTemplateVersions);

// Delete template (soft delete)
router.delete("/:id", templateController.deleteTemplate);

export default router;
