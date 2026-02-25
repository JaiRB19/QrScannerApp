import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setHapticsEnabled } from '../utils/haptics';

export type Theme = 'dark' | 'light';

export interface ThemeColors {
    // Foundations
    background: string;
    card: string;
    border: string;
    // Text
    text: string;
    subtext: string;
    // Brand
    primary: string;
    primaryText: string;
    // Shadows
    shadow: string;
    shadowOpacity: number;
    // Icon color for Ionicons
    icon: string;
    // StatusBar
    statusBar: 'light' | 'dark' | 'auto';
}

export const LIGHT: ThemeColors = {
    background: '#FDFDFF',
    card: '#FFFFFF',
    border: '#E5E7EB',
    text: '#1E1B4B',
    subtext: '#6B7280',
    primary: '#6366F1',
    primaryText: '#FFFFFF',
    shadow: '#000000',
    shadowOpacity: 0.05,
    icon: '#6366F1',
    statusBar: 'dark',
};

export const DARK: ThemeColors = {
    background: '#0F172A',
    card: '#1E293B',
    border: '#334155',
    text: '#F8FAFC',
    subtext: '#94A3B8',
    primary: '#818CF8',
    primaryText: '#0F172A',
    shadow: '#000000',
    shadowOpacity: 0.25,
    icon: '#FFFFFF',
    statusBar: 'light',
};

const THEME_KEY = '@qr_nexus_theme';
const HAPTICS_KEY = '@qr_nexus_haptics';

interface ThemeContextValue {
    theme: Theme;
    colors: ThemeColors;
    toggleTheme: () => void;
    hapticsEnabled: boolean;
    toggleHaptics: () => void;
    ready: boolean; // false while loading prefs from storage
}

const ThemeContext = createContext<ThemeContextValue>({
    theme: 'light',
    colors: LIGHT,
    toggleTheme: () => { },
    hapticsEnabled: true,
    toggleHaptics: () => { },
    ready: false,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>('light');
    const [hapticsEnabled, setHapticsEnabledState] = useState(true);
    const [ready, setReady] = useState(false);

    // ── Load persisted prefs on mount ──
    useEffect(() => {
        (async () => {
            try {
                const [storedTheme, storedHaptics] = await Promise.all([
                    AsyncStorage.getItem(THEME_KEY),
                    AsyncStorage.getItem(HAPTICS_KEY),
                ]);
                if (storedTheme === 'dark' || storedTheme === 'light') setTheme(storedTheme);
                const hapVal = storedHaptics !== 'false'; // default true
                setHapticsEnabledState(hapVal);
                setHapticsEnabled(hapVal);
            } catch (e) {
                console.warn('ThemeContext load error:', e);
            } finally {
                setReady(true);
            }
        })();
    }, []);

    const toggleTheme = async () => {
        const next: Theme = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        try { await AsyncStorage.setItem(THEME_KEY, next); } catch { }
    };

    const toggleHaptics = async () => {
        const next = !hapticsEnabled;
        setHapticsEnabledState(next);
        setHapticsEnabled(next);
        try { await AsyncStorage.setItem(HAPTICS_KEY, String(next)); } catch { }
    };

    const colors = theme === 'dark' ? DARK : LIGHT;

    return (
        <ThemeContext.Provider value={{ theme, colors, toggleTheme, hapticsEnabled, toggleHaptics, ready }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
