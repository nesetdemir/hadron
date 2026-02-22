"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
	AlertTriangle,
	FolderPlus,
	Globe,
	Settings,
	Share2,
	SquareTerminal,
	Trash2,
	X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertBlock } from "@/components/shared/alert-block";
import { CodeEditor } from "@/components/shared/code-editor";
import { cn } from "@/lib/utils";
import { api } from "@/utils/api";

const updateProjectSchema = z.object({
	name: z.string().min(1, "Name is required"),
	description: z.string().optional(),
});

const updateEnvSchema = z.object({
	env: z.string().optional(),
});

type Section = "general" | "environments" | "variables" | "danger";

const sections: { key: Section; label: string; icon: React.FC<{ className?: string }> }[] = [
	{ key: "general", label: "General", icon: Settings },
	{ key: "environments", label: "Environments", icon: FolderPlus },
	{ key: "variables", label: "Shared Variables", icon: SquareTerminal },
	{ key: "danger", label: "Danger", icon: AlertTriangle },
];

interface ProjectSettingsOverlayProps {
	projectId: string;
	open: boolean;
	onClose: () => void;
}

export function ProjectSettingsOverlay({
	projectId,
	open,
	onClose,
}: ProjectSettingsOverlayProps) {
	const [activeSection, setActiveSection] = useState<Section>("general");
	const utils = api.useUtils();

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
			{/* Header */}
			<div className="flex items-center justify-between border-b px-6 h-14">
				<h1 className="text-lg font-semibold">Project Settings</h1>
				<Button
					variant="ghost"
					size="icon"
					onClick={onClose}
					className="size-8"
				>
					<X className="size-4" />
				</Button>
			</div>

			{/* Content: sidebar + main */}
			<div className="flex h-[calc(100vh-3.5rem)]">
				{/* Left sidebar navigation */}
				<nav className="w-56 border-r p-4 space-y-1">
					{sections.map((section) => (
						<button
							key={section.key}
							type="button"
							onClick={() => setActiveSection(section.key)}
							className={cn(
								"flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors",
								activeSection === section.key
									? "bg-primary/10 text-primary font-medium"
									: "text-muted-foreground hover:text-foreground hover:bg-muted/50",
							)}
						>
							<section.icon className="size-4" />
							{section.label}
						</button>
					))}
				</nav>

				{/* Main content */}
				<div className="flex-1 overflow-auto p-8 max-w-3xl">
					{activeSection === "general" && (
						<GeneralSection projectId={projectId} />
					)}
					{activeSection === "environments" && (
						<EnvironmentsSection projectId={projectId} />
					)}
					{activeSection === "variables" && (
						<SharedVariablesSection projectId={projectId} />
					)}
					{activeSection === "danger" && (
						<DangerSection projectId={projectId} onClose={onClose} />
					)}
				</div>
			</div>
		</div>
	);
}

function GeneralSection({ projectId }: { projectId: string }) {
	const utils = api.useUtils();
	const { data } = api.project.one.useQuery({ projectId });
	const { mutateAsync, isLoading } = api.project.update.useMutation();

	const form = useForm<z.infer<typeof updateProjectSchema>>({
		defaultValues: {
			name: data?.name ?? "",
			description: data?.description ?? "",
		},
		resolver: zodResolver(updateProjectSchema),
	});

	useEffect(() => {
		if (data) {
			form.reset({
				name: data.name,
				description: data.description ?? "",
			});
		}
	}, [data, form]);

	const onSubmit = async (values: z.infer<typeof updateProjectSchema>) => {
		try {
			await mutateAsync({
				projectId,
				name: values.name,
				description: values.description || "",
			});
			toast.success("Project updated");
			utils.project.one.invalidate({ projectId });
			utils.project.all.invalidate();
		} catch {
			toast.error("Failed to update project");
		}
	};

	return (
		<div className="space-y-8">
			<div>
				<h2 className="text-xl font-semibold">Project Info</h2>
			</div>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Name</FormLabel>
								<FormControl>
									<Input {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="description"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Description</FormLabel>
								<FormControl>
									<Textarea
										placeholder="Optional description of your project"
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<div>
						<label className="text-sm font-medium">Project ID</label>
						<div className="mt-1.5 flex items-center gap-2">
							<Input
								readOnly
								value={projectId}
								className="font-mono text-sm bg-muted"
							/>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => {
									navigator.clipboard.writeText(projectId);
									toast.success("Copied to clipboard");
								}}
							>
								Copy
							</Button>
						</div>
					</div>
					<Button type="submit" isLoading={isLoading}>
						Update
					</Button>
				</form>
			</Form>
		</div>
	);
}

function EnvironmentsSection({ projectId }: { projectId: string }) {
	const { data: environments } = api.environment.byProjectId.useQuery({ projectId });

	return (
		<div className="space-y-8">
			<div>
				<h2 className="text-xl font-semibold">Environments</h2>
				<p className="text-sm text-muted-foreground mt-1">
					Manage the environments for this project.
				</p>
			</div>

			<div className="space-y-2">
				{environments?.map((env) => (
					<div
						key={env.environmentId}
						className="flex items-center justify-between p-3 rounded-lg border bg-card"
					>
						<div className="flex items-center gap-3">
							<Globe className="size-4 text-muted-foreground" />
							<span className="text-sm font-medium">{env.name}</span>
							{env.isDefault && (
								<span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
									Default
								</span>
							)}
						</div>
						<span className="text-xs text-muted-foreground font-mono">
							{env.environmentId.slice(0, 8)}...
						</span>
					</div>
				))}
				{(!environments || environments.length === 0) && (
					<p className="text-sm text-muted-foreground">No environments found.</p>
				)}
			</div>
		</div>
	);
}

function SharedVariablesSection({ projectId }: { projectId: string }) {
	const utils = api.useUtils();
	const { data } = api.project.one.useQuery({ projectId });
	const { mutateAsync, isLoading, isError, error } =
		api.project.update.useMutation();

	const form = useForm<z.infer<typeof updateEnvSchema>>({
		defaultValues: { env: data?.env ?? "" },
		resolver: zodResolver(updateEnvSchema),
	});

	useEffect(() => {
		if (data) {
			form.reset({ env: data.env ?? "" });
		}
	}, [data, form]);

	const onSubmit = async (values: z.infer<typeof updateEnvSchema>) => {
		try {
			await mutateAsync({
				projectId,
				env: values.env || "",
			});
			toast.success("Shared variables updated");
			utils.project.one.invalidate({ projectId });
			utils.project.all.invalidate();
		} catch {
			toast.error("Failed to update variables");
		}
	};

	return (
		<div className="space-y-8">
			<div>
				<h2 className="text-xl font-semibold">Shared Variables</h2>
				<p className="text-sm text-muted-foreground mt-1">
					Environment variables accessible to all services in this project.
				</p>
			</div>

			{isError && <AlertBlock type="error">{error?.message}</AlertBlock>}
			<AlertBlock type="info">
				Reference these in service environments:{" "}
				<code className="text-xs">DATABASE_URL=${"{{project.DATABASE_URL}}"}</code>
			</AlertBlock>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<FormField
						control={form.control}
						name="env"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Environment variables</FormLabel>
								<FormControl>
									<CodeEditor
										lineWrapping
										language="properties"
										wrapperClassName="h-[28rem] font-mono"
										placeholder={`NODE_ENV=production\nPORT=3000`}
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<Button type="submit" isLoading={isLoading}>
						Update
					</Button>
				</form>
			</Form>
		</div>
	);
}

function DangerSection({
	projectId,
	onClose,
}: {
	projectId: string;
	onClose: () => void;
}) {
	const utils = api.useUtils();
	const { mutateAsync, isLoading } = api.project.remove.useMutation();

	const handleDelete = async () => {
		try {
			await mutateAsync({ projectId });
			toast.success("Project deleted");
			utils.project.all.invalidate();
			onClose();
			window.location.href = "/dashboard/projects";
		} catch {
			toast.error("Failed to delete project");
		}
	};

	return (
		<div className="space-y-8">
			<div>
				<h2 className="text-xl font-semibold text-destructive">Danger Zone</h2>
				<p className="text-sm text-muted-foreground mt-1">
					Irreversible actions for this project.
				</p>
			</div>

			<div className="border border-destructive/30 rounded-lg p-6 space-y-4">
				<div>
					<h3 className="font-medium">Delete this project</h3>
					<p className="text-sm text-muted-foreground mt-1">
						Once you delete a project, there is no going back. All services and
						data within this project will be permanently removed.
					</p>
				</div>
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button variant="destructive" size="sm">
							<Trash2 className="size-4 mr-1.5" />
							Delete Project
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
							<AlertDialogDescription>
								This action cannot be undone. This will permanently delete the
								project and all of its services, environments, and data.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={handleDelete}
								className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							>
								Delete Project
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</div>
	);
}
