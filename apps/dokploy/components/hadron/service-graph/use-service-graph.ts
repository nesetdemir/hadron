import { useMemo } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { Services } from "@/pages/dashboard/project/[projectId]/environment/[environmentId]";
import type { ServiceNodeData } from "./service-node";
import type { ServiceEdgeData } from "./service-edge";

/**
 * Regex pattern to match cross-service env variable references.
 * Matches: ${{ServiceName.VARIABLE_NAME}}
 */
const ENV_REF_PATTERN = /\$\{\{([^.}]+)\.([^}]+)\}\}/g;

/**
 * Parses environment variables for cross-service references and
 * converts services into React Flow nodes and edges.
 */
export function useServiceGraph(
	services: Services[],
	envVars?: Record<string, Record<string, string>>,
	savedPositions?: Record<string, { x: number; y: number }>,
) {
	return useMemo(() => {
		const nodes: Node<ServiceNodeData>[] = [];
		const edges: Edge<ServiceEdgeData>[] = [];

		// Layout: arrange nodes in a grid
		const cols = Math.max(3, Math.ceil(Math.sqrt(services.length)));
		const nodeWidth = 280;
		const nodeHeight = 120;
		const gapX = 100;
		const gapY = 100;

		// Create a name->service map for reference resolution
		const serviceByName = new Map<string, Services>();
		for (const svc of services) {
			serviceByName.set(svc.name.toLowerCase(), svc);
			serviceByName.set(svc.appName.toLowerCase(), svc);
		}

		// Create nodes
		services.forEach((service, index) => {
			const col = index % cols;
			const row = Math.floor(index / cols);
			const savedPos = savedPositions?.[service.id];

			nodes.push({
				id: service.id,
				type: "serviceNode",
				position: savedPos ?? {
					x: col * (nodeWidth + gapX) + 50,
					y: row * (nodeHeight + gapY) + 50,
				},
				data: {
					label: service.name,
					serviceType: service.type,
					status: service.status,
					description: service.description,
					serviceId: service.id,
					serverName: service.serverName,
					buildType: service.buildType,
					appName: service.appName,
				},
			});
		});

		// Parse env vars for cross-service references to create edges
		if (envVars) {
			const edgeSet = new Set<string>();

			for (const [serviceId, vars] of Object.entries(envVars)) {
				for (const [varName, varValue] of Object.entries(vars)) {
					let match: RegExpExecArray | null;
					// biome-ignore lint: this is a standard regex exec loop
					while ((match = ENV_REF_PATTERN.exec(varValue)) !== null) {
						const refServiceName = match[1];
						const refVarName = match[2];
						if (!refServiceName || !refVarName) continue;
						const refService = serviceByName.get(
							refServiceName.toLowerCase(),
						);

						if (refService) {
							const edgeId = `${refService.id}->${serviceId}`;
							if (!edgeSet.has(edgeId)) {
								edgeSet.add(edgeId);
								edges.push({
									id: edgeId,
									source: refService.id,
									target: serviceId,
									type: "serviceEdge",
									data: {
										envVar: varName,
										reference: `$\{{${refServiceName}.${refVarName}}}`,
									},
								});
							}
						}
					}
				}
			}
		}

		return { nodes, edges };
	}, [services, envVars, savedPositions]);
}
