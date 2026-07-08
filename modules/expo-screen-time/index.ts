import ExpoScreenTimeModule from './src/ExpoScreenTimeModule';

export function hasUsagePermission(): boolean {
    return ExpoScreenTimeModule.hasUsagePermission();
}

export function requestUsagePermission(): void {
    return ExpoScreenTimeModule.requestUsagePermission();
}

export function getDailyUsageStats(): Record<string, number> {
    return ExpoScreenTimeModule.getDailyUsageStats();
}
