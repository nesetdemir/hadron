"use client";

import {
	ExternalLink,
	Loader2,
	Play,
	Settings,
	SquareTerminal,
	X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusTooltip } from "@/components/shared/status-tooltip";
import { DateTooltip } from "@/components/shared/date-tooltip";
import { cn } from "@/lib/utils";
import {
	MariadbIcon,
	MongodbIcon,
	MysqlIcon,
	PostgresqlIcon,
	RedisIcon,
} from "@/components/icons/data-tools-icons";
import type { Services } from "@/pages/dashboard/project/[projectId]/environment/[environmentId]";

const serviceTypeLabels: Record<string, string> = {
	application: "Application",
	postgres: "PostgreSQL",
	mysql: "MySQL",
	mariadb: "MariaDB",
	mongo: "MongoDB",
	redis: "Redis",
	compose: "Compose",
};

function ServiceTypeIcon({
	type,
	className,
}: { type: string; className?: string }) {
	const iconClass = cn("size-5", className);
	switch (type) {
		case "postgres":
			return <PostgresqlIcon className={iconClass} />;
		case "mysql":
			return <MysqlIcon className={iconClass} />;
		case "mariadb":
			return <MariadbIcon className={iconClass} />;
		case "mongo":
			return <MongodbIcon className={iconClass} />;
		case "redis":
			return <RedisIcon className={iconClass} />;
		default:
			return <SquareTerminal className={iconClass} />;
	}
}

const statusColors: Record<string, string> = {
	running: "bg-green-500",
	done: "bg-blue-500",
	error: "bg-red-500",
	idle: "bg-muted-foreground",
};

interface ServiceSidePanelProps {
	service: Services | null;
	onClose: () => void;
	projectId: string;
	environmentId: string;
}

export function ServiceSidePanel({
	service,
	onClose,
	projectId,
	environmentId,
}: ServiceSidePanelProps) {
	const router = useRouter();

	if (!service) return null;

	const serviceUrl = `/dashboard/project/${projectId}/environment/${environmentId}/services/${service.type}/${service.id}`;

	return (
		<div
			className={cn(
				"absolute right-0 top-0 z-20 h-full w-[340px]",
				"bg-card border-l border-border shadow-lg",
				"flex flex-col",
				"animate-in slide-in-from-right duration-200",
			)}
		>
			{/* Header */}
			<div className="flex items-center justify-between border-b border-border px-4 py-3">
				<div className="flex items-center gap-2.5 min-w-0">
					<ServiceTypeIcon type={service.type} />
					<div className="min-w-0">
						<h3 className="text-sm font-semibold truncate">
							{service.name}
						</h3>
						<span className="text-xs text-muted-foreground">
							{serviceTypeLabels[service.type] || service.type}
						</span>
					</div>
				</div>
				<Button
					variant="ghost"
					size="icon"
					className="size-7 shrink-0"
					onClick={onClose}
				>
					<X className="size-4" />
				</Button>
			</div>

			{/* Status */}
			<div className="border-b border-border px-4 py-3 space-y-3">
				<div className="flex items-center justify-between">
					<span className="text-xs text-muted-foreground">Status</span>
					<div className="flex items-center gap-1.5">
						<div
							className={cn(
								"size-2 rounded-full",
								statusColors[service.status || "idle"],
							)}
						/>
						<span className="text-xs font-medium capitalize">
							{service.status || "idle"}
						</span>
					</div>
				</div>

				{service.serverName && (
					<div className="flex items-center justify-between">
						<span className="text-xs text-muted-foreground">Server</span>
						<Badge variant="outline" className="text-xs h-5">
							{service.serverName}
						</Badge>
					</div>
				)}

				{service.lastDeployDate && (
					<div className="flex items-center justify-between">
						<span className="text-xs text-muted-foreground">
							Last Deploy
						</span>
						<span className="text-xs">
							<DateTooltip date={service.lastDeployDate.toISOString()} />
						</span>
					</div>
				)}

				<div className="flex items-center justify-between">
					<span className="text-xs text-muted-foreground">Created</span>
					<span className="text-xs text-muted-foreground">
						{new Date(service.createdAt).toLocaleDateString()}
					</span>
				</div>
			</div>

			{/* Description */}
			{service.description && (
				<div className="border-b border-border px-4 py-3">
					<span className="text-xs text-muted-foreground block mb-1">
						Description
					</span>
					<p className="text-xs leading-relaxed">{service.description}</p>
				</div>
			)}

			{/* Quick Actions */}
			<div className="px-4 py-3 space-y-2">
				<span className="text-xs text-muted-foreground block mb-2">
					Quick Actions
				</span>

				<Button
					variant="outline"
					size="sm"
					className="w-full justify-start gap-2 h-8 text-xs"
					onClick={() => router.push(serviceUrl)}
				>
					<ExternalLink className="size-3.5" />
					Open Service
				</Button>

				<Button
					variant="outline"
					size="sm"
					className="w-full justify-start gap-2 h-8 text-xs"
					onClick={() => router.push(`${serviceUrl}#logs`)}
				>
					<SquareTerminal className="size-3.5" />
					View Logs
				</Button>

				<Button
					variant="outline"
					size="sm"
					className="w-full justify-start gap-2 h-8 text-xs"
					onClick={() => router.push(`${serviceUrl}#settings`)}
				>
					<Settings className="size-3.5" />
					Settings
				</Button>
			</div>

			{/* Footer */}
			<div className="mt-auto border-t border-border px-4 py-3">
				<Button
					size="sm"
					className="w-full h-8 text-xs"
					onClick={() => router.push(serviceUrl)}
				>
					<ExternalLink className="size-3.5 mr-1.5" />
					Open Full Details
				</Button>
			</div>
		</div>
	);
}
