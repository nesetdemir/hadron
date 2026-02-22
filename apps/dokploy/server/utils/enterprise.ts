export const validateLicenseKey = async (_licenseKey: string) => {
	return true;
};

export const activateLicenseKey = async (_licenseKey: string) => {
	return { success: true };
};

export const deactivateLicenseKey = async (_licenseKey: string) => {
	return { success: true };
};
