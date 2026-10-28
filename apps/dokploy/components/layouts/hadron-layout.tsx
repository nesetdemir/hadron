"use client";

import {
	Activity,
	BarChartHorizontalBigIcon,
	Bell,
	BlocksIcon,
	BotIcon,
	Boxes,
	Check,
	Clock,
	CreditCard,
	Database,
	GalleryVerticalEnd,
	GitBranch,
	KeyRound,
	LogIn,
	type LucideIcon,
	Moon,
	Package,
	PieChart,
	Server,
	Settings,
	ShieldCheck,
	Star,
	Sun,
	Trash2,
	User,
	Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Logo } from "../shared/logo";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { api } from "@/utils/api";
import { authClient } from "@/lib/auth-client";
import { AddOrganization } from "@/components/dashboard/organization/handle-organization";
import { DialogAction } from "@/components/shared/dialog-action";
import { toast } from "sonner";

type NavLink = {
	title: string;
	url: string;
	icon: LucideIcon;
	isEnabled?: (opts: { auth: any; isCloud: boolean }) => boolean;
};

const SETTINGS_LINKS: NavLink[] = [
	{ title: "Profile", url: "/dashboard/settings/profile", icon: User },
	{ title: "Users", url: "/dashboard/settings/users", icon: Users, isEnabled: ({ auth }) => auth?.role === "owner" || auth?.role === "admin" },
	{ title: "Remote Servers", url: "/dashboard/settings/servers", icon: Server, isEnabled: ({ auth }) => auth?.role === "owner" || auth?.role === "admin" },
	{ title: "SSH Keys", url: "/dashboard/settings/ssh-keys", icon: KeyRound, isEnabled: ({ auth }) => auth?.role === "owner" || auth?.canAccessToSSHKeys || auth?.role === "admin" },
	{ title: "Git", url: "/dashboard/settings/git-providers", icon: GitBranch, isEnabled: ({ auth }) => auth?.role === "owner" || auth?.canAccessToGitProviders || auth?.role === "admin" },
	{ title: "Registry", url: "/dashboard/settings/registry", icon: Package, isEnabled: ({ auth }) => auth?.role === "owner" || auth?.role === "admin" },
	{ title: "S3 Destinations", url: "/dashboard/settings/destinations", icon: Database, isEnabled: ({ auth }) => auth?.role === "owner" || auth?.role === "admin" },
	{ title: "Certificates", url: "/dashboard/settings/certificates", icon: ShieldCheck, isEnabled: ({ auth }) => auth?.role === "owner" || auth?.role === "admin" },
	{ title: "Notifications", url: "/dashboard/settings/notifications", icon: Bell, isEnabled: ({ auth }) => auth?.role === "owner" || auth?.role === "admin" },
	{ title: "AI", url: "/dashboard/settings/ai", icon: BotIcon, isEnabled: ({ auth }) => auth?.role === "owner" || auth?.role === "admin" },
	{ title: "Web Server", url: "/dashboard/settings/server", icon: Activity, isEnabled: ({ auth, isCloud }) => (auth?.role === "owner" || auth?.role === "admin") && !isCloud },
	{ title: "Cluster", url: "/dashboard/settings/cluster", icon: Boxes, isEnabled: ({ auth, isCloud }) => (auth?.role === "owner" || auth?.role === "admin") && !isCloud },
	{ title: "Billing", url: "/dashboard/settings/billing", icon: CreditCard, isEnabled: ({ auth, isCloud }) => auth?.role === "owner" && isCloud },
	{ title: "SSO", url: "/dashboard/settings/sso", icon: LogIn, isEnabled: ({ auth }) => auth?.role === "owner" || auth?.role === "admin" },
];

const HOME_LINKS: NavLink[] = [
	{ title: "Monitoring", url: "/dashboard/monitoring", icon: BarChartHorizontalBigIcon, isEnabled: ({ isCloud }) => !isCloud },
	{ title: "Schedules", url: "/dashboard/schedules", icon: Clock, isEnabled: ({ auth, isCloud }) => !isCloud && (auth?.role === "owner" || auth?.role === "admin") },
	{ title: "Traefik", url: "/dashboard/traefik", icon: GalleryVerticalEnd, isEnabled: ({ auth, isCloud }) => (auth?.role === "owner" || auth?.role === "admin" || auth?.canAccessToTraefikFiles) && !isCloud },
	{ title: "Docker", url: "/dashboard/docker", icon: BlocksIcon, isEnabled: ({ auth, isCloud }) => (auth?.role === "owner" || auth?.role === "admin" || auth?.canAccessToDocker) && !isCloud },
	{ title: "Swarm", url: "/dashboard/swarm", icon: PieChart, isEnabled: ({ auth, isCloud }) => (auth?.role === "owner" || auth?.role === "admin" || auth?.canAccessToDocker) && !isCloud },
];

interface Props {
	children: React.ReactNode;
}

export function HadronTopBar() {
	const { data: auth } = api.user.get.useQuery();
	const { data: isCloud } = api.settings.isCloud.useQuery();
	const { data: session } = authClient.useSession();
	const { data: activeOrganization } = authClient.useActiveOrganization();
	const {
		data: organizations,
		refetch: refetchOrgs,
	} = api.organization.all.useQuery();
	const { mutateAsync: deleteOrganization, isPending: isRemoving } =
		api.organization.delete.useMutation();
	const { mutateAsync: setDefaultOrganization, isPending: isSettingDefault } =
		api.organization.setDefault.useMutation();
	const { theme, setTheme } = useTheme();
	const pathname = usePathname();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const opts = { auth, isCloud: isCloud ?? false };

	const filteredSettings = SETTINGS_LINKS.filter(
		(link) => !link.isEnabled || link.isEnabled(opts),
	);
	const filteredHome = HOME_LINKS.filter(
		(link) => !link.isEnabled || link.isEnabled(opts),
	);

	const initials = auth?.user?.email
		? auth.user.email.substring(0, 2).toUpperCase()
		: "?";

	return (
		<header className="flex items-center justify-between border-b px-4 h-12 shrink-0 bg-background">
			{/* Left: Logo + Workspace */}
			<div className="flex items-center gap-3">
				<Link
					href="/dashboard/projects"
					className="flex items-center gap-2"
				>
					<div className="flex items-center justify-center size-7 rounded-md border">
						<Logo
							className="size-5"
							logoUrl={activeOrganization?.logo || undefined}
						/>
					</div>
					<span className="text-sm font-semibold">
						{activeOrganization?.name ?? "Hadron"}
					</span>
				</Link>
			</div>

			{/* Right: Navigation + User */}
			<div className="flex items-center gap-1">
				{/* Home links as top-level nav items (only show non-Projects) */}
				{filteredHome.map((link) => (
					<Link key={link.url} href={link.url}>
						<Button
							variant="ghost"
							size="sm"
							className={cn(
								"h-8 px-2.5 text-xs gap-1.5",
								pathname?.startsWith(link.url)
									? "text-foreground bg-muted"
									: "text-muted-foreground",
							)}
						>
							<link.icon className="size-3.5" />
							{link.title}
						</Button>
					</Link>
				))}

				{/* Settings dropdown */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							className={cn(
								"h-8 px-2.5 text-xs gap-1.5",
								pathname?.startsWith("/dashboard/settings")
									? "text-foreground bg-muted"
									: "text-muted-foreground",
							)}
						>
							<Settings className="size-3.5" />
							Settings
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="end"
						className="w-52 max-h-80 overflow-auto"
					>
						{filteredSettings.map((link) => (
							<DropdownMenuItem key={link.url} asChild>
								<Link
									href={link.url}
									className="flex items-center gap-2"
								>
									<link.icon className="size-4 text-muted-foreground" />
									{link.title}
								</Link>
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>

				{/* Theme toggle */}
				<Button
					variant="ghost"
					size="icon"
					className="size-8"
					onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
				>
					{mounted && theme === "dark" ? (
						<Sun className="size-3.5" />
					) : (
						<Moon className="size-3.5" />
					)}
				</Button>

				{/* User avatar + dropdown */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="size-8 rounded-full"
						>
							<Avatar className="size-7">
								<AvatarImage src={auth?.user?.image || undefined} />
								<AvatarFallback className="text-[10px] bg-primary/10 text-primary">
									{initials}
								</AvatarFallback>
							</Avatar>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-72">
						<DropdownMenuLabel className="font-normal">
							<div className="flex flex-col gap-1">
								<p className="text-sm font-medium">
									{auth?.user?.email}
								</p>
								<p className="text-xs text-muted-foreground capitalize">
									{auth?.role}
								</p>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem asChild>
							<Link href="/dashboard/settings/profile">
								<User className="size-4 mr-2" />
								Account Settings
							</Link>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuLabel className="text-xs text-muted-foreground">
							Organizations
						</DropdownMenuLabel>
						<div className="max-h-40 overflow-y-auto">
							{organizations?.map((org) => {
								const isActive = org.id === activeOrganization?.id;
								const isOwner = org.ownerId === session?.user?.id || auth?.role === "owner";
								const isDefault = org.members?.[0]?.isDefault ?? false;
								return (
									<div
										key={org.id}
										className="flex items-center gap-1 pr-1"
									>
										<DropdownMenuItem
											className="flex-1 gap-2 py-1.5 min-w-0"
											onClick={async () => {
												if (isActive) return;
												await authClient.organization.setActive({
													organizationId: org.id,
												});
												window.location.reload();
											}}
										>
											<div className="flex size-5 items-center justify-center rounded-xs border shrink-0">
												<Logo
													className="size-4"
													logoUrl={org.logo ?? undefined}
												/>
											</div>
											<span className="truncate text-sm">{org.name}</span>
											{isActive && (
												<Check className="size-3.5 ml-auto text-primary shrink-0" />
											)}
										</DropdownMenuItem>
										<Button
											variant="ghost"
											size="icon"
											className={cn(
												"size-6 shrink-0",
												isDefault
													? "text-yellow-500"
													: "text-muted-foreground hover:text-blue-500",
											)}
											disabled={isDefault || isSettingDefault}
											onClick={async (e) => {
												e.stopPropagation();
												if (isDefault) return;
												await setDefaultOrganization({
													organizationId: org.id,
												})
													.then(() => {
														refetchOrgs();
														toast.success("Default organization updated");
													})
													.catch((err) => {
														toast.error(err?.message || "Error setting default");
													});
											}}
											title={isDefault ? "Default" : "Set as default"}
										>
											<Star
												className="size-3"
												fill={isDefault ? "currentColor" : "none"}
											/>
										</Button>
										{isOwner && (
											<>
												<div className="shrink-0 [&>div]:inline-flex [&_[role=menuitem]]:p-1 [&_[role=menuitem]]:h-6 [&_[role=menuitem]]:w-6 [&_[role=menuitem]]:justify-center">
													<AddOrganization organizationId={org.id} />
												</div>
												<DialogAction
													title="Delete Organization"
													description="Are you sure you want to delete this organization?"
													type="destructive"
													onClick={async () => {
														await deleteOrganization({
															organizationId: org.id,
														})
															.then(() => {
																refetchOrgs();
																toast.success("Organization deleted");
															})
															.catch((err) => {
																toast.error(
																	err?.message || "Error deleting organization",
																);
															});
													}}
												>
													<Button
														variant="ghost"
														size="icon"
														className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
														isLoading={isRemoving}
													>
														<Trash2 className="size-3" />
													</Button>
												</DialogAction>
											</>
										)}
									</div>
								);
							})}
						</div>
						{(auth?.role === "owner" ||
							auth?.role === "admin" ||
							isCloud) && (
							<AddOrganization />
						)}
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={async () => {
								await authClient.signOut();
								window.location.href = "/";
							}}
							className="text-destructive"
						>
							Log out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</header>
	);
}

export default function HadronLayout({ children }: Props) {
	return (
		<TooltipProvider delayDuration={0}>
			<div className="flex flex-col h-screen bg-background">
				<HadronTopBar />
				<main className="flex-1 overflow-auto p-6 hadron-canvas">
					{children}
				</main>
			</div>
		</TooltipProvider>
	);
}
