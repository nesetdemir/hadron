import { cn } from "@/lib/utils";

interface Props {
	className?: string;
}

/**
 * Hadron Logo - Atomic/particle inspired mark
 * Uses CSS variables for theme-aware coloring
 */
export const HadronLogo = ({ className = "size-8" }: Props) => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 48 48"
			className={cn(className)}
			fill="none"
		>
			{/* Outer orbit ring */}
			<ellipse
				cx="24"
				cy="24"
				rx="20"
				ry="10"
				className="stroke-primary"
				strokeWidth="2"
				transform="rotate(-30 24 24)"
				opacity="0.6"
			/>
			<ellipse
				cx="24"
				cy="24"
				rx="20"
				ry="10"
				className="stroke-primary"
				strokeWidth="2"
				transform="rotate(30 24 24)"
				opacity="0.6"
			/>
			<ellipse
				cx="24"
				cy="24"
				rx="20"
				ry="10"
				className="stroke-primary"
				strokeWidth="2"
				transform="rotate(90 24 24)"
				opacity="0.6"
			/>
			{/* Core nucleus */}
			<circle
				cx="24"
				cy="24"
				r="5"
				className="fill-primary"
			/>
			{/* Electron dots */}
			<circle cx="24" cy="4" r="2.5" className="fill-primary" opacity="0.8" />
			<circle cx="41" cy="33" r="2.5" className="fill-primary" opacity="0.8" />
			<circle cx="7" cy="33" r="2.5" className="fill-primary" opacity="0.8" />
		</svg>
	);
};

export const HadronWordmark = ({ className }: { className?: string }) => {
	return (
		<span
			className={cn(
				"font-semibold tracking-tight text-foreground",
				className,
			)}
		>
			Hadron
		</span>
	);
};
