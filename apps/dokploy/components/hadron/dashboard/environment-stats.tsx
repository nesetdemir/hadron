"use client";

import {
	Activity,
	Box,
	CheckCircle2,
	CircleAlert,
	Clock,
	Layers,
	Pause,
} from "lucide-react";
import type { Services } from "@/pages/dashboard/project/[projectId]/environment/[environmentId]";
import { cn } from "@/lib/utils";

interface EnvironmentStatsProps {
	services: Services[];
	className?: string;
}

interface StatCardProps {
	label: string;
	value: number | string;
	icon: React.FC<{ className?: string }>;
	color?: string;
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
	return (
		<div className="flex items-center gap-3 rounded-lg border bg-card p-3">
			<div
				className={cn(
					"flex items-center justify-center rounded-md p-2",
					color || "bg-secondary",
				)}
			>
				<Icon className="size-4 text-foreground" />
			</div>
			<div>
				<p className="text-lg font-semibold leading-none">{value}</p>
				<p className="text-xs text-muted-foreground mt-0.5">{label}</p>
			</div>
		</div>
	);
}

export function EnvironmentStats({
	services,
	className,
}: EnvironmentStatsProps) {
	const total = services.length;
	const running = services.filter((s) => s.status === "running").length;
	const errored = services.filter((s) => s.status === "error").length;
	const idle = services.filter(
		(s) => !s.status || s.status === "idle" || s.status === "done",
	).length;

	// Count service types
	const typeCounts = services.reduce(
		(acc, s) => {
			acc[s.type] = (acc[s.type] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);

	const typeBreakdown = Object.entries(typeCounts)
		.sort((a, b) => b[1] - a[1])
		.map(([type, count]) => `${count} ${type}`)
		.join(", ");

	// Most recent deploy
	const lastDeploy = services
		.filter((s) => s.lastDeployDate)
		.sort(
			(a, b) =>
				(b.lastDeployDate?.getTime() || 0) -
				(a.lastDeployDate?.getTime() || 0),
		)[0];

	const lastDeployText = lastDeploy?.lastDeployDate
		? formatRelative(lastDeploy.lastDeployDate)
		: "Never";

	return (
		<div className={cn("grid grid-cols-2 md:grid-cols-4 gap-3", className)}>
			<StatCard
				label="Total Services"
				value={total}
				icon={Layers}
				color="bg-primary/10"
			/>
			<StatCard
				label="Running"
				value={running}
				icon={Activity}
				color="bg-emerald-500/10"
			/>
			<StatCard
				label="Errors"
				value={errored}
				icon={CircleAlert}
				color={errored > 0 ? "bg-destructive/10" : "bg-secondary"}
			/>
			<StatCard
				label="Last Deploy"
				value={lastDeployText}
				icon={Clock}
				color="bg-blue-500/10"
			/>
		</div>
	);
}

function formatRelative(date: Date): string {
	const now = Date.now();
	const diff = now - date.getTime();
	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(diff / 3600000);
	const days = Math.floor(diff / 86400000);

	if (minutes < 1) return "Just now";
	if (minutes < 60) return `${minutes}m ago`;
	if (hours < 24) return `${hours}h ago`;
	if (days < 30) return `${days}d ago`;
	return date.toLocaleDateString();
}
