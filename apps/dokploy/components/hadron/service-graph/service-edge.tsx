"use client";

import {
	BaseEdge,
	type EdgeProps,
	getBezierPath,
} from "@xyflow/react";

export type ServiceEdgeData = {
	/** The env variable name that creates this connection, e.g. DATABASE_URL */
	envVar?: string;
	/** The reference syntax, e.g. ${{Postgres.DATABASE_URL}} */
	reference?: string;
};

export function ServiceEdge({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
	sourcePosition,
	targetPosition,
	style = {},
	markerEnd,
	data,
}: EdgeProps) {
	const [edgePath, labelX, labelY] = getBezierPath({
		sourceX,
		sourceY,
		sourcePosition,
		targetX,
		targetY,
		targetPosition,
	});

	const edgeData = data as ServiceEdgeData | undefined;

	return (
		<>
			<BaseEdge
				path={edgePath}
				markerEnd={markerEnd}
				style={{
					stroke: "hsl(var(--muted-foreground) / 0.45)",
					strokeWidth: 2,
					strokeDasharray: "6 4",
					...style,
				}}
			/>
			{edgeData?.envVar && (
				<foreignObject
					width={130}
					height={26}
					x={labelX - 65}
					y={labelY - 13}
					className="pointer-events-none"
				>
					<div className="flex items-center justify-center h-full">
						<span className="text-[11px] bg-card border rounded-md px-2 py-0.5 text-muted-foreground font-mono truncate max-w-[120px] shadow-xs">
							{edgeData.envVar}
						</span>
					</div>
				</foreignObject>
			)}
		</>
	);
}
