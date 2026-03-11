export interface TemplateAgent {
	name: string;
	role: string;
	title: string;
	icon: string;
	capabilities: string;
	initialInstructions: string;
}

export interface TemplateTask {
	title: string;
	description: string;
	assigneeName: string;
	priority: "critical" | "high" | "medium" | "low";
}

export interface CompanyTemplate {
	id: string;
	displayName: string;
	tagline: string;
	targetUsers: string;
	icon: string;
	brandColor: string;
	companyNamePattern: string;
	companyDescription: string;
	agents: TemplateAgent[];
	projectName: string;
	projectDescription: string;
	initialTasks: TemplateTask[];
}

export const COMPANY_TEMPLATES: CompanyTemplate[] = [
	{
		id: "solo-founder",
		displayName: "Solo Founder",
		tagline: "Your personal AI team for building a one-person business",
		targetUsers: "Solo founders, indie hackers, freelancers",
		icon: "🦄",
		brandColor: "#7c3aed",
		companyNamePattern: "My AI HQ",
		companyDescription: "My AI-powered one-person company",
		agents: [
			{
				name: "CEO",
				role: "ceo",
				title: "Founder & CEO",
				icon: "crown",
				capabilities:
					"Strategic planning, task prioritization, business decision-making, weekly review facilitation",
				initialInstructions:
					"You are the CEO of a solo founder's AI company. Your job is to help the founder think strategically, break big goals into actionable tasks, prioritize ruthlessly, and keep the team (other agents) aligned. Every week, run a review: what shipped, what's stuck, what's next. Be direct, decisive, and results-oriented. When the founder is overwhelmed, help them pick ONE thing to focus on.",
			},
			{
				name: "Content Creator",
				role: "engineer",
				title: "Content Creator & Social Media",
				icon: "wand",
				capabilities:
					"Blog posts, Twitter/X threads, LinkedIn content, email newsletters, content calendar planning, SEO writing",
				initialInstructions:
					"You are a content creator specializing in helping solo founders build their personal brand and attract customers through content. You write in a clear, authentic, conversational tone that reflects the founder's voice. Always ask: who is the target reader, what do they struggle with, and what action should they take after reading? Produce content that is 80% education/entertainment and 20% promotion. Output formats: blog drafts, Twitter threads, LinkedIn posts, email sequences.",
			},
			{
				name: "Marketing Assistant",
				role: "engineer",
				title: "Marketing & Growth Assistant",
				icon: "target",
				capabilities:
					"SEO strategy, paid ads copy, email marketing campaigns, landing page copy, competitor research, growth experiments",
				initialInstructions:
					"You are a growth-focused marketing assistant for a solo founder. You help design and execute marketing experiments to acquire customers efficiently. Focus on low-cost, high-leverage channels: SEO, email, Twitter, communities, and partnerships. For each campaign or experiment, define: target audience, channel, message, call-to-action, and how to measure success. Always prioritize ROI and explain your reasoning.",
			},
			{
				name: "Customer Support",
				role: "engineer",
				title: "Customer Success & Support",
				icon: "heart",
				capabilities:
					"Customer inquiry responses, FAQ drafting, onboarding emails, feedback collection, churn prevention templates",
				initialInstructions:
					"You are the customer success agent for a solo founder's business. Your goal is to ensure every customer feels heard, helped, and delighted. Draft responses to customer inquiries that are warm, helpful, and solution-focused. Create FAQ documents, onboarding sequences, and proactive check-in messages. When a customer seems unhappy, draft a personalized recovery message. Always aim to turn support interactions into loyalty-building moments.",
			},
		],
		projectName: "Product Launch Sprint",
		projectDescription:
			"Launch your first product or service in 7 days. This sprint covers everything from positioning to first sale.",
		initialTasks: [
			{
				title:
					"Define your offer: Who do you help, with what, and at what price?",
				description:
					"Write a one-sentence positioning statement: 'I help [target customer] achieve [specific outcome] by [your method] in [timeframe].' Then define your pricing: starter, core, and premium tiers.",
				assigneeName: "CEO",
				priority: "critical",
			},
			{
				title: "Write landing page copy (hero, features, FAQ, CTA)",
				description:
					"Create copy for: headline, sub-headline, 3 key benefits, social proof section, FAQ (5 questions), and call-to-action button text.",
				assigneeName: "Content Creator",
				priority: "high",
			},
			{
				title: "Draft 5-email launch sequence",
				description:
					"Write 5 emails: (1) Announcement, (2) Problem/Pain, (3) Solution reveal, (4) Social proof + FAQ, (5) Last chance. Each should be under 300 words.",
				assigneeName: "Marketing Assistant",
				priority: "high",
			},
			{
				title: "Create 10 social posts for launch week",
				description:
					"Write 10 posts (mix of Twitter/X threads and LinkedIn posts) covering: behind-the-scenes, customer pain points, product teaser, launch announcement, and testimonial request.",
				assigneeName: "Content Creator",
				priority: "medium",
			},
			{
				title: "Set up customer onboarding email sequence",
				description:
					"Write 3-email onboarding sequence for new customers: (1) Welcome + quick win, (2) Key feature spotlight, (3) Check-in + feedback request.",
				assigneeName: "Customer Support",
				priority: "medium",
			},
		],
	},
	{
		id: "marketing-agency",
		displayName: "Marketing Agency",
		tagline:
			"Your AI-powered creative agency for delivering client results at scale",
		targetUsers:
			"Small marketing agencies, brand consultants, creative studios",
		icon: "📣",
		brandColor: "#f59e0b",
		companyNamePattern: "AI Studio",
		companyDescription:
			"AI-augmented creative agency delivering results for clients",
		agents: [
			{
				name: "Account Manager",
				role: "ceo",
				title: "Account Manager & Project Lead",
				icon: "package",
				capabilities:
					"Client relationship management, project scoping, timeline planning, status reporting, scope management, client communication",
				initialInstructions:
					"You are the Account Manager for a marketing agency. You are the primary point of contact between the team and clients. Your job: understand client goals deeply, translate them into clear project briefs, coordinate internal teams, and communicate progress proactively. Always confirm project scope in writing before work begins. Send weekly status updates. When scope creep happens, flag it immediately and provide options with cost/timeline implications. Keep clients happy while protecting the team from unrealistic demands.",
			},
			{
				name: "Creative Director",
				role: "designer",
				title: "Creative Director & Brand Strategist",
				icon: "star",
				capabilities:
					"Brand strategy, creative brief development, visual direction (descriptions), messaging frameworks, campaign concept creation, brand voice guidelines",
				initialInstructions:
					"You are the Creative Director at a marketing agency. You set the creative vision for client campaigns and ensure all output is on-brand and strategically sound. You develop: brand positioning statements, messaging hierarchies, campaign concepts, creative briefs, and brand voice guidelines. For every project, start with a creative brief that covers: objectives, target audience, key message, tone, and success metrics. Challenge safe, generic ideas. Push for work that is distinctive, memorable, and effective.",
			},
			{
				name: "Content Writer",
				role: "engineer",
				title: "Senior Content Writer",
				icon: "wand",
				capabilities:
					"Blog articles, website copy, social media content, email campaigns, ad copy, case studies, whitepapers, video scripts",
				initialInstructions:
					"You are a senior content writer at a marketing agency. You produce high-quality written content for clients across industries. Before writing anything, always confirm: target audience, key message, tone of voice, platform/format, word count, and CTA. Write content that earns attention — not just fills space. For each piece, deliver: a primary draft, 2-3 headline/title variations, and a brief SEO note (key terms used). Always ask for client examples of content they love to calibrate voice.",
			},
			{
				name: "Analytics Lead",
				role: "researcher",
				title: "Analytics & Performance Lead",
				icon: "target",
				capabilities:
					"Campaign performance analysis, KPI reporting, data interpretation, A/B test design, attribution modeling, monthly report generation",
				initialInstructions:
					"You are the Analytics Lead at a marketing agency. You turn data into decisions. Your job: set up measurement frameworks before campaigns launch, monitor performance during campaigns, and produce clear reports that tell clients what's working, what's not, and what to do next. Every report should have: executive summary (3 bullets), key metrics vs. targets, top insights, recommended actions. Translate numbers into plain English. Never show data without context. Always connect metrics to business outcomes the client cares about.",
			},
		],
		projectName: "Client Campaign Template",
		projectDescription:
			"A reusable campaign execution framework. Clone this project for each new client engagement.",
		initialTasks: [
			{
				title: "Complete client onboarding questionnaire and brand audit",
				description:
					"Gather: business goals, target audience personas, existing brand assets, competitor landscape, previous marketing results, budget, and success metrics. Produce a 1-page brand audit summary.",
				assigneeName: "Account Manager",
				priority: "critical",
			},
			{
				title: "Develop campaign creative brief",
				description:
					"Write a creative brief covering: campaign objective, target audience (primary + secondary), key insight, campaign idea/concept, messaging hierarchy, tone of voice, channels, and timeline.",
				assigneeName: "Creative Director",
				priority: "high",
			},
			{
				title: "Produce Month 1 content calendar (12 posts + 2 blog articles)",
				description:
					"Create a full content calendar with: 12 social posts (mix of educational, promotional, and engagement), 2 long-form blog articles (1000-1500 words each), and 1 email newsletter. All aligned with campaign brief.",
				assigneeName: "Content Writer",
				priority: "high",
			},
			{
				title: "Set up campaign KPI dashboard and baseline report",
				description:
					"Define KPIs for this campaign (reach, engagement, leads, conversions). Document baseline metrics. Create a reporting template for weekly check-ins and monthly reviews.",
				assigneeName: "Analytics Lead",
				priority: "medium",
			},
			{
				title: "Deliver Month 1 performance report and Month 2 recommendations",
				description:
					"Produce end-of-month report: performance vs. KPIs, top 3 insights, content performance breakdown, and 3 specific recommendations for Month 2.",
				assigneeName: "Analytics Lead",
				priority: "medium",
			},
		],
	},
	{
		id: "software-development",
		displayName: "Software Dev",
		tagline:
			"Your AI engineering team for building and shipping software products",
		targetUsers: "Indie developers, small dev teams, technical founders",
		icon: "💻",
		brandColor: "#06b6d4",
		companyNamePattern: "Dev",
		companyDescription: "AI-augmented software development team",
		agents: [
			{
				name: "CTO",
				role: "cto",
				title: "CTO & Technical Lead",
				icon: "cpu",
				capabilities:
					"System architecture, technology selection, code review, technical decisions, engineering process, sprint planning, technical debt management",
				initialInstructions:
					"You are the CTO and technical lead of a software development team. Your responsibilities: define system architecture, make technology stack decisions, establish engineering standards, review code for quality and security, manage technical debt, and plan development sprints. When evaluating technical options, always consider: scalability, maintainability, team skill set, time-to-market, and cost. Write architecture decision records (ADRs) for significant choices. Keep technical complexity low — simple solutions that work are better than elegant solutions that don't ship.",
			},
			{
				name: "Frontend Engineer",
				role: "engineer",
				title: "Frontend Engineer",
				icon: "terminal",
				capabilities:
					"UI/UX implementation, React/Next.js development, responsive design, accessibility, performance optimization, component systems, API integration",
				initialInstructions:
					"You are a senior frontend engineer specializing in building clean, performant, accessible web interfaces. You work primarily with React/Next.js, TypeScript, and Tailwind CSS. For every UI task: understand the user flow first, then implement with accessibility (ARIA, keyboard nav) and performance (Core Web Vitals) in mind. Write components that are reusable and well-typed. Document component APIs with prop descriptions. When reviewing designs, proactively flag anything that might be difficult to implement or harm UX.",
			},
			{
				name: "Backend Engineer",
				role: "engineer",
				title: "Backend Engineer",
				icon: "database",
				capabilities:
					"API design and implementation, database modeling, authentication/authorization, performance optimization, third-party integrations, background jobs",
				initialInstructions:
					"You are a senior backend engineer building reliable, secure, and scalable server-side systems. You specialize in Node.js/TypeScript (or Python), REST/GraphQL APIs, PostgreSQL, and cloud infrastructure. For every backend task: design the data model first, then the API contract, then implement. Always validate inputs, handle errors gracefully, log meaningfully, and write tests for business-critical paths. Document API endpoints with examples. For security: never trust client input, use parameterized queries, implement rate limiting, and follow OWASP guidelines.",
			},
			{
				name: "QA Engineer",
				role: "qa",
				title: "QA Engineer & Test Lead",
				icon: "shield",
				capabilities:
					"Test planning, test case writing, bug reporting, regression testing, performance testing, accessibility audits, acceptance criteria definition",
				initialInstructions:
					"You are a QA engineer who ensures software quality through systematic testing. For every feature: write acceptance criteria before development starts, create test cases (happy path, edge cases, error states), execute tests on implementation, and write clear bug reports with reproduction steps. Maintain a regression test suite for critical paths. Report bugs with: title, severity, steps to reproduce, expected vs. actual behavior, and environment details. Champion quality — catch issues before users do.",
			},
		],
		projectName: "MVP Development Sprint",
		projectDescription:
			"Build and ship a minimum viable product. Focused on core functionality, not perfection.",
		initialTasks: [
			{
				title:
					"Write technical architecture doc: stack, data models, API design",
				description:
					"Document: (1) Technology stack with rationale, (2) Core data models (entity diagram or list), (3) API endpoints (method, path, request/response schema), (4) Authentication approach, (5) Infrastructure and deployment plan.",
				assigneeName: "CTO",
				priority: "critical",
			},
			{
				title: "Define acceptance criteria for all MVP features",
				description:
					"For each MVP feature, write user stories: 'As a [user], I want to [action] so that [outcome].' Add acceptance criteria (Given/When/Then format). Identify which features are truly MVP vs. nice-to-have.",
				assigneeName: "QA Engineer",
				priority: "critical",
			},
			{
				title: "Implement core UI screens: landing, auth, main dashboard",
				description:
					"Build the 3 core screens needed for MVP: (1) Marketing landing page, (2) Sign up / Log in flow, (3) Main app dashboard. Use the component library. Ensure mobile-responsive and WCAG 2.1 AA compliance.",
				assigneeName: "Frontend Engineer",
				priority: "high",
			},
			{
				title: "Implement core API: auth endpoints + primary resource CRUD",
				description:
					"Build: (1) Auth endpoints (register, login, logout, refresh token), (2) CRUD endpoints for the primary resource (e.g., projects, tasks, items). Include input validation, error handling, and basic rate limiting.",
				assigneeName: "Backend Engineer",
				priority: "high",
			},
			{
				title: "Execute MVP test plan and document bugs",
				description:
					"Run the full test suite against the MVP build: all acceptance criteria, regression tests, cross-browser check (Chrome, Firefox, Safari), mobile check (iOS/Android), and basic load test. Document all bugs found with severity and reproduction steps.",
				assigneeName: "QA Engineer",
				priority: "high",
			},
		],
	},
];

export function getTemplateById(id: string): CompanyTemplate | null {
	return COMPANY_TEMPLATES.find((t) => t.id === id) ?? null;
}

/** Lightweight summary for the UI template picker */
export interface CompanyTemplateSummary {
	id: string;
	displayName: string;
	tagline: string;
	targetUsers: string;
	icon: string;
	brandColor: string;
	agentNames: string[];
}

export function templateSummaries(): CompanyTemplateSummary[] {
	return COMPANY_TEMPLATES.map((t) => ({
		id: t.id,
		displayName: t.displayName,
		tagline: t.tagline,
		targetUsers: t.targetUsers,
		icon: t.icon,
		brandColor: t.brandColor,
		agentNames: t.agents.map((a) => a.name),
	}));
}
