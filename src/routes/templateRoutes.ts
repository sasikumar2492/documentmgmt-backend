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

// Get template HTML only (for editable view) — must be before /:id
router.get("/:id/html", templateController.getTemplateHtml);

// Get single template by ID (?includeHtml=true, ?includeDownloadUrl=true)
router.get("/:id", templateController.getTemplate);

// Get template download/preview URL (presigned URL; requires save-content first for .doc/.docx)
router.get("/:id/download", templateController.getTemplateDownload);
router.get("/:id/preview", templateController.getTemplateDownload); // Alias for download

// Save edited HTML: reconvert to .docx and upload to S3 (body: { html: string })
router.post("/:id/save-content", templateController.saveTemplateContent);

// Update template metadata
router.patch("/:id", templateController.updateTemplate);

// Approve template
router.post("/:id/approve", templateController.approveTemplate);

// Get template versions
router.get("/:id/versions", templateController.getTemplateVersions);

// Delete template (soft delete)
router.delete("/:id", templateController.deleteTemplate);

export default router;
