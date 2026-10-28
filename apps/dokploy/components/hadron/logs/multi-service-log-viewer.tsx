"use client";

import {
	ArrowDown,
	ChevronDown,
	Loader2,
	Pause,
	Play,
	Search,
	X,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { api } from "@/utils/api";
import {
	parseLogs,
	type LogLine,
} from "@/components/dashboard/docker/logs/utils";
import { FancyAnsi } from "fancy-ansi";

const fancyAnsi = new FancyAnsi();

const SERVICE_COLORS = [
	"#8b5cf6", // violet
	"#06b6d4", // cyan
	"#f59e0b", // amber
	"#10b981", // emerald
	"#ef4444", // red
	"#ec4899", // pink
	"#3b82f6", // blue
	"#f97316", // orange
];

const LOG_LEVELS = ["error", "warn", "info", "debug"] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

interface ServiceSource {
	id: string;
	name: string;
	appName: string;
	serverId?: string | null;
	runType?: "swarm" | "native";
}

interface MergedLogLine extends LogLine {
	serviceId: string;
	serviceName: string;
	serviceColor: string;
	level?: LogLevel;
}

interface MultiServiceLogViewerProps {
	services: ServiceSource[];
	className?: string;
}

/** Simple heuristic to detect log level from message */
function detectLevel(message: string): LogLevel | undefined {
	const lower = message.toLowerCase();
	if (lower.includes("error") || lower.includes("err ") || lower.includes("fatal")) return "error";
	if (lower.includes("warn") || lower.includes("warning")) return "warn";
	if (lower.includes("debug") || lower.includes("trace")) return "debug";
	return undefined; // default to no level (treated as info)
}

export function MultiServiceLogViewer({
	services,
	className,
}: MultiServiceLogViewerProps) {
	const [logs, setLogs] = useState<MergedLogLine[]>([]);
	const [paused, setPaused] = useState(false);
	const [stickyScroll, setStickyScroll] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [enabledServices, setEnabledServices] = useState<Set<string>>(
		() => new Set(services.map((s) => s.id)),
	);
	const [enabledLevels, setEnabledLevels] = useState<Set<string>>(
		() => new Set(["error", "warn", "info", "debug", "none"]),
	);
	const scrollRef = useRef<HTMLDivElement>(null);
	const pausedRef = useRef(false);
	const bufferRef = useRef<MergedLogLine[]>([]);
	const wsRefs = useRef<Map<string, WebSocket>>(new Map());

	const MAX_LINES = 2000;
	const [resolving, setResolving] = useState(true);
	const utils = api.useUtils();

	const serviceColorMap = useMemo(() => {
		const map = new Map<string, string>();
		services.forEach((svc, i) => {
			map.set(svc.id, SERVICE_COLORS[i % SERVICE_COLORS.length] as string);
		});
		return map;
	}, [services]);

	// Resolve containers and connect WebSockets
	useEffect(() => {
		let cancelled = false;
		const currentWs = wsRefs.current;
		setResolving(true);

		async function connectAll() {
			for (const svc of services) {
				if (cancelled || !svc.appName) continue;
				try {
					const containers = await utils.docker.getContainersByAppNameMatch.fetch({
						appName: svc.appName,
						serverId: svc.serverId ?? undefined,
					});
					if (cancelled || !containers?.length) continue;

					const containerId = containers[0]!.containerId;
					const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
					const params = new URLSearchParams({
						containerId,
						tail: "200",
						since: "all",
						search: "",
						runType: svc.runType || "native",
					});
					if (svc.serverId) params.append("serverId", svc.serverId);
					params.append("serviceId", svc.id);

					const ws = new WebSocket(
						`${protocol}//${window.location.host}/docker-container-logs?${params.toString()}`,
					);

					const color = serviceColorMap.get(svc.id) || "#888";

					ws.onmessage = (e) => {
						const parsed = parseLogs(e.data);
						const merged: MergedLogLine[] = parsed.map((line) => ({
							...line,
							serviceId: svc.id,
							serviceName: svc.name,
							serviceColor: color,
							level: detectLevel(line.message),
						}));

						if (pausedRef.current) {
							bufferRef.current.push(...merged);
						} else {
							setLogs((prev) => {
								const updated = [...prev, ...merged];
								return updated.length > MAX_LINES
									? updated.slice(-MAX_LINES)
									: updated;
							});
						}
					};

					currentWs.set(svc.id, ws);
				} catch {
					// Container not found or not running - skip
				}
			}
			if (!cancelled) setResolving(false);
		}

		connectAll();

		return () => {
			cancelled = true;
			for (const ws of currentWs.values()) {
				ws.close();
			}
			currentWs.clear();
		};
	}, [services, serviceColorMap, utils]);

	// Auto-scroll
	useEffect(() => {
		if (stickyScroll && scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [logs, stickyScroll]);

	const handleScroll = useCallback(() => {
		if (!scrollRef.current) return;
		const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
		const nearBottom = scrollHeight - scrollTop - clientHeight < 60;
		setStickyScroll(nearBottom);
	}, []);

	const togglePause = useCallback(() => {
		if (pausedRef.current) {
			setLogs((prev) => {
				const updated = [...prev, ...bufferRef.current];
				bufferRef.current = [];
				return updated.length > MAX_LINES
					? updated.slice(-MAX_LINES)
					: updated;
			});
		}
		pausedRef.current = !pausedRef.current;
		setPaused((p) => !p);
	}, []);

	const toggleService = useCallback((serviceId: string) => {
		setEnabledServices((prev) => {
			const next = new Set(prev);
			if (next.has(serviceId)) next.delete(serviceId);
			else next.add(serviceId);
			return next;
		});
	}, []);

	const toggleLevel = useCallback((level: string) => {
		setEnabledLevels((prev) => {
			const next = new Set(prev);
			if (next.has(level)) next.delete(level);
			else next.add(level);
			return next;
		});
	}, []);

	const filteredLogs = useMemo(() => {
		let filtered = logs.filter((l) => enabledServices.has(l.serviceId));
		// Filter by level
		filtered = filtered.filter((l) => {
			const level = l.level || "none"; // "none" means info/general
			return enabledLevels.has(level) || (level === undefined && enabledLevels.has("none"));
		});
		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			filtered = filtered.filter((l) =>
				l.message.toLowerCase().includes(q),
			);
		}
		return filtered;
	}, [logs, enabledServices, enabledLevels, searchQuery]);

	// Count active filters
	const activeFilterCount =
		(enabledServices.size < services.length ? 1 : 0) +
		(enabledLevels.size < 5 ? 1 : 0);

	return (
		<div className={cn("flex flex-col rounded-lg border bg-card", className)}>
			{/* Top bar: Search + controls */}
			<div className="flex items-center gap-2 border-b px-3 py-2">
				<div className="relative flex-1">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
					<Input
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Filter and search logs..."
						className="h-8 pl-8 text-sm bg-muted/30 border-none"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => setSearchQuery("")}
							className="absolute right-2.5 top-1/2 -translate-y-1/2"
						>
							<X className="size-3.5 text-muted-foreground" />
						</button>
					)}
				</div>
				<Button
					variant="ghost"
					size="icon"
					className="size-8 shrink-0"
					onClick={togglePause}
				>
					{paused ? (
						<Play className="size-3.5" />
					) : (
						<Pause className="size-3.5" />
					)}
				</Button>
			</div>

			{/* Filter bar: Tags */}
			<div className="flex items-center gap-2 border-b px-3 py-1.5 flex-wrap">
				<span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
					Tags
				</span>

				{/* @service filter */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							className={cn(
								"inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium transition-colors",
								enabledServices.size < services.length
									? "bg-primary/15 text-primary"
									: "bg-muted text-muted-foreground hover:text-foreground",
							)}
						>
							@service
							<ChevronDown className="size-3" />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-48">
						{services.map((svc) => (
							<DropdownMenuCheckboxItem
								key={svc.id}
								checked={enabledServices.has(svc.id)}
								onCheckedChange={() => toggleService(svc.id)}
							>
								<span className="flex items-center gap-2">
									<span
										className="size-2 rounded-full shrink-0"
										style={{ backgroundColor: serviceColorMap.get(svc.id) }}
									/>
									{svc.name}
								</span>
							</DropdownMenuCheckboxItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>

				{/* @level filter */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							className={cn(
								"inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium transition-colors",
								enabledLevels.size < 5
									? "bg-primary/15 text-primary"
									: "bg-muted text-muted-foreground hover:text-foreground",
							)}
						>
							@level
							<ChevronDown className="size-3" />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-36">
						{LOG_LEVELS.map((level) => (
							<DropdownMenuCheckboxItem
								key={level}
								checked={enabledLevels.has(level)}
								onCheckedChange={() => toggleLevel(level)}
							>
								<span className={cn(
									"capitalize",
									level === "error" && "text-destructive",
									level === "warn" && "text-yellow-500",
									level === "debug" && "text-muted-foreground",
								)}>
									{level}
								</span>
							</DropdownMenuCheckboxItem>
						))}
						<DropdownMenuCheckboxItem
							checked={enabledLevels.has("none")}
							onCheckedChange={() => toggleLevel("none")}
						>
							other
						</DropdownMenuCheckboxItem>
					</DropdownMenuContent>
				</DropdownMenu>

				{/* Active filter pills */}
				{enabledServices.size < services.length && (
					<div className="flex items-center gap-1">
						{services
							.filter((s) => enabledServices.has(s.id))
							.map((svc) => (
								<span
									key={svc.id}
									className="inline-flex items-center gap-1 rounded-full pl-1.5 pr-1 py-0.5 text-[10px] font-medium"
									style={{
										backgroundColor: `${serviceColorMap.get(svc.id)}15`,
										color: serviceColorMap.get(svc.id),
									}}
								>
									{svc.name}
									<button
										type="button"
										onClick={() => toggleService(svc.id)}
										className="hover:opacity-70"
									>
										<X className="size-2.5" />
									</button>
								</span>
							))}
					</div>
				)}

				<div className="flex-1" />

				{/* Streaming indicator */}
				<span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
					<span
						className={cn(
							"size-1.5 rounded-full",
							paused ? "bg-yellow-500" : "bg-emerald-500 animate-pulse",
						)}
					/>
					{paused ? "Paused" : "Streaming"}
				</span>
			</div>

			{/* Log area */}
			<div
				ref={scrollRef}
				onScroll={handleScroll}
				className="relative flex-1 overflow-auto font-mono text-xs leading-5"
				style={{
					fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
					minHeight: "300px",
				}}
			>
				{resolving ? (
					<div className="flex items-center justify-center h-full text-muted-foreground text-sm gap-2">
						<Loader2 className="size-4 animate-spin" />
						Connecting to containers...
					</div>
				) : filteredLogs.length === 0 ? (
					<div className="flex items-center justify-center h-full text-muted-foreground text-sm">
						{services.length === 0
							? "No services selected"
							: "Waiting for logs..."}
					</div>
				) : (
					filteredLogs.map((line, i) => (
						<div
							key={`${line.serviceId}-${i}`}
							className={cn(
								"flex items-start px-3 py-px hover:bg-muted/30 group",
								line.level === "error" && "bg-destructive/5",
								line.level === "warn" && "bg-yellow-500/5",
							)}
						>
							{/* Service indicator */}
							<span
								className="shrink-0 w-1 self-stretch mr-2 rounded-full"
								style={{ backgroundColor: line.serviceColor }}
							/>
							{/* Timestamp */}
							{line.rawTimestamp && (
								<span className="shrink-0 text-muted-foreground/50 mr-3 w-20 truncate tabular-nums">
									{line.timestamp
										? line.timestamp.toLocaleTimeString()
										: line.rawTimestamp}
								</span>
							)}
							{/* Service name */}
							<span
								className="shrink-0 w-24 truncate mr-3 font-medium"
								style={{ color: line.serviceColor }}
							>
								{line.serviceName}
							</span>
							{/* Message */}
							<span
								className={cn(
									"flex-1 break-all whitespace-pre-wrap",
									line.level === "error" && "text-destructive",
									line.level === "warn" && "text-yellow-500",
									line.level === "debug" && "text-muted-foreground/70",
								)}
								dangerouslySetInnerHTML={{
									__html: fancyAnsi.toHtml(line.message),
								}}
							/>
						</div>
					))
				)}

				{/* Scroll to bottom button */}
				{!stickyScroll && (
					<button
						type="button"
						onClick={() => {
							if (scrollRef.current) {
								scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
								setStickyScroll(true);
							}
						}}
						className="sticky bottom-3 left-1/2 -translate-x-1/2 ml-[calc(50%-16px)] z-10 rounded-full bg-primary p-2 text-primary-foreground shadow-lg hover:bg-primary/90 transition"
					>
						<ArrowDown className="size-4" />
					</button>
				)}
			</div>

			{/* Status bar */}
			<div className="flex items-center justify-between border-t px-3 py-1.5 text-[10px] text-muted-foreground">
				<span>
					{filteredLogs.length} lines
					{filteredLogs.length !== logs.length &&
						` (${logs.length} total)`}
				</span>
				<div className="flex items-center gap-3">
					{paused && (
						<Badge
							variant="outline"
							className="h-4 text-[10px] px-1.5 border-yellow-500/50 text-yellow-500"
						>
							PAUSED
						</Badge>
					)}
					{activeFilterCount > 0 && (
						<span className="text-primary">
							{activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active
						</span>
					)}
				</div>
			</div>
		</div>
	);
}
