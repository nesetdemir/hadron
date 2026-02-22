export function getHubSpotUTK(_cookieHeader?: string): string | null {
	return null;
}

export function formatContactDataForHubSpot(
	_contactData: { firstName?: string; lastName?: string; email?: string },
	_hutk?: string | null,
) {
	return {};
}

export async function submitToHubSpot(
	_contactData: { firstName?: string; lastName?: string; email?: string },
	_hutk?: string | null,
): Promise<boolean> {
	return false;
}
