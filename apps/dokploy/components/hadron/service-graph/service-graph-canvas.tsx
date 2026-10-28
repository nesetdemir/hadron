"use client";

import {
	ReactFlow,
	Background,
	Controls,
	MiniMap,
	useNodesState,
	useEdgesState,
	type OnConnect,
	BackgroundVariant,
	Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutGrid, Maximize2, List } from "lucide-react";
import type { Services } from "@/pages/dashboard/project/[projectId]/environment/[environmentId]";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ServiceNode } from "./service-node";
import { ServiceEdge } from "./service-edge";
import { useServiceGraph } from "./use-service-graph";

const nodeTypes = {
	serviceNode: ServiceNode,
};

const edgeTypes = {
	serviceEdge: ServiceEdge,
};

interface ServiceGraphCanvasProps {
	services: Services[];
	envVars?: Record<string, Record<string, string>>;
	onNodeClick?: (serviceId: string, serviceType: string) => void;
	className?: string;
	environmentId?: string;
}

const STORAGE_KEY_PREFIX = "hadron-canvas-positions-";

function loadPositions(
	environmentId?: string,
): Record<string, { x: number; y: number }> | undefined {
	if (!environmentId) return undefined;
	try {
		const raw = localStorage.getItem(
			`${STORAGE_KEY_PREFIX}${environmentId}`,
		);
		if (raw) return JSON.parse(raw);
	} catch {
		// ignore corrupted data
	}
	return undefined;
}

function savePositions(
	environmentId: string,
	positions: Record<string, { x: number; y: number }>,
) {
	try {
		localStorage.setItem(
			`${STORAGE_KEY_PREFIX}${environmentId}`,
			JSON.stringify(positions),
		);
	} catch {
		// ignore quota errors
	}
}

export function ServiceGraphCanvas({
	services,
	envVars,
	onNodeClick,
	className,
	environmentId,
}: ServiceGraphCanvasProps) {
	const savedPositionsRef = useRef(loadPositions(environmentId));

	const { nodes: initialNodes, edges: initialEdges } = useServiceGraph(
		services,
		envVars,
		savedPositionsRef.current,
	);

	const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

	// Sync when services change — preserve positions for existing nodes
	useEffect(() => {
		setNodes((currentNodes) => {
			const currentPositions = new Map(
				currentNodes.map((n) => [n.id, n.position]),
			);
			return initialNodes.map((node) => {
				const existing = currentPositions.get(node.id);
				if (existing) {
					return { ...node, position: existing };
				}
				return node;
			});
		});
		setEdges(initialEdges);
	}, [initialNodes, initialEdges, setNodes, setEdges]);

	// Save position to localStorage when a node drag ends
	const handleNodesChange = useCallback(
		(changes: any[]) => {
			onNodesChange(changes);

			if (!environmentId) return;

			const hasDragEnd = changes.some(
				(c: any) => c.type === "position" && c.dragging === false,
			);
			if (!hasDragEnd) return;

			// Defer the save so state is updated first
			requestAnimationFrame(() => {
				setNodes((current) => {
					const positions: Record<string, { x: number; y: number }> =
						{};
					for (const node of current) {
						positions[node.id] = node.position;
					}
					savedPositionsRef.current = positions;
					savePositions(environmentId, positions);
					return current;
				});
			});
		},
		[onNodesChange, environmentId, setNodes],
	);

	const onConnect: OnConnect = useCallback(() => {
		// Connection creation is read-only for now
		// Future: allow manual edge creation for env refs
	}, []);

	const handleNodeClick = useCallback(
		(_event: React.MouseEvent, node: any) => {
			if (onNodeClick && node.data) {
				onNodeClick(node.data.serviceId, node.data.serviceType);
			}
		},
		[onNodeClick],
	);

	const defaultEdgeOptions = useMemo(
		() => ({
			animated: false,
			type: "serviceEdge",
		}),
		[],
	);

	if (services.length === 0) {
		return (
			<div className="flex h-full w-full flex-col items-center justify-center gap-3 text-muted-foreground">
				<LayoutGrid className="size-12 opacity-30" />
				<span className="text-sm font-medium">No services yet</span>
				<span className="text-xs">
					Create a service to see it on the canvas
				</span>
			</div>
		);
	}

	return (
		<div className={cn("h-full w-full hadron-canvas", className)}>
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={handleNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				onNodeClick={handleNodeClick}
				nodeTypes={nodeTypes}
				edgeTypes={edgeTypes}
				defaultEdgeOptions={defaultEdgeOptions}
				fitView
				fitViewOptions={{ padding: 0.3, maxZoom: 1.2 }}
				minZoom={0.3}
				maxZoom={2}
				proOptions={{ hideAttribution: true }}
			>
				<Background
					variant={BackgroundVariant.Dots}
					gap={24}
					size={0.8}
					className="!bg-transparent"
					color="hsl(var(--muted-foreground) / 0.15)"
				/>
				<Controls
					className="!bg-card !border-border !rounded-lg !shadow-xs [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-secondary"
					showInteractive={false}
				/>
				<MiniMap
					className="!bg-card !border-border !rounded-lg"
					nodeColor="hsl(var(--primary) / 0.8)"
					maskColor="hsl(var(--background) / 0.7)"
				/>
			</ReactFlow>
		</div>
	);
}
