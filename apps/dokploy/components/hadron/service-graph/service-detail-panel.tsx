"use client";

import {
	CircuitBoard,
	ExternalLink,
	GlobeIcon,
	Loader2,
	SquareTerminal,
	X,
} from "lucide-react";
import { useRouter } from "next/router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusTooltip } from "@/components/shared/status-tooltip";
import { cn } from "@/lib/utils";
import { api } from "@/utils/api";
import type { Services } from "@/pages/dashboard/project/[projectId]/environment/[environmentId]";
import {
	LibsqlIcon,
	MariadbIcon,
	MongodbIcon,
	MysqlIcon,
	PostgresqlIcon,
	RedisIcon,
} from "@/components/icons/data-tools-icons";

// Application tab components
import { ShowGeneralApplication } from "@/components/dashboard/application/general/show";
import { ShowEnvironment as ShowAppEnvironment } from "@/components/dashboard/application/environment/show";
import { ShowDomains } from "@/components/dashboard/application/domains/show-domains";
import { ShowDeployments } from "@/components/dashboard/application/deployments/show-deployments";
import { ShowDockerLogs } from "@/components/dashboard/application/logs/show";
import { AddCommand } from "@/components/dashboard/application/advanced/general/add-command";
import { ShowResources } from "@/components/dashboard/application/advanced/show-resources";
import { ShowVolumes } from "@/components/dashboard/application/advanced/volumes/show-volumes";
import { ShowPorts } from "@/components/dashboard/application/advanced/ports/show-port";
import { ShowTraefikConfig } from "@/components/dashboard/application/advanced/traefik/show-traefik-config";
import { ShowSecurity } from "@/components/dashboard/application/advanced/security/show-security";
import { ShowRedirects } from "@/components/dashboard/application/advanced/redirects/show-redirects";
import { ShowClusterSettings } from "@/components/dashboard/application/advanced/cluster/show-cluster-settings";
import { ShowBuildServer } from "@/components/dashboard/application/advanced/show-build-server";

// Database tab components (shared)
import { ShowEnvironment as ShowDbEnvironment } from "@/components/dashboard/application/environment/show-environment";
import { ShowBackups } from "@/components/dashboard/database/backups/show-backups";
import { ShowDatabaseAdvancedSettings } from "@/components/dashboard/shared/show-database-advanced-settings";

// Postgres
import { ShowGeneralPostgres } from "@/components/dashboard/postgres/general/show-general-postgres";
import { ShowInternalPostgresCredentials } from "@/components/dashboard/postgres/general/show-internal-postgres-credentials";
import { ShowExternalPostgresCredentials } from "@/components/dashboard/postgres/general/show-external-postgres-credentials";

// MySQL
import { ShowGeneralMysql } from "@/components/dashboard/mysql/general/show-general-mysql";
import { ShowInternalMysqlCredentials } from "@/components/dashboard/mysql/general/show-internal-mysql-credentials";
import { ShowExternalMysqlCredentials } from "@/components/dashboard/mysql/general/show-external-mysql-credentials";

// MariaDB
import { ShowGeneralMariadb } from "@/components/dashboard/mariadb/general/show-general-mariadb";
import { ShowInternalMariadbCredentials } from "@/components/dashboard/mariadb/general/show-internal-mariadb-credentials";
import { ShowExternalMariadbCredentials } from "@/components/dashboard/mariadb/general/show-external-mariadb-credentials";

// MongoDB
import { ShowGeneralMongo } from "@/components/dashboard/mongo/general/show-general-mongo";
import { ShowInternalMongoCredentials } from "@/components/dashboard/mongo/general/show-internal-mongo-credentials";
import { ShowExternalMongoCredentials } from "@/components/dashboard/mongo/general/show-external-mongo-credentials";

// Redis
import { ShowGeneralRedis } from "@/components/dashboard/redis/general/show-general-redis";
import { ShowInternalRedisCredentials } from "@/components/dashboard/redis/general/show-internal-redis-credentials";
import { ShowExternalRedisCredentials } from "@/components/dashboard/redis/general/show-external-redis-credentials";

// Compose
import { ShowGeneralCompose } from "@/components/dashboard/compose/general/show";
import { ShowDockerLogsCompose } from "@/components/dashboard/compose/logs/show";
import { ShowDockerLogsStack } from "@/components/dashboard/compose/logs/show-stack";
import { AddCommandCompose } from "@/components/dashboard/compose/advanced/add-command";
import { IsolatedDeploymentTab } from "@/components/dashboard/compose/advanced/add-isolation";
import { ShowImport } from "@/components/dashboard/application/advanced/import/show-import";

// Monitoring
import { ContainerFreeMonitoring } from "@/components/dashboard/monitoring/free/container/show-free-container-monitoring";

const serviceTypeLabels: Record<string, string> = {
	application: "Application",
	postgres: "PostgreSQL",
	mysql: "MySQL",
	mariadb: "MariaDB",
	mongo: "MongoDB",
	redis: "Redis",
	libsql: "libSQL",
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
		case "libsql":
			return <LibsqlIcon className={iconClass} />;
		case "compose":
			return <CircuitBoard className={iconClass} />;
		default:
			return <GlobeIcon className={iconClass} />;
	}
}

interface ServiceDetailPanelProps {
	service: Services | null;
	onClose: () => void;
	projectId: string;
	environmentId: string;
}

export function ServiceDetailPanel({
	service,
	onClose,
	projectId,
	environmentId,
}: ServiceDetailPanelProps) {
	const router = useRouter();

	if (!service) return null;

	const serviceUrl = `/dashboard/project/${projectId}/environment/${environmentId}/services/${service.type}/${service.id}`;

	return (
		<>
			{/* Backdrop overlay */}
			<div
				className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
				onClick={onClose}
			/>

			{/* Panel */}
			<div
				className={cn(
					"fixed right-0 top-0 z-50 h-full",
					"w-[calc(100%-3rem)] max-w-[1100px]",
					"bg-background border-l border-border shadow-2xl",
					"flex flex-col",
					"animate-in slide-in-from-right duration-300",
				)}
			>
				{/* Header */}
				<div className="flex items-center justify-between border-b px-5 py-3.5 shrink-0">
					<div className="flex items-center gap-3 min-w-0">
						<div className="relative">
							<ServiceTypeIcon type={service.type} className="size-6" />
							<div className="absolute -right-1 -top-1">
								<StatusTooltip status={service.status} />
							</div>
						</div>
						<div className="min-w-0">
							<h2 className="text-base font-semibold truncate">
								{service.name}
							</h2>
							<span className="text-xs text-muted-foreground">
								{serviceTypeLabels[service.type] || service.type}
								{service.appName && ` · ${service.appName}`}
							</span>
						</div>
					</div>
					<div className="flex items-center gap-2 shrink-0">
						<Button
							variant="ghost"
							size="sm"
							className="h-7 px-2 text-xs gap-1.5 text-muted-foreground"
							onClick={() => router.push(serviceUrl)}
						>
							<ExternalLink className="size-3" />
							Full Page
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="size-7"
							onClick={onClose}
						>
							<X className="size-4" />
						</Button>
					</div>
				</div>

				{/* Content - type-specific */}
				<div className="flex-1 overflow-hidden">
					{service.type === "application" && (
						<ApplicationTabs
							id={service.id}
							appName={service.appName}
							serverId={service.serverId}
						/>
					)}
					{service.type === "postgres" && (
						<DatabaseTabs id={service.id} dbType="postgres" appName={service.appName} serverId={service.serverId} />
					)}
					{service.type === "mysql" && (
						<DatabaseTabs id={service.id} dbType="mysql" appName={service.appName} serverId={service.serverId} />
					)}
					{service.type === "mariadb" && (
						<DatabaseTabs id={service.id} dbType="mariadb" appName={service.appName} serverId={service.serverId} />
					)}
					{service.type === "mongo" && (
						<DatabaseTabs id={service.id} dbType="mongo" appName={service.appName} serverId={service.serverId} />
					)}
					{service.type === "redis" && (
						<DatabaseTabs id={service.id} dbType="redis" appName={service.appName} serverId={service.serverId} />
					)}
					{service.type === "libsql" && (
						<div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
							Open the full page to manage this libSQL database.
						</div>
					)}
					{service.type === "compose" && (
						<ComposeTabs
							id={service.id}
							appName={service.appName}
							serverId={service.serverId}
						/>
					)}
				</div>
			</div>
		</>
	);
}

/* ─── Application Panel ─── */

function ApplicationTabs({
	id,
	appName,
	serverId,
}: { id: string; appName: string; serverId?: string | null }) {
	const [tab, setTab] = useState("general");
	const { data } = api.application.one.useQuery(
		{ applicationId: id },
		{ refetchInterval: 5000 },
	);

	if (!data) {
		return <PanelLoader />;
	}

	return (
		<Tabs value={tab} onValueChange={setTab} className="flex flex-col h-full">
			<div className="border-b px-5 shrink-0 overflow-x-auto">
				<TabsList className="bg-transparent h-10 gap-4">
					<TabsTrigger value="general" className="text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">General</TabsTrigger>
					<TabsTrigger value="environment" className="text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Environment</TabsTrigger>
					<TabsTrigger value="deployments" className="text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Deployments</TabsTrigger>
					<TabsTrigger value="domains" className="text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Domains</TabsTrigger>
					<TabsTrigger value="logs" className="text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Logs</TabsTrigger>
					<TabsTrigger value="monitoring" className="text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Monitoring</TabsTrigger>
					<TabsTrigger value="advanced" className="text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Advanced</TabsTrigger>
				</TabsList>
			</div>
			<div className="flex-1 overflow-y-auto p-5">
				<TabsContent value="general" className="mt-0">
					<div className="flex flex-col gap-4">
						<ShowGeneralApplication applicationId={id} />
					</div>
				</TabsContent>
				<TabsContent value="environment" className="mt-0">
					<div className="flex flex-col gap-4">
						<ShowAppEnvironment applicationId={id} />
					</div>
				</TabsContent>
				<TabsContent value="deployments" className="mt-0">
					<div className="flex flex-col gap-4 border rounded-lg">
						<ShowDeployments
							id={id}
							type="application"
							serverId={data.serverId || ""}
							refreshToken={data.refreshToken || ""}
						/>
					</div>
				</TabsContent>
				<TabsContent value="domains" className="mt-0">
					<div className="flex flex-col gap-4">
						<ShowDomains id={id} type="application" />
					</div>
				</TabsContent>
				<TabsContent value="logs" className="mt-0">
					<div className="flex flex-col gap-4">
						<ShowDockerLogs
							appName={data.appName || ""}
							serverId={data.serverId || ""}
							serviceId={id}
						/>
					</div>
				</TabsContent>
				<TabsContent value="monitoring" className="mt-0">
					<div className="flex flex-col gap-4 border rounded-lg p-6">
						<ContainerFreeMonitoring appName={data.appName || ""} />
					</div>
				</TabsContent>
				<TabsContent value="advanced" className="mt-0">
					<div className="flex flex-col gap-4">
						<AddCommand applicationId={id} />
						<ShowClusterSettings id={id} type="application" />
						<ShowBuildServer applicationId={id} />
						<ShowResources id={id} type="application" />
						<ShowVolumes id={id} type="application" />
						<ShowRedirects applicationId={id} />
						<ShowSecurity applicationId={id} />
						<ShowPorts applicationId={id} />
						<ShowTraefikConfig applicationId={id} />
					</div>
				</TabsContent>
			</div>
		</Tabs>
	);
}

/* ─── Database Panel (Postgres, MySQL, MariaDB, MongoDB, Redis) ─── */

type DbType = "postgres" | "mysql" | "mariadb" | "mongo" | "redis";

function DatabaseTabs({
	id,
	dbType,
	appName,
	serverId,
}: { id: string; dbType: DbType; appName: string; serverId?: string | null }) {
	const [tab, setTab] = useState("general");

	// Query based on type (only enabled one runs)
	const pg = api.postgres.one.useQuery({ postgresId: id }, { enabled: dbType === "postgres" });
	const my = api.mysql.one.useQuery({ mysqlId: id }, { enabled: dbType === "mysql" });
	const ma = api.mariadb.one.useQuery({ mariadbId: id }, { enabled: dbType === "mariadb" });
	const mo = api.mongo.one.useQuery({ mongoId: id }, { enabled: dbType === "mongo" });
	const re = api.redis.one.useQuery({ redisId: id }, { enabled: dbType === "redis" });

	const data = pg.data || my.data || ma.data || mo.data || re.data;
	const hasBackups = dbType !== "redis";

	if (!data) {
		return <PanelLoader />;
	}

	return (
		<Tabs value={tab} onValueChange={setTab} className="flex flex-col h-full">
			<div className="border-b px-5 shrink-0 overflow-x-auto">
				<TabsList className="bg-transparent h-10 gap-4">
					<TabsTrigger value="general" className="text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">General</TabsTrigger>
					<TabsTrigger value="environment" className="text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Environment</TabsTrigger>
					<TabsTrigger value="logs" className="text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Logs</TabsTrigger>
					{hasBackups && (
						<TabsTrigger value="backups" className="text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Backups</TabsTrigger>
					)}
					<TabsTrigger value="monitoring" className="text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Monitoring</TabsTrigger>
					<TabsTrigger value="advanced" className="text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Advanced</TabsTrigger>
				</TabsList>
			</div>
			<div className="flex-1 overflow-y-auto p-5">
				<TabsContent value="general" className="mt-0">
					<div className="flex flex-col gap-4">
						<DatabaseGeneralContent id={id} dbType={dbType} />
					</div>
				</TabsContent>
				<TabsContent value="environment" className="mt-0">
					<div className="flex flex-col gap-4">
						<ShowDbEnvironment id={id} type={dbType} />
					</div>
				</TabsContent>
				<TabsContent value="logs" className="mt-0">
					<div className="flex flex-col gap-4">
						<ShowDockerLogs
							appName={(data as any).appName || ""}
							serverId={(data as any).serverId || ""}
							serviceId={id}
						/>
					</div>
				</TabsContent>
				{hasBackups && (
					<TabsContent value="backups" className="mt-0">
						<div className="flex flex-col gap-4">
							<ShowBackups
								id={id}
								databaseType={dbType}
								backupType="database"
							/>
						</div>
					</TabsContent>
				)}
				<TabsContent value="monitoring" className="mt-0">
					<div className="flex flex-col gap-4 border rounded-lg p-6">
						<ContainerFreeMonitoring appName={(data as any).appName || ""} />
					</div>
				</TabsContent>
				<TabsContent value="advanced" className="mt-0">
					<div className="flex flex-col gap-4">
						<ShowDatabaseAdvancedSettings id={id} type={dbType} />
					</div>
				</TabsContent>
			</div>
		</Tabs>
	);
}

function DatabaseGeneralContent({ id, dbType }: { id: string; dbType: DbType }) {
	switch (dbType) {
		case "postgres":
			return (
				<>
					<ShowGeneralPostgres postgresId={id} />
					<ShowInternalPostgresCredentials postgresId={id} />
					<ShowExternalPostgresCredentials postgresId={id} />
				</>
			);
		case "mysql":
			return (
				<>
					<ShowGeneralMysql mysqlId={id} />
					<ShowInternalMysqlCredentials mysqlId={id} />
					<ShowExternalMysqlCredentials mysqlId={id} />
				</>
			);
		case "mariadb":
			return (
				<>
					<ShowGeneralMariadb mariadbId={id} />
					<ShowInternalMariadbCredentials mariadbId={id} />
					<ShowExternalMariadbCredentials mariadbId={id} />
				</>
			);
		case "mongo":
			return (
				<>
					<ShowGeneralMongo mongoId={id} />
					<ShowInternalMongoCredentials mongoId={id} />
					<ShowExternalMongoCredentials mongoId={id} />
				</>
			);
		case "redis":
			return (
				<>
					<ShowGeneralRedis redisId={id} />
					<ShowInternalRedisCredentials redisId={id} />
					<ShowExternalRedisCredentials redisId={id} />
				</>
			);
	}
}

/* ─── Compose Panel ─── */

function ComposeTabs({
	id,
	appName,
	serverId,
}: { id: string; appName: string; serverId?: string | null }) {
	const [tab, setTab] = useState("general");
	const { data } = api.compose.one.useQuery({ composeId: id });

	if (!data) {
		return <PanelLoader />;
	}

	const isDockerCompose = data.composeType === "docker-compose";

	return (
		<Tabs value={tab} onValueChange={setTab} className="flex flex-col h-full">
			<div className="border-b px-5 shrink-0 overflow-x-auto">
				<TabsList className="bg-transparent h-10 gap-4">
					<TabsTrigger value="general" className="text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">General</TabsTrigger>
					<TabsTrigger value="environment" className="text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Environment</TabsTrigger>
					<TabsTrigger value="deployments" className="text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Deployments</TabsTrigger>
					<TabsTrigger value="domains" className="text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Domains</TabsTrigger>
					<TabsTrigger value="logs" className="text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Logs</TabsTrigger>
					<TabsTrigger value="monitoring" className="text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Monitoring</TabsTrigger>
					<TabsTrigger value="advanced" className="text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Advanced</TabsTrigger>
				</TabsList>
			</div>
			<div className="flex-1 overflow-y-auto p-5">
				<TabsContent value="general" className="mt-0">
					<div className="flex flex-col gap-4">
						<ShowGeneralCompose composeId={id} />
					</div>
				</TabsContent>
				<TabsContent value="environment" className="mt-0">
					<div className="flex flex-col gap-4">
						<ShowDbEnvironment id={id} type="compose" />
					</div>
				</TabsContent>
				<TabsContent value="deployments" className="mt-0">
					<div className="flex flex-col gap-4 border rounded-lg">
						<ShowDeployments
							id={id}
							type="compose"
							serverId={data.serverId || ""}
							refreshToken={data.refreshToken || ""}
						/>
					</div>
				</TabsContent>
				<TabsContent value="domains" className="mt-0">
					<div className="flex flex-col gap-4">
						<ShowDomains id={id} type="compose" />
					</div>
				</TabsContent>
				<TabsContent value="logs" className="mt-0">
					<div className="flex flex-col gap-4">
						{isDockerCompose ? (
							<ShowDockerLogsCompose
								serverId={data.serverId || ""}
								appName={data.appName}
								appType={data.composeType || "docker-compose"}
								serviceId={id}
							/>
						) : (
							<ShowDockerLogsStack
								serverId={data.serverId || ""}
								appName={data.appName}
								serviceId={id}
							/>
						)}
					</div>
				</TabsContent>
				<TabsContent value="monitoring" className="mt-0">
					<div className="flex flex-col gap-4 border rounded-lg p-6">
						<ContainerFreeMonitoring appName={data.appName || ""} />
					</div>
				</TabsContent>
				<TabsContent value="advanced" className="mt-0">
					<div className="flex flex-col gap-4">
						<AddCommandCompose composeId={id} />
						<ShowVolumes id={id} type="compose" />
						<ShowImport composeId={id} />
						<IsolatedDeploymentTab composeId={id} />
					</div>
				</TabsContent>
			</div>
		</Tabs>
	);
}

/* ─── Shared ─── */

function PanelLoader() {
	return (
		<div className="flex items-center justify-center h-full text-muted-foreground text-sm gap-2">
			<Loader2 className="size-4 animate-spin" />
			Loading service...
		</div>
	);
}
