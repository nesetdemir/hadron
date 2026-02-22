"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
	CircuitBoard,
	Database,
	GlobeIcon,
	Server,
	FolderClosed,
} from "lucide-react";
import {
	MariadbIcon,
	MongodbIcon,
	MysqlIcon,
	PostgresqlIcon,
	RedisIcon,
} from "@/components/icons/data-tools-icons";
import { cn } from "@/lib/utils";

export type ServiceNodeData = {
	label: string;
	serviceType:
		| "application"
		| "postgres"
		| "mysql"
		| "mariadb"
		| "mongo"
		| "redis"
		| "compose";
	status?: "idle" | "running" | "done" | "error";
	description?: string | null;
	serviceId: string;
	serverName?: string | null;
	buildType?: string | null;
	appName?: string;
};

const serviceIcons: Record<string, React.FC<{ className?: string }>> = {
	application: GlobeIcon,
	postgres: PostgresqlIcon,
	mysql: MysqlIcon,
	mariadb: MariadbIcon,
	mongo: MongodbIcon,
	redis: RedisIcon,
	compose: CircuitBoard,
};

const serviceIconColors: Record<string, string> = {
	application: "text-blue-500",
	postgres: "text-blue-600",
	mysql: "text-orange-500",
	mariadb: "text-amber-700",
	mongo: "text-green-600",
	redis: "text-red-500",
	compose: "text-violet-500",
};

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
	running: { label: "Online", color: "text-emerald-500", dot: "bg-emerald-500" },
	done: { label: "Online", color: "text-emerald-500", dot: "bg-emerald-500" },
	idle: { label: "Sleeping", color: "text-muted-foreground", dot: "bg-muted-foreground/40" },
	error: { label: "Error", color: "text-destructive", dot: "bg-destructive" },
};

export function ServiceNode({ data, selected }: NodeProps) {
	const nodeData = data as unknown as ServiceNodeData;
	const Icon = serviceIcons[nodeData.serviceType] || Database;
	const status = statusConfig[nodeData.status || "idle"] ?? statusConfig.idle!;
	const iconColor = serviceIconColors[nodeData.serviceType] || "text-muted-foreground";
	const isDatabase = ["postgres", "mysql", "mariadb", "mongo", "redis"].includes(nodeData.serviceType);

	return (
		<div
			className={cn(
				"hadron-node-glow rounded-xl bg-card border min-w-[240px] max-w-[300px] transition-all duration-200 cursor-pointer hover:scale-[1.02]",
				selected && "ring-2 ring-primary",
			)}
		>
			{/* Connection handles */}
			<Handle
				type="target"
				position={Position.Left}
				className="!w-2 !h-2 !bg-muted-foreground/30 !border-none !-ml-px"
			/>
			<Handle
				type="source"
				position={Position.Right}
				className="!w-2 !h-2 !bg-muted-foreground/30 !border-none !-mr-px"
			/>
			<Handle
				type="target"
				position={Position.Top}
				id="top"
				className="!w-2 !h-2 !bg-muted-foreground/30 !border-none !-mt-px"
			/>
			<Handle
				type="source"
				position={Position.Bottom}
				id="bottom"
				className="!w-2 !h-2 !bg-muted-foreground/30 !border-none !-mb-px"
			/>

			{/* Header: Icon + Name */}
			<div className="flex items-center gap-3 px-4 pt-3.5 pb-2">
				<Icon className={cn("size-6 shrink-0", iconColor)} />
				<div className="flex-1 min-w-0">
					<span className="text-sm font-semibold truncate block">
						{nodeData.label}
					</span>
					{nodeData.appName && (
						<span className="text-[11px] text-muted-foreground truncate block">
							{nodeData.appName}
						</span>
					)}
				</div>
			</div>

			{/* Status row */}
			<div className="px-4 pb-2.5">
				<div className="flex items-center gap-1.5">
					<span className={cn("size-1.5 rounded-full shrink-0", status.dot)} />
					<span className={cn("text-xs font-medium", status.color)}>
						{status.label}
					</span>
				</div>
			</div>

			{/* Footer info: volume / server / build type */}
			{(isDatabase || nodeData.serverName || nodeData.buildType) && (
				<div className="border-t border-border/50 px-4 py-2 flex flex-col gap-1">
					{isDatabase && (
						<div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
							<FolderClosed className="size-3 shrink-0" />
							<span className="truncate">
								{nodeData.appName || nodeData.label}-volume
							</span>
						</div>
					)}
					{nodeData.serverName && (
						<div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
							<Server className="size-3 shrink-0" />
							<span className="truncate">{nodeData.serverName}</span>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
