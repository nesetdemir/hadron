import Link from "next/link";
import type React from "react";
import { useWhitelabelingPublic } from "@/utils/hooks/use-whitelabeling";
import { Logo } from "../shared/logo";

interface Props {
	children: React.ReactNode;
	/** Overrides the default quote in the left panel (desktop only). */
	leftPanel?: React.ReactNode;
}
export const OnboardingLayout = ({ children, leftPanel }: Props) => {
	const { config: whitelabeling } = useWhitelabelingPublic();
	const appName = whitelabeling?.appName || "Hadron";
	const appDescription =
		whitelabeling?.appDescription ||
		"\u201CEvery great app is made of smaller parts. Hadron holds them together.\u201D";
	const logoUrl =
		whitelabeling?.loginLogoUrl || whitelabeling?.logoUrl || undefined;

	return (
		<div className="container relative min-h-svh flex-col items-center justify-center flex lg:max-w-none lg:grid lg:grid-cols-2 lg:px-0 w-full">
			<div className="relative hidden h-full flex-col  p-10 text-primary dark:border-r lg:flex">
				<div className="absolute inset-0 bg-muted" />
				<Link
					href="https://kuark.tr"
					className="relative z-20 flex items-center text-lg font-medium gap-4  text-primary"
				>
					<Logo className="size-10" logoUrl={logoUrl} />
					{appName}
				</Link>
				<div className="relative z-20 mt-auto">
					{leftPanel ?? (
						<blockquote className="space-y-2">
							<p className="text-lg text-primary">{appDescription}</p>
						</blockquote>
					)}
				</div>
			</div>
			<div className="flex min-h-svh w-full flex-col">
				<div className="flex w-full flex-1 flex-col justify-center space-y-6 max-w-lg mx-auto py-8">
					{children}
				</div>
			</div>
		</div>
	);
};
