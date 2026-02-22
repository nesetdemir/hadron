import { cn } from "@/lib/utils";

interface Props {
	className?: string;
	logoUrl?: string;
}

export const Logo = ({ className = "size-14", logoUrl }: Props) => {
	if (logoUrl) {
		return (
			<img
				src={logoUrl}
				alt="Organization Logo"
				className={cn(className, "object-contain rounded-sm")}
			/>
		);
	}

	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 48 48"
			className={className}
			fill="none"
		>
			{/* Hadron logo - atomic orbital design */}
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
			<circle cx="24" cy="24" r="5" className="fill-primary" />
			<circle cx="24" cy="4" r="2.5" className="fill-primary" opacity="0.8" />
			<circle cx="41" cy="33" r="2.5" className="fill-primary" opacity="0.8" />
			<circle cx="7" cy="33" r="2.5" className="fill-primary" opacity="0.8" />
		</svg>
	);
};
