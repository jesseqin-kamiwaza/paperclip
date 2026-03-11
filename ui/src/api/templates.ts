import { api } from "./client";

export interface TemplateSummary {
	id: string;
	displayName: string;
	tagline: string;
	targetUsers: string;
	icon: string;
	brandColor: string;
	agentNames: string[];
}

export interface ApplyTemplateResult {
	templateId: string;
	agentCount: number;
	projectId: string;
	issueCount: number;
}

export const templatesApi = {
	list: () => api.get<TemplateSummary[]>("/templates"),
	apply: (companyId: string, templateId: string) =>
		api.post<ApplyTemplateResult>(
			`/templates/${companyId}/apply/${templateId}`,
			{},
		),
};
