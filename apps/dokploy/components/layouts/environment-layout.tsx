import { api } from "@/utils/api";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ImpersonationBar } from "../dashboard/impersonation/impersonation-bar";

interface Props {
	children: React.ReactNode;
}

/**
 * Full-width layout without sidebar for the environment/canvas page.
 * Matches Railway's immersive project detail experience.
 */
export const EnvironmentLayout = ({ children }: Props) => {
	const { data: haveRootAccess } = api.user.haveRootAccess.useQuery();

	return (
		<TooltipProvider delayDuration={0}>
			<div className="flex flex-col h-screen bg-background">
				{children}
				{haveRootAccess === true && <ImpersonationBar />}
			</div>
		</TooltipProvider>
	);
};
