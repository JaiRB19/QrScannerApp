import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ScanItem {
    id: string;
    data: string;
    type: 'url' | 'wifi' | 'text' | 'contact';
    timestamp: number;
    favorite?: boolean;
}

const STORAGE_KEY = '@qr_nexus_scans';
const GENERATED_KEY = '@qr_nexus_generated';

export interface GeneratedItem {
    id: string;
    data: string;
    type: 'url' | 'wifi' | 'text';
    timestamp: number;
    favorite?: boolean;
}

export const saveGeneratedQR = async (data: string, type: GeneratedItem['type']): Promise<void> => {
    try {
        const existing = await getGeneratedQRs();
        // Skip immediate duplicate
        if (existing.length > 0 && existing[0].data === data) return;

        const item: GeneratedItem = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            data,
            type,
            timestamp: Date.now(),
        };
        const updated = [item, ...existing].slice(0, 50);
        await AsyncStorage.setItem(GENERATED_KEY, JSON.stringify(updated));
    } catch (error) {
        console.error('Error saving generated QR:', error);
    }
};

export const getGeneratedQRs = async (): Promise<GeneratedItem[]> => {
    try {
        const raw = await AsyncStorage.getItem(GENERATED_KEY);
        if (raw != null) return JSON.parse(raw) as GeneratedItem[];
    } catch (error) {
        console.error('Error reading generated QRs:', error);
    }
    return [];
};

export const clearGeneratedHistory = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem(GENERATED_KEY);
    } catch (error) {
        console.error('Error clearing generated history:', error);
    }
};

export const deleteGeneratedQR = async (id: string): Promise<void> => {
    try {
        const existing = await getGeneratedQRs();
        await AsyncStorage.setItem(GENERATED_KEY, JSON.stringify(existing.filter(g => g.id !== id)));
    } catch (e) { console.error(e); }
};

export const toggleGeneratedFavorite = async (id: string): Promise<void> => {
    try {
        const existing = await getGeneratedQRs();
        const updated = existing.map(g => g.id === id ? { ...g, favorite: !g.favorite } : g);
        await AsyncStorage.setItem(GENERATED_KEY, JSON.stringify(updated));
    } catch (e) { console.error(e); }
};
const MAX_HISTORY = 50;

// Helper para determinar el tipo básico del QR
const determineQRType = (data: string): ScanItem['type'] => {
    const lowerData = data.toLowerCase();
    if (lowerData.startsWith('http://') || lowerData.startsWith('https://')) return 'url';
    if (lowerData.startsWith('wifi:')) return 'wifi';
    if (lowerData.startsWith('begin:vcard')) return 'contact';
    return 'text';
};

export const saveScan = async (data: string): Promise<void> => {
    try {
        const existingScans = await getScans();

        // Evitar duplicados inmediatos (opcional, pero buena práctica)
        if (existingScans.length > 0 && existingScans[0].data === data) {
            return;
        }

        const type = determineQRType(data);
        const newScan: ScanItem = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            data,
            type,
            timestamp: Date.now(),
        };

        // Agregar al inicio y mantener solo los más recientes
        const updatedScans = [newScan, ...existingScans].slice(0, MAX_HISTORY);

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedScans));
    } catch (error) {
        console.error('Error saving scan:', error);
    }
};

export const getScans = async (): Promise<ScanItem[]> => {
    try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
        if (jsonValue != null) {
            return JSON.parse(jsonValue) as ScanItem[];
        }
    } catch (error) {
        console.error('Error reading scans:', error);
    }
    return [];
};

export const clearHistory = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('Error clearing history:', error);
    }
};

export const deleteScan = async (id: string): Promise<void> => {
    try {
        const existing = await getScans();
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing.filter(s => s.id !== id)));
    } catch (e) { console.error(e); }
};

export const toggleScanFavorite = async (id: string): Promise<void> => {
    try {
        const existing = await getScans();
        const updated = existing.map(s => s.id === id ? { ...s, favorite: !s.favorite } : s);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) { console.error(e); }
};
