export const LICENSE_KEY_URL = "";

export const initEnterpriseBackupCronJobs = async () => {
	// No-op: enterprise license validation disabled
};

export const validateLicenseKey = async (_licenseKey: string) => {
	return true;
};
