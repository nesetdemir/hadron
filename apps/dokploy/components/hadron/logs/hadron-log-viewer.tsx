"use client";

import copy from "copy-to-clipboard";
import {
	ArrowDown,
	Check,
	Copy,
	Download as DownloadIcon,
	Loader2,
	Pause,
	Play,
	Search,
	X,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { api } from "@/utils/api";
import {
	LineCountFilter,
} from "@/components/dashboard/docker/logs/line-count-filter";
import {
	SinceLogsFilter,
	type TimeFilter,
} from "@/components/dashboard/docker/logs/since-logs-filter";
import {
	StatusLogsFilter,
} from "@/components/dashboard/docker/logs/status-logs-filter";
import { priorities } from "@/components/dashboard/docker/logs/docker-logs-id";
import {
	getLogType,
	parseLogs,
	type LogLine,
} from "@/components/dashboard/docker/logs/utils";
import { FancyAnsi } from "fancy-ansi";
import _ from "lodash";

const fancyAnsi = new FancyAnsi();

interface HadronLogViewerProps {
	containerId: string;
	serverId?: string | null;
	runType: "swarm" | "native";
}

/**
 * Hadron Enhanced Log Viewer
 *
 * Improvements over Dokploy's default:
 * - JetBrains Mono font
 * - Regex search support
 * - Sticky scroll toggle with indicator
 * - Smoother infinite scroll (no page size selector required)
 * - Enhanced color coding per log level
 * - Compact, Railway-inspired design
 */
export function HadronLogViewer({
	containerId,
	serverId,
	runType,
}: HadronLogViewerProps) {
	const { data: containerConfig } = api.docker.getConfig.useQuery(
		{ containerId, serverId: serverId ?? undefined },
		{ enabled: !!containerId },
	);

	const [rawLogs, setRawLogs] = useState("");
	const [filteredLogs, setFilteredLogs] = useState<LogLine[]>([]);
	const [stickyScroll, setStickyScroll] = useState(true);
	const [lines, setLines] = useState<number>(500);
	const [searchInput, setSearchInput] = useState("");
	const [isRegex, setIsRegex] = useState(false);
	const [showTimestamp, setShowTimestamp] = useState(true);
	const [since, setSince] = useState<TimeFilter>("all");
	const [typeFilter, setTypeFilter] = useState<string[]>([]);
	const [isPaused, setIsPaused] = useState(false);
	const [messageBuffer, setMessageBuffer] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [copied, setCopied] = useState(false);
	const [regexError, setRegexError] = useState<string | null>(null);

	const isPausedRef = useRef(false);
	const scrollRef = useRef<HTMLDivElement>(null);
	const isAtBottomRef = useRef(true);

	// Validate regex input
	useEffect(() => {
		if (!isRegex || !searchInput) {
			setRegexError(null);
			return;
		}
		try {
			new RegExp(searchInput, "i");
			setRegexError(null);
		} catch (e) {
			setRegexError((e as Error).message);
		}
	}, [searchInput, isRegex]);

	// Scroll logic
	const scrollToBottom = useCallback(() => {
		if (stickyScroll && scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [stickyScroll]);

	const handleScroll = useCallback(() => {
		if (!scrollRef.current) return;
		const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
		const atBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 20;
		isAtBottomRef.current = atBottom;
		if (atBottom && !stickyScroll) setStickyScroll(true);
		if (!atBottom && stickyScroll) setStickyScroll(false);
	}, [stickyScroll]);

	// WebSocket connection
	useEffect(() => {
		if (!containerId) return;

		let active = true;
		let noDataTimeout: NodeJS.Timeout;
		setIsLoading(true);
		setRawLogs("");
		setFilteredLogs([]);
		setMessageBuffer([]);
		setIsPaused(false);
		isPausedRef.current = false;

		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const params = new globalThis.URLSearchParams({
			containerId,
			tail: lines.toString(),
			since,
			search: "",
			runType,
		});
		if (serverId) params.append("serverId", serverId);

		const wsUrl = `${protocol}//${window.location.host}/docker-container-logs?${params.toString()}`;
		const ws = new WebSocket(wsUrl);

		ws.onopen = () => {
			if (!active) { ws.close(); return; }
			noDataTimeout = setTimeout(() => { if (active) setIsLoading(false); }, 2000);
		};

		ws.onmessage = (e) => {
			if (!active) return;
			if (isPausedRef.current) {
				setMessageBuffer((prev) => [...prev, e.data]);
			} else {
				setRawLogs((prev) => {
					const updated = prev + e.data;
					const splitLines = updated.split("\n");
					if (splitLines.length > lines) {
						return splitLines.slice(-lines).join("\n");
					}
					return updated;
				});
			}
			setIsLoading(false);
			if (noDataTimeout) clearTimeout(noDataTimeout);
		};

		ws.onerror = () => { if (active) setIsLoading(false); if (noDataTimeout) clearTimeout(noDataTimeout); };
		ws.onclose = () => { if (active) setIsLoading(false); if (noDataTimeout) clearTimeout(noDataTimeout); };

		return () => {
			active = false;
			if (noDataTimeout) clearTimeout(noDataTimeout);
			if (ws.readyState === WebSocket.OPEN) ws.close();
		};
	}, [containerId, serverId, lines, since, runType]);

	// Pause/Resume
	const handlePauseResume = () => {
		if (isPaused && messageBuffer.length > 0) {
			const bufferedContent = messageBuffer.join("");
			setRawLogs((prev) => {
				const updated = prev + bufferedContent;
				const splitLines = updated.split("\n");
				return splitLines.length > lines
					? splitLines.slice(-lines).join("\n")
					: updated;
			});
			setMessageBuffer([]);
		}
		const next = !isPaused;
		setIsPaused(next);
		isPausedRef.current = next;
	};

	// Filter and search
	const searchFilteredLogs = useMemo(() => {
		const logs = parseLogs(rawLogs);

		// Type filter
		let result = logs;
		if (typeFilter.length > 0) {
			result = result.filter((log) => typeFilter.includes(getLogType(log.message).type));
		}

		// Search filter (regex or plain text)
		if (searchInput && !regexError) {
			if (isRegex) {
				try {
					const re = new RegExp(searchInput, "i");
					result = result.filter((log) => re.test(log.message));
				} catch {
					// fallback to plain text
					const lower = searchInput.toLowerCase();
					result = result.filter((log) => log.message.toLowerCase().includes(lower));
				}
			} else {
				const lower = searchInput.toLowerCase();
				result = result.filter((log) => log.message.toLowerCase().includes(lower));
			}
		}

		return result;
	}, [rawLogs, typeFilter, searchInput, isRegex, regexError]);

	useEffect(() => {
		setFilteredLogs(searchFilteredLogs);
	}, [searchFilteredLogs]);

	useEffect(() => {
		scrollToBottom();
	}, [filteredLogs, scrollToBottom]);

	// Download
	const handleDownload = () => {
		const logContent = filteredLogs
			.map((l) => `${l.timestamp?.toISOString() || ""} ${l.message}`)
			.join("\n");
		const blob = new Blob([logContent], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		const name = containerConfig?.Name?.replace("/", "") || "hadron";
		a.href = url;
		a.download = `${name}-${new Date().toISOString().slice(0, 19).replace(/[:-]/g, "")}.log`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	// Copy
	const handleCopy = () => {
		const content = filteredLogs
			.map((l) => (showTimestamp ? `${l.timestamp?.toISOString() || ""} ${l.message}` : l.message))
			.join("\n");
		if (copy(content)) {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	return (
		<div className="flex flex-col gap-3">
			{/* Toolbar */}
			<div className="flex flex-wrap items-center gap-2">
				<LineCountFilter
					value={lines}
					onValueChange={(v) => {
						setRawLogs(""); setFilteredLogs("" as any); setMessageBuffer([]);
						setLines(v);
					}}
				/>
				<SinceLogsFilter
					value={since}
					onValueChange={(v) => {
						setRawLogs(""); setFilteredLogs([]); setMessageBuffer([]);
						setSince(v);
					}}
					showTimestamp={showTimestamp}
					onTimestampChange={setShowTimestamp}
				/>
				<StatusLogsFilter
					value={typeFilter}
					setValue={setTypeFilter}
					title="Level"
					options={priorities}
				/>

				{/* Regex-capable search */}
				<div className="relative flex items-center gap-1">
					<div className="relative">
						<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
						<Input
							type="text"
							placeholder={isRegex ? "Regex pattern..." : "Search logs..."}
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							className={cn(
								"h-9 text-sm pl-8 pr-8 w-56 font-mono",
								regexError && "border-destructive focus-visible:ring-destructive",
							)}
						/>
						{searchInput && (
							<button
								type="button"
								onClick={() => setSearchInput("")}
								className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
							>
								<X className="size-3.5" />
							</button>
						)}
					</div>
					<TooltipProvider delayDuration={0}>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant={isRegex ? "default" : "outline"}
									size="sm"
									className="h-9 px-2 font-mono text-xs"
									onClick={() => setIsRegex(!isRegex)}
								>
									.*
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								{isRegex ? "Regex mode (click to switch to plain text)" : "Plain text (click to switch to regex)"}
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>

				<div className="flex-1" />

				{/* Actions */}
				<Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handlePauseResume}>
					{isPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
					{isPaused ? "Resume" : "Pause"}
				</Button>
				<Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handleCopy} disabled={filteredLogs.length === 0}>
					{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
					Copy
				</Button>
				<Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handleDownload} disabled={filteredLogs.length === 0}>
					<DownloadIcon className="size-3.5" />
					Download
				</Button>
			</div>

			{/* Regex error */}
			{regexError && (
				<div className="text-xs text-destructive font-mono px-1">
					Invalid regex: {regexError}
				</div>
			)}

			{/* Pause indicator */}
			{isPaused && (
				<AlertBlock type="warning">
					<div className="flex items-center gap-2 text-sm">
						<Pause className="size-3.5" />
						Logs paused
						{messageBuffer.length > 0 && (
							<Badge variant="orange" className="text-xs">
								{messageBuffer.length} buffered
							</Badge>
						)}
					</div>
				</AlertBlock>
			)}

			{/* Log viewport */}
			<div className="relative">
				<div
					ref={scrollRef}
					onScroll={handleScroll}
					className={cn(
						"h-[720px] overflow-y-auto border rounded-lg",
						"bg-[#fafafa] dark:bg-[hsl(225,20%,6%)]",
						"custom-logs-scrollbar",
						"font-mono text-[13px] leading-5",
					)}
				>
					{filteredLogs.length > 0 ? (
						<div className="p-3">
							{filteredLogs.map((log, idx) => (
								<HadronLogLine
									key={idx}
									log={log}
									showTimestamp={showTimestamp}
									searchTerm={searchInput}
									isRegex={isRegex}
								/>
							))}
						</div>
					) : isLoading ? (
						<div className="flex items-center justify-center h-full text-muted-foreground gap-2">
							<Loader2 className="size-4 animate-spin" />
							<span className="text-sm">Connecting...</span>
						</div>
					) : (
						<div className="flex items-center justify-center h-full text-muted-foreground">
							<span className="text-sm">No logs found</span>
						</div>
					)}
				</div>

				{/* Sticky scroll indicator */}
				{!stickyScroll && filteredLogs.length > 0 && (
					<button
						type="button"
						onClick={() => {
							setStickyScroll(true);
							if (scrollRef.current) {
								scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
							}
						}}
						className={cn(
							"absolute bottom-4 right-4 rounded-full p-2",
							"bg-primary text-primary-foreground shadow-lg",
							"hover:bg-primary/90 transition-colors",
						)}
					>
						<ArrowDown className="size-4" />
					</button>
				)}
			</div>

			{/* Status bar */}
			<div className="flex items-center justify-between text-xs text-muted-foreground px-1">
				<span>{filteredLogs.length} lines</span>
				<span className="flex items-center gap-1.5">
					<span className={cn("size-1.5 rounded-full", isPaused ? "bg-yellow-500" : "bg-emerald-500")} />
					{isPaused ? "Paused" : "Live"}
				</span>
			</div>
		</div>
	);
}

/** Single log line - compact, Railway-inspired design */
function HadronLogLine({
	log,
	showTimestamp,
	searchTerm,
	isRegex,
}: {
	log: LogLine;
	showTimestamp: boolean;
	searchTerm: string;
	isRegex: boolean;
}) {
	const { type, color } = getLogType(log.message);

	const levelColors: Record<string, string> = {
		error: "text-red-400",
		warning: "text-amber-400",
		success: "text-emerald-400",
		debug: "text-violet-400",
		info: "text-muted-foreground",
	};

	const bgColors: Record<string, string> = {
		error: "bg-red-500/5 hover:bg-red-500/10",
		warning: "bg-amber-500/5 hover:bg-amber-500/10",
	};

	const formattedTime = log.timestamp
		? log.timestamp.toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
			})
		: "";

	const highlightMessage = (text: string) => {
		const html = fancyAnsi.toHtml(text);
		if (!searchTerm) return html;

		try {
			const pattern = isRegex ? searchTerm : _.escapeRegExp(searchTerm);
			const re = new RegExp(`(${pattern})`, "gi");
			return html.replace(
				re,
				(match) => `<mark class="bg-primary/30 text-primary-foreground rounded px-0.5">${match}</mark>`,
			);
		} catch {
			return html;
		}
	};

	return (
		<div
			className={cn(
				"flex items-start gap-2 py-[1px] px-2 rounded-sm group",
				bgColors[type] || "hover:bg-muted/50",
			)}
		>
			{/* Level indicator */}
			<div className={cn("w-1 h-3.5 mt-[3px] rounded-full shrink-0", color)} />

			{/* Timestamp */}
			{showTimestamp && formattedTime && (
				<span className="text-muted-foreground/60 shrink-0 select-none tabular-nums w-[70px]">
					{formattedTime}
				</span>
			)}

			{/* Level badge */}
			<span className={cn("w-[42px] shrink-0 text-[11px] font-medium uppercase", levelColors[type])}>
				{type === "warning" ? "warn" : type === "success" ? "ok" : type === "error" ? "err" : type === "debug" ? "dbg" : "inf"}
			</span>

			{/* Message */}
			<span
				className="text-foreground/90 whitespace-pre-wrap break-all"
				dangerouslySetInnerHTML={{ __html: highlightMessage(log.message) }}
			/>
		</div>
	);
}
