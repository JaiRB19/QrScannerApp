/**
 * haptics.ts
 * Wrapper around expo-haptics that respects the global hapticsEnabled flag.
 * Screens import from here instead of 'expo-haptics' directly.
 */
import * as ExpoHaptics from 'expo-haptics';

// Module-level flag, updated by ThemeContext whenever the user toggles vibration
let _enabled = true;

export function setHapticsEnabled(val: boolean) {
    _enabled = val;
}

export const ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle;
export const NotificationFeedbackType = ExpoHaptics.NotificationFeedbackType;

export async function impactAsync(style: ExpoHaptics.ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle.Medium) {
    if (!_enabled) return;
    return ExpoHaptics.impactAsync(style);
}

export async function notificationAsync(type: ExpoHaptics.NotificationFeedbackType = ExpoHaptics.NotificationFeedbackType.Success) {
    if (!_enabled) return;
    return ExpoHaptics.notificationAsync(type);
}

export async function selectionAsync() {
    if (!_enabled) return;
    return ExpoHaptics.selectionAsync();
}
