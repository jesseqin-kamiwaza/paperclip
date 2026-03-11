import type { Db } from "@paperclipai/db";
import { instanceUserRoles, invites } from "@paperclipai/db";
import type { DeploymentExposure, DeploymentMode } from "@paperclipai/shared";
import { and, count, eq, gt, isNull, sql } from "drizzle-orm";
import { Router } from "express";

export function healthRoutes(
	db?: Db,
	opts: {
		deploymentMode: DeploymentMode;
		deploymentExposure: DeploymentExposure;
		authReady: boolean;
		companyDeletionEnabled: boolean;
		pendingMigrations?: string[];
	} = {
		deploymentMode: "local_trusted",
		deploymentExposure: "private",
		authReady: true,
		companyDeletionEnabled: true,
	},
) {
	const router = Router();

	router.get("/", async (_req, res) => {
		if (!db) {
			res.json({ status: "ok" });
			return;
		}

		let bootstrapStatus: "ready" | "bootstrap_pending" = "ready";
		let bootstrapInviteActive = false;
		if (opts.deploymentMode === "authenticated") {
			const roleCount = await db
				.select({ count: count() })
				.from(instanceUserRoles)
				.where(sql`${instanceUserRoles.role} = 'instance_admin'`)
				.then((rows) => Number(rows[0]?.count ?? 0));
			bootstrapStatus = roleCount > 0 ? "ready" : "bootstrap_pending";

			if (bootstrapStatus === "bootstrap_pending") {
				const now = new Date();
				const inviteCount = await db
					.select({ count: count() })
					.from(invites)
					.where(
						and(
							eq(invites.inviteType, "bootstrap_ceo"),
							isNull(invites.revokedAt),
							isNull(invites.acceptedAt),
							gt(invites.expiresAt, now),
						),
					)
					.then((rows) => Number(rows[0]?.count ?? 0));
				bootstrapInviteActive = inviteCount > 0;
			}
		}

		const pendingMigrations = opts.pendingMigrations ?? [];
		const migrationStatus =
			pendingMigrations.length > 0
				? { status: "pending" as const, pendingMigrations }
				: { status: "up_to_date" as const, pendingMigrations: [] };

		res.json({
			status:
				pendingMigrations.length > 0 ? ("degraded" as const) : ("ok" as const),
			deploymentMode: opts.deploymentMode,
			deploymentExposure: opts.deploymentExposure,
			authReady: opts.authReady,
			bootstrapStatus,
			bootstrapInviteActive,
			migrationStatus,
			features: {
				companyDeletionEnabled: opts.companyDeletionEnabled,
			},
		});
	});

	return router;
}
