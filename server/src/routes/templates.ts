import type { Db } from "@paperclipai/db";
import { Router } from "express";
import { companyTemplateService } from "../services/company-template-service.js";
import { logActivity } from "../services/index.js";
import { assertBoard, assertCompanyAccess, getActorInfo } from "./authz.js";

export function templateRoutes(db: Db) {
	const router = Router();
	const svc = companyTemplateService(db);

	// List all available templates (no auth required for public browsing)
	router.get("/", (_req, res) => {
		res.json(svc.listTemplates());
	});

	// Apply a template to an existing company
	router.post("/:companyId/apply/:templateId", async (req, res) => {
		assertBoard(req);
		const { companyId, templateId } = req.params;
		assertCompanyAccess(req, companyId as string);

		const result = await svc.applyTemplate(
			companyId as string,
			templateId as string,
		);

		const actor = getActorInfo(req);
		await logActivity(db, {
			companyId: companyId as string,
			actorType: actor.actorType,
			actorId: actor.actorId,
			action: "template.applied",
			entityType: "company",
			entityId: companyId as string,
			details: {
				templateId,
				agentCount: result.agentCount,
				issueCount: result.issueCount,
			},
		});

		res.json(result);
	});

	return router;
}
