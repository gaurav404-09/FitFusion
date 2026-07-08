// Mock implementation for screenTimeMapper
// This acts as a bridge for the requested module missing during bundling.

export const hasUsagePermissionSafely = () => {
    return false;
};

export const requestUsagePermissionSafely = () => {
    // Attempt permission request
    return false;
};

export const fetchCategorizedScreenTime = () => {
    return {
        screen_time_hours: 0,
        work_screen_hours: 0,
        leisure_screen_hours: 0,
    };
};
