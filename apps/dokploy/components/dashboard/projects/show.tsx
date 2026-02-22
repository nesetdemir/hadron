import {
	AlertTriangle,
	ChevronDown,
	CircuitBoard,
	ExternalLinkIcon,
	FolderInput,
	GlobeIcon,
	Loader2,
	MoreHorizontalIcon,
	Search,
	TrashIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { StatusTooltip } from "@/components/shared/status-tooltip";
import {
	MariadbIcon,
	MongodbIcon,
	MysqlIcon,
	PostgresqlIcon,
	RedisIcon,
} from "@/components/icons/data-tools-icons";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { api } from "@/utils/api";
import { useDebounce } from "@/utils/hooks/use-debounce";
import { HandleProject } from "./handle-project";
import { ProjectEnvironment } from "./project-environment";

type ServiceIcon = {
	type: "application" | "postgres" | "mysql" | "mariadb" | "mongo" | "redis" | "compose";
	status?: string;
};

const SERVICE_ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
	application: ({ className }) => <GlobeIcon className={className} />,
	postgres: PostgresqlIcon,
	mysql: MysqlIcon,
	mariadb: MariadbIcon,
	mongo: MongodbIcon,
	redis: RedisIcon,
	compose: ({ className }) => <CircuitBoard className={className} />,
};

const SERVICE_ICON_COLORS: Record<string, { text: string; bg: string }> = {
	application: { text: "text-blue-500", bg: "bg-blue-500/10" },
	postgres: { text: "text-blue-600", bg: "bg-blue-600/10" },
	mysql: { text: "text-orange-500", bg: "bg-orange-500/10" },
	mariadb: { text: "text-amber-700", bg: "bg-amber-700/10" },
	mongo: { text: "text-green-600", bg: "bg-green-600/10" },
	redis: { text: "text-red-500", bg: "bg-red-500/10" },
	compose: { text: "text-violet-500", bg: "bg-violet-500/10" },
};

const SORT_OPTIONS = [
	{ value: "createdAt-desc", label: "Recent Activity" },
	{ value: "createdAt-asc", label: "Oldest First" },
	{ value: "name-asc", label: "Name (A-Z)" },
	{ value: "name-desc", label: "Name (Z-A)" },
	{ value: "services-desc", label: "Most Services" },
	{ value: "services-asc", label: "Least Services" },
];

function collectProjectServices(
	environments: Array<{
		name: string;
		isDefault: boolean;
		applications: Array<{ applicationStatus: string }>;
		mariadb: Array<{ applicationStatus: string }>;
		mongo: Array<{ applicationStatus: string }>;
		mysql: Array<{ applicationStatus: string }>;
		postgres: Array<{ applicationStatus: string }>;
		redis: Array<{ applicationStatus: string }>;
		compose: Array<{ composeStatus: string }>;
	}>,
) {
	const icons: ServiceIcon[] = [];
	let running = 0;
	let total = 0;

	for (const env of environments) {
		for (const app of env.applications) {
			icons.push({ type: "application", status: app.applicationStatus });
			total++;
			if (app.applicationStatus === "running") running++;
		}
		for (const db of env.postgres) {
			icons.push({ type: "postgres", status: db.applicationStatus });
			total++;
			if (db.applicationStatus === "running") running++;
		}
		for (const db of env.mysql) {
			icons.push({ type: "mysql", status: db.applicationStatus });
			total++;
			if (db.applicationStatus === "running") running++;
		}
		for (const db of env.mariadb) {
			icons.push({ type: "mariadb", status: db.applicationStatus });
			total++;
			if (db.applicationStatus === "running") running++;
		}
		for (const db of env.mongo) {
			icons.push({ type: "mongo", status: db.applicationStatus });
			total++;
			if (db.applicationStatus === "running") running++;
		}
		for (const db of env.redis) {
			icons.push({ type: "redis", status: db.applicationStatus });
			total++;
			if (db.applicationStatus === "running") running++;
		}
		for (const comp of env.compose) {
			icons.push({ type: "compose", status: comp.composeStatus });
			total++;
			if (comp.composeStatus === "running") running++;
		}
	}

	return { icons, running, total };
}

export const ShowProjects = () => {
	const utils = api.useUtils();
	const router = useRouter();
	const { data: auth } = api.user.get.useQuery();
	const { data, isLoading } = api.project.all.useQuery();
	const { mutateAsync } = api.project.remove.useMutation();

	const [searchQuery, setSearchQuery] = useState("");
	const [showSearch, setShowSearch] = useState(false);
	const debouncedSearchQuery = useDebounce(searchQuery, 500);

	const [sortBy, setSortBy] = useState<string>("createdAt-desc");

	useEffect(() => {
		const saved = localStorage.getItem("projectsSort");
		if (saved) setSortBy(saved);
	}, []);

	useEffect(() => {
		localStorage.setItem("projectsSort", sortBy);
	}, [sortBy]);

	useEffect(() => {
		if (!router.isReady) return;
		const urlQuery = typeof router.query.q === "string" ? router.query.q : "";
		if (urlQuery !== searchQuery) {
			setSearchQuery(urlQuery);
		}
	}, [router.isReady, router.query.q]);

	useEffect(() => {
		if (!router.isReady) return;
		const urlQuery = typeof router.query.q === "string" ? router.query.q : "";
		if (debouncedSearchQuery === urlQuery) return;

		const newQuery = { ...router.query };
		if (debouncedSearchQuery) {
			newQuery.q = debouncedSearchQuery;
		} else {
			delete newQuery.q;
		}
		router.replace({ pathname: router.pathname, query: newQuery }, undefined, {
			shallow: true,
		});
	}, [debouncedSearchQuery]);

	const sortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Recent Activity";

	const filteredProjects = useMemo(() => {
		if (!data) return [];

		const filtered = data.filter(
			(project) =>
				project.name
					.toLowerCase()
					.includes(debouncedSearchQuery.toLowerCase()) ||
				project.description
					?.toLowerCase()
					.includes(debouncedSearchQuery.toLowerCase()),
		);

		const [field, direction] = sortBy.split("-");
		return [...filtered].sort((a, b) => {
			let comparison = 0;
			switch (field) {
				case "name":
					comparison = a.name.localeCompare(b.name);
					break;
				case "createdAt":
					comparison =
						new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
					break;
				case "services": {
					const aTotalServices = a.environments.reduce((total, env) => {
						return (
							total +
							(env.applications?.length || 0) +
							(env.mariadb?.length || 0) +
							(env.mongo?.length || 0) +
							(env.mysql?.length || 0) +
							(env.postgres?.length || 0) +
							(env.redis?.length || 0) +
							(env.compose?.length || 0)
						);
					}, 0);
					const bTotalServices = b.environments.reduce((total, env) => {
						return (
							total +
							(env.applications?.length || 0) +
							(env.mariadb?.length || 0) +
							(env.mongo?.length || 0) +
							(env.mysql?.length || 0) +
							(env.postgres?.length || 0) +
							(env.redis?.length || 0) +
							(env.compose?.length || 0)
						);
					}, 0);
					comparison = aTotalServices - bTotalServices;
					break;
				}
				default:
					comparison = 0;
			}
			return direction === "asc" ? comparison : -comparison;
		});
	}, [data, debouncedSearchQuery, sortBy]);

	return (
		<div className="pt-4 max-w-[1400px] mx-auto">
			{/* Page header */}
			<div className="flex items-center justify-between mb-1">
				<h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
				<div className="flex items-center gap-2">
					{showSearch ? (
						<Input
							autoFocus
							placeholder="Search projects..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							onBlur={() => {
								if (!searchQuery) setShowSearch(false);
							}}
							className="h-8 w-48 text-sm"
						/>
					) : (
						<Button
							variant="ghost"
							size="icon"
							className="size-8 text-muted-foreground"
							onClick={() => setShowSearch(true)}
						>
							<Search className="size-4" />
						</Button>
					)}
					{(auth?.role === "owner" ||
						auth?.role === "admin" ||
						auth?.canCreateProjects) && (
						<HandleProject />
					)}
				</div>
			</div>

			{/* Subtitle: count + sort */}
			<div className="flex items-center gap-3 text-sm text-muted-foreground mb-8">
				<span>{filteredProjects.length} Projects</span>
				<DropdownMenu>
					<DropdownMenuTrigger className="flex items-center gap-1 hover:text-foreground transition-colors outline-none">
						Sort By: {sortLabel}
						<ChevronDown className="size-3.5" />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						{SORT_OPTIONS.map((option) => (
							<DropdownMenuItem
								key={option.value}
								onClick={() => setSortBy(option.value)}
								className={sortBy === option.value ? "text-foreground font-medium" : ""}
							>
								{option.label}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{/* Content */}
			{isLoading ? (
				<div className="flex items-center justify-center gap-2 text-sm text-muted-foreground h-[50vh]">
					<Loader2 className="animate-spin size-4" />
					<span>Loading projects...</span>
				</div>
			) : filteredProjects.length === 0 ? (
				<div className="flex flex-col items-center justify-center gap-3 h-[50vh] text-muted-foreground">
					<FolderInput className="size-10 opacity-40" />
					<span className="text-sm font-medium">No projects found</span>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{filteredProjects.map((project) => {
						const emptyServices = project?.environments
							.map(
								(env) =>
									env.applications.length === 0 &&
									env.mariadb.length === 0 &&
									env.mongo.length === 0 &&
									env.mysql.length === 0 &&
									env.postgres.length === 0 &&
									env.redis.length === 0 &&
									env.compose.length === 0,
							)
							.every(Boolean);

						const totalServices = project?.environments
							.map(
								(env) =>
									env.mariadb.length +
									env.mongo.length +
									env.mysql.length +
									env.postgres.length +
									env.redis.length +
									env.applications.length +
									env.compose.length,
							)
							.reduce((acc, curr) => acc + curr, 0);

						const { icons: serviceIcons, running: runningServices } =
							collectProjectServices(project.environments as any);

						const haveServicesWithDomains = project?.environments
							.map(
								(env) =>
									env.applications.length > 0 ||
									env.compose.length > 0,
							)
							.some(Boolean);

						const accessibleEnvironment =
							project?.environments.find((env) => env.isDefault) ||
							project?.environments?.[0];

						const hasNoEnvironments = !accessibleEnvironment;

						return (
							<Link
								key={project.projectId}
								href={
									hasNoEnvironments
										? "#"
										: `/dashboard/project/${project.projectId}/environment/${accessibleEnvironment?.environmentId}`
								}
								onClick={(e) => {
									if (hasNoEnvironments) {
										e.preventDefault();
									}
								}}
							>
								<div className="group relative rounded-xl border bg-card hover:bg-accent/40 transition-colors flex flex-col min-h-[200px]">
									{/* Card header: name + actions */}
									<div className="flex items-start justify-between p-4 pb-0">
										<h3 className="text-sm font-medium leading-tight">
											{project.name}
										</h3>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													variant="ghost"
													size="icon"
													className="size-7 -mt-1 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity"
													onClick={(e) => e.preventDefault()}
												>
													<MoreHorizontalIcon className="size-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent
												className="w-[200px]"
												onClick={(e) => e.stopPropagation()}
											>
												<DropdownMenuLabel className="font-normal text-xs">
													Actions
												</DropdownMenuLabel>
												<DropdownMenuSeparator />
												<div onClick={(e) => e.stopPropagation()}>
													<ProjectEnvironment
														projectId={project.projectId}
													/>
												</div>
												<div onClick={(e) => e.stopPropagation()}>
													<HandleProject
														projectId={project.projectId}
													/>
												</div>
												{haveServicesWithDomains && (
													<>
														<DropdownMenuSeparator />
														<DropdownMenuGroup>
															<DropdownMenuLabel className="text-xs">
																Domains
															</DropdownMenuLabel>
															{project.environments.map((env) =>
																[...env.applications, ...env.compose].map((svc: any) =>
																	svc.domains?.map((domain: any) => (
																		<DropdownMenuItem
																			key={domain.domainId}
																			asChild
																		>
																			<a
																				className="text-xs cursor-pointer justify-between"
																				target="_blank"
																				rel="noopener noreferrer"
																				href={`${domain.https ? "https" : "http"}://${domain.host}${domain.path}`}
																			>
																				<span className="truncate">{domain.host}</span>
																				<ExternalLinkIcon className="size-3 shrink-0 ml-2" />
																			</a>
																		</DropdownMenuItem>
																	)),
																),
															)}
														</DropdownMenuGroup>
													</>
												)}
												{(auth?.role === "owner" ||
													auth?.canDeleteProjects) && (
													<>
														<DropdownMenuSeparator />
														<div onClick={(e) => e.stopPropagation()}>
															<AlertDialog>
																<AlertDialogTrigger className="w-full">
																	<DropdownMenuItem
																		className="w-full cursor-pointer text-destructive"
																		onSelect={(e) =>
																			e.preventDefault()
																		}
																	>
																		<TrashIcon className="size-3.5 mr-2" />
																		Delete
																	</DropdownMenuItem>
																</AlertDialogTrigger>
																<AlertDialogContent>
																	<AlertDialogHeader>
																		<AlertDialogTitle>
																			Delete this project?
																		</AlertDialogTitle>
																		{!emptyServices ? (
																			<div className="flex gap-3 items-center rounded-lg bg-yellow-50 p-3 dark:bg-yellow-950">
																				<AlertTriangle className="size-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
																				<span className="text-sm text-yellow-600 dark:text-yellow-400">
																					You have active services. Delete them first.
																				</span>
																			</div>
																		) : (
																			<AlertDialogDescription>
																				This action cannot be undone.
																			</AlertDialogDescription>
																		)}
																	</AlertDialogHeader>
																	<AlertDialogFooter>
																		<AlertDialogCancel>
																			Cancel
																		</AlertDialogCancel>
																		<AlertDialogAction
																			disabled={!emptyServices}
																			onClick={async () => {
																				await mutateAsync({
																					projectId:
																						project.projectId,
																				})
																					.then(() => {
																						toast.success(
																							"Project deleted successfully",
																						);
																					})
																					.catch(() => {
																						toast.error(
																							"Error deleting this project",
																						);
																					})
																					.finally(() => {
																						utils.project.all.invalidate();
																					});
																			}}
																		>
																			Delete
																		</AlertDialogAction>
																	</AlertDialogFooter>
																</AlertDialogContent>
															</AlertDialog>
														</div>
													</>
												)}
											</DropdownMenuContent>
										</DropdownMenu>
									</div>

									{/* No environments warning */}
									{hasNoEnvironments && (
										<div className="mx-4 mt-2 flex gap-2 items-center rounded-lg bg-yellow-50 p-2 dark:bg-yellow-950">
											<AlertTriangle className="size-3.5 text-yellow-600 dark:text-yellow-400 shrink-0" />
											<span className="text-xs text-yellow-600 dark:text-yellow-400">
												No environments available
											</span>
										</div>
									)}

									{/* Service icons - centered in card body */}
									<div className="flex-1 flex items-center justify-center px-4 py-6">
										{serviceIcons.length > 0 ? (
											<div className="flex flex-wrap gap-2.5 justify-center">
												{serviceIcons.slice(0, 12).map((svc, i) => {
													const IconComp = SERVICE_ICON_MAP[svc.type];
													const colors = SERVICE_ICON_COLORS[svc.type];
													return (
														<div
															key={`${svc.type}-${i}`}
															className={`flex items-center justify-center w-9 h-9 rounded-lg ${colors?.bg ?? "bg-muted/60"}`}
														>
															{IconComp && (
																<IconComp className={`size-5 ${colors?.text ?? "text-muted-foreground"}`} />
															)}
														</div>
													);
												})}
												{serviceIcons.length > 12 && (
													<div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted/60">
														<span className="text-xs text-muted-foreground font-medium">
															+{serviceIcons.length - 12}
														</span>
													</div>
												)}
											</div>
										) : (
											<span className="text-xs text-muted-foreground/50">
												No services
											</span>
										)}
									</div>

									{/* Footer: status */}
									<div className="px-4 pb-3.5 flex items-center gap-1.5 text-xs text-muted-foreground">
										<span className={`inline-block size-1.5 rounded-full ${runningServices > 0 ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
										<span>
											{accessibleEnvironment?.name
												? accessibleEnvironment.name.charAt(0).toUpperCase() + accessibleEnvironment.name.slice(1)
												: "Production"} · {runningServices}/{totalServices} services online
										</span>
									</div>
								</div>
							</Link>
						);
					})}
				</div>
			)}
		</div>
	);
};
