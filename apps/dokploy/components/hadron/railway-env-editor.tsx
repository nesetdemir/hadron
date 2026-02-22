import {
	type CSSProperties,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	Braces,
	Check,
	ChevronDown,
	Copy,
	Eye,
	EyeOff,
	KeyRound,
	Link2,
	MoreHorizontal,
	Plus,
	ShieldCheck,
	Trash2,
	X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CodeEditor } from "@/components/shared/code-editor";
import type { ServiceEnvInfo } from "@/components/hadron/env-autocomplete";
import { toast } from "sonner";

// --- Types ---

interface EnvVariable {
	key: string;
	value: string;
	isSecret: boolean;
	isReference: boolean;
	referencedService?: string;
	referencedVar?: string;
}

export interface RailwayEnvEditorProps {
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
	services?: ServiceEnvInfo[];
	additionalExtensions?: any[];
	placeholder?: string;
	style?: CSSProperties;
}

// --- Helpers ---

const SECRET_PATTERN =
	/PASSWORD|SECRET|TOKEN|KEY|API_KEY|PRIVATE|CREDENTIAL|AUTH/i;
const REF_PATTERN = /^\$\{\{([^.}]+)\.([^}]+)\}\}$/;

function parseVariables(raw: string): EnvVariable[] {
	if (!raw.trim()) return [];
	return raw
		.split("\n")
		.filter((line) => {
			const trimmed = line.trim();
			return trimmed && !trimmed.startsWith("#");
		})
		.map((line) => {
			const eqIdx = line.indexOf("=");
			let key: string;
			let value: string;
			if (eqIdx >= 0) {
				key = line.slice(0, eqIdx).trim();
				value = line.slice(eqIdx + 1);
			} else {
				key = line.trim();
				value = "";
			}
			const isSecret = SECRET_PATTERN.test(key);
			const refMatch = value.match(REF_PATTERN);
			return {
				key,
				value,
				isSecret,
				isReference: !!refMatch,
				referencedService: refMatch?.[1],
				referencedVar: refMatch?.[2],
			};
		});
}

function serializeVariables(vars: EnvVariable[]): string {
	return vars.map((v) => `${v.key}=${v.value}`).join("\n");
}

// --- Sub-components ---

function ReferenceChip({
	service,
	variable,
}: { service: string; variable: string }) {
	return (
		<Badge
			variant="outline"
			className="gap-1 font-mono text-xs px-1.5 py-0 h-5 bg-primary/5 border-primary/20 text-primary shrink-0"
		>
			<Link2 className="size-3" />
			{service}.{variable}
		</Badge>
	);
}

function ServiceSuggestionDropdown({
	services,
	inputValue,
	onSelect,
	visible,
}: {
	services: ServiceEnvInfo[];
	inputValue: string;
	onSelect: (ref: string) => void;
	visible: boolean;
}) {
	if (!visible || !inputValue.includes("${{")) return null;

	const inner = inputValue.slice(inputValue.lastIndexOf("${{") + 3);
	const dotIdx = inner.indexOf(".");

	if (dotIdx >= 0) {
		const prefix = inner.slice(0, dotIdx);
		const svc = services.find(
			(s) =>
				s.name.toLowerCase() === prefix.toLowerCase() ||
				s.appName.toLowerCase() === prefix.toLowerCase(),
		);
		if (!svc || svc.vars.length === 0) return null;
		const partialVar = inner.slice(dotIdx + 1).replace(/\}*$/, "");
		const filtered = svc.vars.filter((v) =>
			v.toLowerCase().startsWith(partialVar.toLowerCase()),
		);
		if (filtered.length === 0) return null;
		return (
			<div className="absolute top-full left-0 z-50 mt-1 w-64 rounded-md border bg-popover shadow-md max-h-40 overflow-y-auto">
				{filtered.map((v) => (
					<button
						key={v}
						type="button"
						className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-accent"
						onMouseDown={(e) => {
							e.preventDefault();
							onSelect(`$\{{${svc.name}.${v}}}`);
						}}
					>
						<KeyRound className="size-3 text-muted-foreground" />
						<span className="font-mono">{v}</span>
						<span className="ml-auto text-muted-foreground">
							{svc.name}
						</span>
					</button>
				))}
			</div>
		);
	}

	const partial = inner.replace(/\}*$/, "");
	const filtered = services.filter(
		(s) =>
			s.name.toLowerCase().startsWith(partial.toLowerCase()) ||
			s.appName.toLowerCase().startsWith(partial.toLowerCase()),
	);
	if (filtered.length === 0) return null;

	return (
		<div className="absolute top-full left-0 z-50 mt-1 w-64 rounded-md border bg-popover shadow-md max-h-40 overflow-y-auto">
			{filtered.map((s) => (
				<button
					key={s.appName}
					type="button"
					className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-accent"
					onMouseDown={(e) => {
						e.preventDefault();
						const base = inputValue.slice(
							0,
							inputValue.lastIndexOf("${{"),
						);
						onSelect(`${base}$\{{${s.name}.`);
					}}
				>
					<span className="font-mono font-medium">{s.name}</span>
					<span className="ml-auto text-muted-foreground text-[10px]">
						{s.vars.length} vars
					</span>
				</button>
			))}
		</div>
	);
}

function AddReferencePopover({
	services,
	onSelect,
	open,
	onOpenChange,
}: {
	services: ServiceEnvInfo[];
	onSelect: (ref: string) => void;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	if (services.length === 0) return null;

	return (
		<Popover open={open} onOpenChange={onOpenChange}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="h-7 gap-1 text-xs shrink-0 px-2"
					type="button"
				>
					<Braces className="size-3" />
					Add Reference
					<ChevronDown className="size-3 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-64 p-0" align="start">
				<Command>
					<CommandInput placeholder="Search variables..." className="h-9" />
					<CommandList>
						<CommandEmpty>No variables found.</CommandEmpty>
						{services.map((svc) => (
							<CommandGroup key={svc.appName} heading={svc.name}>
								{svc.vars.map((v) => (
									<CommandItem
										key={`${svc.name}.${v}`}
										value={`${svc.name}.${v}`}
										onSelect={() => {
											onSelect(`$\{{${svc.name}.${v}}}`);
											onOpenChange(false);
										}}
										className="text-xs font-mono"
									>
										<KeyRound className="size-3 mr-2 text-muted-foreground" />
										{svc.name}.{v}
									</CommandItem>
								))}
							</CommandGroup>
						))}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

function VariableRow({
	variable,
	index,
	isEditing,
	onStartEdit,
	onUpdate,
	onDelete,
	onFinishEdit,
	services,
}: {
	variable: EnvVariable;
	index: number;
	isEditing: boolean;
	onStartEdit: () => void;
	onUpdate: (v: EnvVariable) => void;
	onDelete: () => void;
	onFinishEdit: () => void;
	services: ServiceEnvInfo[];
}) {
	const [editKey, setEditKey] = useState(variable.key);
	const [editValue, setEditValue] = useState(variable.value);
	const [revealed, setRevealed] = useState(false);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [refPopoverOpen, setRefPopoverOpen] = useState(false);
	const keyRef = useRef<HTMLInputElement>(null);
	const valueRef = useRef<HTMLInputElement>(null);
	const rowRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (isEditing && !variable.key) {
			keyRef.current?.focus();
		}
	}, [isEditing, variable.key]);

	useEffect(() => {
		setEditKey(variable.key);
		setEditValue(variable.value);
	}, [variable.key, variable.value]);

	const commitEdit = useCallback(() => {
		if (!editKey.trim() && !editValue.trim()) {
			onDelete();
			return;
		}
		const refMatch = editValue.match(REF_PATTERN);
		onUpdate({
			key: editKey.trim(),
			value: editValue,
			isSecret: SECRET_PATTERN.test(editKey),
			isReference: !!refMatch,
			referencedService: refMatch?.[1],
			referencedVar: refMatch?.[2],
		});
	}, [editKey, editValue, onUpdate, onDelete]);

	// Row-level blur: only commit+finish when focus leaves the entire row
	// Skip if the reference popover is open (renders in a Radix portal outside the row)
	const handleRowBlur = useCallback(
		(e: React.FocusEvent) => {
			if (refPopoverOpen) return;
			if (rowRef.current?.contains(e.relatedTarget as Node)) {
				return;
			}
			commitEdit();
			onFinishEdit();
		},
		[commitEdit, onFinishEdit, refPopoverOpen],
	);

	const handleCancel = useCallback(() => {
		// Restore original values
		setEditKey(variable.key);
		setEditValue(variable.value);
		// If it was a new empty row (both original key and value are empty), delete it
		if (!variable.key && !variable.value) {
			onDelete();
		}
		onFinishEdit();
	}, [variable.key, variable.value, onDelete, onFinishEdit]);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			commitEdit();
			onFinishEdit();
		}
		if (e.key === "Escape") {
			handleCancel();
		}
		if (e.key === "Tab" && !e.shiftKey && e.currentTarget === keyRef.current) {
			e.preventDefault();
			valueRef.current?.focus();
		}
	};

	const displayValue = useMemo(() => {
		if (variable.isReference && variable.referencedService && variable.referencedVar) {
			return (
				<ReferenceChip
					service={variable.referencedService}
					variable={variable.referencedVar}
				/>
			);
		}
		if (variable.isSecret && !revealed) {
			return (
				<span className="font-mono text-sm text-muted-foreground select-none">
					{"*".repeat(Math.min(variable.value.length || 8, 24))}
				</span>
			);
		}
		return (
			<span className="font-mono text-sm truncate">
				{variable.value || <span className="text-muted-foreground italic">empty</span>}
			</span>
		);
	}, [variable, revealed]);

	// Auto-split KEY=VALUE when user types or pastes `=` in the key input
	const handleKeyInputChange = useCallback(
		(inputValue: string) => {
			const eqIdx = inputValue.indexOf("=");
			if (eqIdx >= 0) {
				setEditKey(inputValue.slice(0, eqIdx));
				const extra = inputValue.slice(eqIdx + 1);
				if (extra) {
					setEditValue(extra + editValue);
				}
				// Move focus to value input
				setTimeout(() => valueRef.current?.focus(), 0);
			} else {
				setEditKey(inputValue);
			}
		},
		[editValue],
	);

	if (isEditing) {
		return (
			<div
				ref={rowRef}
				onBlur={handleRowBlur}
				className="flex items-center gap-2 px-3 py-1.5 bg-accent/30 border-b border-border group"
			>
				<div className="flex items-center shrink-0">
					<Input
						ref={keyRef}
						value={editKey}
						onChange={(e) => handleKeyInputChange(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="VARIABLE_NAME"
						className="h-7 text-sm font-mono px-2 w-[180px] rounded-r-none border-r-0"
					/>
					<span className="h-7 flex items-center px-1.5 text-muted-foreground font-mono text-sm border border-l-0 rounded-r-md bg-muted/50">=</span>
				</div>
				<div className="relative flex-1 min-w-[120px]">
					<Input
						ref={valueRef}
						value={editValue}
						onChange={(e) => {
							setEditValue(e.target.value);
							setShowSuggestions(e.target.value.includes("${{"));
						}}
						onKeyDown={handleKeyDown}
						onFocus={() =>
							setShowSuggestions(editValue.includes("${{"))
						}
						placeholder="VALUE or ${{REF}}"
						className="h-7 text-sm font-mono px-2 w-full"
					/>
					{services.length > 0 && (
						<ServiceSuggestionDropdown
							services={services}
							inputValue={editValue}
							visible={showSuggestions}
							onSelect={(ref) => {
								setEditValue(ref);
								setShowSuggestions(ref.includes("${{") && !ref.endsWith("}}"));
								valueRef.current?.focus();
							}}
						/>
					)}
				</div>
				<AddReferencePopover
					services={services}
					open={refPopoverOpen}
					onOpenChange={setRefPopoverOpen}
					onSelect={(ref) => {
						setEditValue((prev) => prev + ref);
						setTimeout(() => valueRef.current?.focus(), 0);
					}}
				/>
				<Button
					variant="ghost"
					size="icon"
					className="size-6 shrink-0 text-green-600 hover:text-green-700 hover:bg-green-50"
					onClick={() => {
						commitEdit();
						onFinishEdit();
					}}
				>
					<Check className="size-3.5" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
					onClick={handleCancel}
				>
					<X className="size-3.5" />
				</Button>
			</div>
		);
	}

	return (
		<div
			className="flex items-center gap-2 px-3 py-1.5 border-b border-border group hover:bg-accent/20 cursor-pointer"
			onClick={onStartEdit}
		>
			{variable.isSecret ? (
				<ShieldCheck className="size-3.5 text-yellow-500 shrink-0" />
			) : (
				<Braces className="size-3.5 text-muted-foreground shrink-0" />
			)}

			<span className="font-mono text-sm font-medium w-[200px] truncate shrink-0">
				{variable.key}
			</span>

			<div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
				{displayValue}
			</div>

			<div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
				{variable.isSecret && (
					<TooltipProvider delayDuration={300}>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="size-6"
									onClick={(e) => {
										e.stopPropagation();
										setRevealed(!revealed);
									}}
								>
									{revealed ? (
										<EyeOff className="size-3.5" />
									) : (
										<Eye className="size-3.5" />
									)}
								</Button>
							</TooltipTrigger>
							<TooltipContent side="top">
								{revealed ? "Hide" : "Reveal"}
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				)}

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="size-6"
							onClick={(e) => e.stopPropagation()}
						>
							<MoreHorizontal className="size-3.5" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation();
								navigator.clipboard.writeText(variable.key);
								toast.success("Key copied");
							}}
						>
							<Copy className="size-3.5 mr-2" />
							Copy key
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation();
								navigator.clipboard.writeText(variable.value);
								toast.success("Value copied");
							}}
						>
							<Copy className="size-3.5 mr-2" />
							Copy value
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							className="text-destructive"
							onClick={(e) => {
								e.stopPropagation();
								onDelete();
							}}
						>
							<Trash2 className="size-3.5 mr-2" />
							Delete variable
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}

// --- Main Component ---

export function RailwayEnvEditor({
	value,
	onChange,
	disabled,
	services = [],
	additionalExtensions,
	placeholder,
	style,
}: RailwayEnvEditorProps) {
	const [mode, setMode] = useState<"visual" | "raw">("visual");
	const [editingIndex, setEditingIndex] = useState<number | null>(null);

	const variables = useMemo(() => parseVariables(value), [value]);

	const updateVariables = useCallback(
		(updater: (vars: EnvVariable[]) => EnvVariable[]) => {
			const updated = updater([...variables]);
			onChange(serializeVariables(updated));
		},
		[variables, onChange],
	);

	const handleUpdateVar = useCallback(
		(index: number, newVar: EnvVariable) => {
			updateVariables((vars) => {
				vars[index] = newVar;
				return vars;
			});
		},
		[updateVariables],
	);

	const handleDeleteVar = useCallback(
		(index: number) => {
			updateVariables((vars) => {
				vars.splice(index, 1);
				return vars;
			});
			setEditingIndex(null);
		},
		[updateVariables],
	);

	const handleFinishEditing = useCallback(() => {
		setEditingIndex(null);
	}, []);

	const handleAddVariable = useCallback(() => {
		const newVar: EnvVariable = {
			key: "",
			value: "",
			isSecret: false,
			isReference: false,
		};
		const newVars = [...variables, newVar];
		onChange(serializeVariables(newVars));
		setEditingIndex(newVars.length - 1);
	}, [variables, onChange]);

	if (disabled && mode === "visual") {
		return (
			<div className="rounded-md border">
				<div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
					<span className="text-sm text-muted-foreground">
						{variables.length} Variable{variables.length !== 1 ? "s" : ""}
					</span>
				</div>
				<div className="max-h-96 overflow-y-auto">
					{variables.length === 0 ? (
						<div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
							No variables defined
						</div>
					) : (
						variables.map((v, i) => (
							<div
								key={`${v.key}-${i}`}
								className="flex items-center gap-2 px-3 py-1.5 border-b border-border last:border-b-0"
							>
								{v.isSecret ? (
									<ShieldCheck className="size-3.5 text-yellow-500 shrink-0" />
								) : (
									<Braces className="size-3.5 text-muted-foreground shrink-0" />
								)}
								<span className="font-mono text-sm font-medium w-[200px] truncate shrink-0">
									{v.key}
								</span>
								<span className="font-mono text-sm text-muted-foreground select-none">
									{"*".repeat(Math.min(v.value.length || 8, 24))}
								</span>
							</div>
						))
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="rounded-md border">
			{/* Header */}
			<div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
				<span className="text-sm text-muted-foreground">
					{variables.length} Variable{variables.length !== 1 ? "s" : ""}
				</span>
				<div className="flex items-center gap-1.5">
					<TooltipProvider delayDuration={300}>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant={mode === "raw" ? "secondary" : "ghost"}
									size="sm"
									className="h-7 gap-1.5 text-xs"
									onClick={() =>
										setMode((m) => (m === "visual" ? "raw" : "visual"))
									}
								>
									<Braces className="size-3" />
									{mode === "visual" ? "Raw Editor" : "Visual Editor"}
								</Button>
							</TooltipTrigger>
							<TooltipContent side="top">
								Switch to {mode === "visual" ? "raw" : "visual"} mode
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
					{mode === "visual" && (
						<Button
							variant="ghost"
							size="sm"
							className="h-7 gap-1.5 text-xs"
							onClick={handleAddVariable}
						>
							<Plus className="size-3" />
							New Variable
						</Button>
					)}
				</div>
			</div>

			{/* Content */}
			{mode === "visual" ? (
				<div className="max-h-96 overflow-y-auto">
					{variables.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-8 gap-2">
							<span className="text-sm text-muted-foreground">
								No variables defined
							</span>
							<Button
								variant="outline"
								size="sm"
								className="gap-1.5"
								onClick={handleAddVariable}
							>
								<Plus className="size-3" />
								Add Variable
							</Button>
						</div>
					) : (
						variables.map((v, i) => (
							<VariableRow
								key={`${v.key}-${i}`}
								variable={v}
								index={i}
								isEditing={editingIndex === i}
								onStartEdit={() => setEditingIndex(i)}
								onUpdate={(updated) => handleUpdateVar(i, updated)}
								onDelete={() => handleDeleteVar(i)}
								onFinishEdit={handleFinishEditing}
								services={services}
							/>
						))
					)}
				</div>
			) : (
				<CodeEditor
					style={style}
					language="properties"
					lineWrapping
					placeholder={placeholder}
					className="h-96 font-mono"
					additionalExtensions={additionalExtensions}
					value={value}
					onChange={onChange}
				/>
			)}
		</div>
	);
}
