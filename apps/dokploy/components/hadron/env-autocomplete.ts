import {
	autocompletion,
	type CompletionContext,
	type CompletionResult,
} from "@codemirror/autocomplete";

export interface ServiceEnvInfo {
	name: string;
	appName: string;
	vars: string[];
}

/**
 * Creates a CodeMirror autocompletion extension for cross-service env references.
 *
 * Triggers on `${{` and suggests:
 * 1. Service names (e.g., ${{Postgres)
 * 2. After typing `ServiceName.`, suggests variable names
 *
 * Also suggests `project.` and `environment.` prefixes.
 */
export function createEnvAutocomplete(services: ServiceEnvInfo[]) {
	function envComplete(
		context: CompletionContext,
	): CompletionResult | null {
		// Match ${{ followed by optional content
		const beforeCursor = context.matchBefore(/\$\{\{([^}]*)/);
		if (!beforeCursor) return null;

		const inner = beforeCursor.text.replace(/^\$\{\{/, "");
		const from = beforeCursor.from + 3; // after ${{

		// Check if we have a dot - means we're selecting a variable from a service
		const dotIndex = inner.indexOf(".");
		if (dotIndex >= 0) {
			const prefix = inner.slice(0, dotIndex);
			const varFrom = from + dotIndex + 1;

			// Project variables
			if (prefix.toLowerCase() === "project") {
				return {
					from: varFrom,
					options: [
						{
							label: "VARIABLE_NAME",
							type: "variable",
							info: "Project-level variable",
							apply: "VARIABLE_NAME}}",
						},
					],
					validFor: /^[A-Za-z0-9_]*$/,
				};
			}

			// Environment variables
			if (prefix.toLowerCase() === "environment") {
				return {
					from: varFrom,
					options: [
						{
							label: "VARIABLE_NAME",
							type: "variable",
							info: "Environment-level variable",
							apply: "VARIABLE_NAME}}",
						},
					],
					validFor: /^[A-Za-z0-9_]*$/,
				};
			}

			// Cross-service variables
			const svc = services.find(
				(s) =>
					s.name.toLowerCase() === prefix.toLowerCase() ||
					s.appName.toLowerCase() === prefix.toLowerCase(),
			);

			if (svc) {
				return {
					from: varFrom,
					options: svc.vars.map((v) => ({
						label: v,
						type: "variable",
						info: `From ${svc.name}`,
						apply: `${v}}}`,
					})),
					validFor: /^[A-Za-z0-9_]*$/,
				};
			}

			return null;
		}

		// No dot yet - suggest service names and built-in prefixes
		const options = [
			{
				label: "project",
				type: "keyword",
				info: "Project-level variables",
				boost: 2,
			},
			{
				label: "environment",
				type: "keyword",
				info: "Environment-level variables",
				boost: 1,
			},
			...services.map((s) => ({
				label: s.name,
				type: "class",
				info: `Cross-service reference (${s.vars.length} vars)`,
				apply: `${s.name}.`,
			})),
		];

		return {
			from,
			options,
			validFor: /^[A-Za-z0-9_-]*$/,
		};
	}

	return autocompletion({
		override: [envComplete],
		activateOnTyping: true,
	});
}
