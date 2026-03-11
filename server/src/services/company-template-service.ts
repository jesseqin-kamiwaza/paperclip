import type { Db } from "@paperclipai/db";
import {
	getTemplateById,
	templateSummaries,
} from "../templates/company-templates.js";
import { agentService } from "./agents.js";
import { companyService } from "./companies.js";
import { issueService } from "./issues.js";
import { projectService } from "./projects.js";

export interface ApplyTemplateResult {
	templateId: string;
	agentCount: number;
	projectId: string;
	issueCount: number;
}

export function companyTemplateService(db: Db) {
	return {
		listTemplates: () => templateSummaries(),

		applyTemplate: async (
			companyId: string,
			templateId: string,
		): Promise<ApplyTemplateResult> => {
			const template = getTemplateById(templateId);
			if (!template) {
				throw new Error(`Template not found: ${templateId}`);
			}

			// Set brand color on company
			await companyService(db).update(companyId, {
				brandColor: template.brandColor,
			});

			const agents = agentService(db);
			const projects = projectService(db);
			const issues = issueService(db);

			// Create all agents and build a name→id map for task assignment
			const agentNameToId = new Map<string, string>();
			for (const agentDef of template.agents) {
				const created = await agents.create(companyId, {
					name: agentDef.name,
					role: agentDef.role as never,
					title: agentDef.title,
					icon: agentDef.icon as never,
					capabilities: agentDef.capabilities,
					adapterType: "process",
					adapterConfig: {
						initialInstructions: agentDef.initialInstructions,
					},
					runtimeConfig: {
						heartbeat: {
							enabled: false,
							intervalSec: 3600,
							wakeOnDemand: true,
							cooldownSec: 10,
							maxConcurrentRuns: 1,
						},
					},
				});
				agentNameToId.set(agentDef.name, created.id);
			}

			// Create initial project
			const project = await projects.create(companyId, {
				name: template.projectName,
				description: template.projectDescription,
				color: template.brandColor,
				status: "planned",
			});

			// Create initial tasks assigned to the matching agents
			let issueCount = 0;
			for (const taskDef of template.initialTasks) {
				const assigneeAgentId = agentNameToId.get(taskDef.assigneeName) ?? null;
				await issues.create(companyId, {
					title: taskDef.title,
					description: taskDef.description,
					priority: taskDef.priority,
					status: "todo",
					projectId: project.id,
					assigneeAgentId,
				});
				issueCount += 1;
			}

			return {
				templateId,
				agentCount: template.agents.length,
				projectId: project.id,
				issueCount,
			};
		},
	};
}
