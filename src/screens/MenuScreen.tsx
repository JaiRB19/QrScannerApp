import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
    StyleSheet, Text, View, TouchableOpacity, Animated, Easing,
    ScrollView, ViewStyle, Modal, Alert, PanResponder, Share, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as Haptics from '../utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    getScans, saveScan, ScanItem, getGeneratedQRs, GeneratedItem,
    deleteScan, toggleScanFavorite, deleteGeneratedQR, toggleGeneratedFavorite,
} from '../utils/storage';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import * as ExpoClipboard from 'expo-clipboard';
import QRImageDecoder, { QRDecoderRef } from '../components/QRImageDecoder';
import NexusLogo from '../components/NexusLogo';

type MenuScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Menu'>;
type Props = { navigation: MenuScreenNavigationProp };

// ─── Constants ────────────────────────────────────────────────────────────────
const SWIPE_THRESHOLD = 36;
const DELETE_WIDTH = 76;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getIconForType = (type: string): any => {
    const map: Record<string, string> = { url: 'link-outline', wifi: 'wifi-outline', contact: 'person-outline' };
    return map[type] ?? 'document-text-outline';
};

const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString() + ' · ' +
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// ─── HistoryRow ───────────────────────────────────────────────────────────────
interface HistoryRowProps {
    item: ScanItem | GeneratedItem;
    isGenerated: boolean;
    colors: ThemeColors;
    cardShadow: ViewStyle;
    onPress: () => void;
    onDelete: () => void;
    onToggleFavorite: () => void;
}

function HistoryRow({ item, isGenerated, colors, cardShadow, onPress, onDelete, onToggleFavorite }: HistoryRowProps) {
    const translateX = useRef(new Animated.Value(0)).current;
    const openRef = useRef(false);

    const snap = useCallback((toValue: number, opened: boolean) => {
        Animated.spring(translateX, { toValue, useNativeDriver: true, tension: 120, friction: 14 }).start();
        openRef.current = opened;
    }, [translateX]);

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) =>
                Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
            onPanResponderMove: (_, g) => {
                const base = openRef.current ? -DELETE_WIDTH : 0;
                translateX.setValue(Math.max(Math.min(base + g.dx, 0), -DELETE_WIDTH));
            },
            onPanResponderRelease: (_, g) => {
                const effective = (openRef.current ? -DELETE_WIDTH : 0) + g.dx;
                snap(effective < -SWIPE_THRESHOLD ? -DELETE_WIDTH : 0, effective < -SWIPE_THRESHOLD);
            },
            onPanResponderTerminate: () => snap(0, false),
        })
    ).current;

    const fav = (item as any).favorite ?? false;

    return (
        <View style={styles.rowWrapper}>
            {/* Red zone revealed on swipe */}
            <View style={styles.deleteZone}>
                <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
                    <Ionicons name="trash-outline" size={20} color="#fff" />
                    <Text style={styles.deleteBtnText}>Borrar</Text>
                </TouchableOpacity>
            </View>

            {/* Sliding content */}
            <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
                <TouchableOpacity
                    onPress={() => { if (openRef.current) { snap(0, false); } else { onPress(); } }}
                    activeOpacity={0.85}
                    style={[styles.scanRow, { backgroundColor: colors.card, borderColor: colors.border, ...cardShadow }]}
                >
                    <View style={[styles.scanIcon, { backgroundColor: colors.primary + '18' }]}>
                        <Ionicons name={getIconForType(item.type)} size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, marginRight: 6 }}>
                        <Text style={[styles.scanData, { color: colors.text }]} numberOfLines={1}>{item.data}</Text>
                        <Text style={[styles.scanDate, { color: colors.subtext }]}>{formatDate(item.timestamp)}</Text>
                    </View>
                    <TouchableOpacity
                        onPress={(e) => { e.stopPropagation?.(); onToggleFavorite(); }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={{ padding: 4, marginRight: isGenerated ? 6 : 0 }}
                    >
                        <Ionicons name={fav ? 'star' : 'star-outline'} size={18} color={fav ? '#F59E0B' : colors.subtext} />
                    </TouchableOpacity>
                    {isGenerated && (
                        <View style={[styles.generatedBadge, { backgroundColor: colors.primary + '14' }]}>
                            <Text style={[styles.generatedBadgeText, { color: colors.primary }]}>{item.type.toUpperCase()}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

// ─── MenuScreen ───────────────────────────────────────────────────────────────
type SelectedItem = { item: ScanItem | GeneratedItem; isGenerated: boolean } | null;

export default function MenuScreen({ navigation }: Props) {
    const insets = useSafeAreaInsets();
    const { colors, theme } = useTheme();

    const [scans, setScans] = useState<ScanItem[]>([]);
    const [generatedQRs, setGeneratedQRs] = useState<GeneratedItem[]>([]);
    const [historyTab, setHistoryTab] = useState<'scanned' | 'generated'>('scanned');
    const [loading, setLoading] = useState(true);

    // Gallery state
    const [galleryModal, setGalleryModal] = useState(false);
    const [galleryResult, setGalleryResult] = useState<string | null>(null);
    const [decodingImage, setDecodingImage] = useState(false);

    // Detail modal
    const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);

    const decoderRef = useRef<QRDecoderRef>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateYAnim = useRef(new Animated.Value(24)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true, easing: Easing.out(Easing.exp) }),
            Animated.timing(translateYAnim, { toValue: 0, duration: 700, useNativeDriver: true, easing: Easing.out(Easing.exp) }),
        ]).start();
    }, []);

    useFocusEffect(useCallback(() => {
        (async () => {
            setLoading(true);
            const [s, g] = await Promise.all([getScans(), getGeneratedQRs()]);
            setScans(s);
            setGeneratedQRs(g);
            setLoading(false);
        })();
    }, []));

    // Favorites pinned to top
    const sortedScans = useMemo(() => [
        ...scans.filter(s => s.favorite),
        ...scans.filter(s => !s.favorite),
    ], [scans]);

    const sortedGenerated = useMemo(() => [
        ...generatedQRs.filter(g => g.favorite),
        ...generatedQRs.filter(g => !g.favorite),
    ], [generatedQRs]);

    // ── CRUD handlers (optimistic updates) ──
    const handleDeleteScan = async (id: string) => {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        await deleteScan(id);
        setScans(prev => prev.filter(s => s.id !== id));
    };
    const handleToggleScanFav = async (id: string) => {
        await Haptics.selectionAsync();
        await toggleScanFavorite(id);
        setScans(prev => prev.map(s => s.id === id ? { ...s, favorite: !s.favorite } : s));
    };
    const handleDeleteGenerated = async (id: string) => {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        await deleteGeneratedQR(id);
        setGeneratedQRs(prev => prev.filter(g => g.id !== id));
    };
    const handleToggleGeneratedFav = async (id: string) => {
        await Haptics.selectionAsync();
        await toggleGeneratedFavorite(id);
        setGeneratedQRs(prev => prev.map(g => g.id === id ? { ...g, favorite: !g.favorite } : g));
    };

    // ── Detail modal actions ──
    const isSelURL = selectedItem ? /^https?:\/\//i.test(selectedItem.item.data) : false;

    const handleCopySelected = async () => {
        if (!selectedItem) return;
        await ExpoClipboard.setStringAsync(selectedItem.item.data);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };
    const handleShareSelected = async () => {
        if (!selectedItem) return;
        await Share.share({ message: selectedItem.item.data });
    };
    const handleOpenURL = async () => {
        if (!selectedItem) return;
        const url = selectedItem.item.data;
        if (await Linking.canOpenURL(url)) Linking.openURL(url);
    };

    // ── Gallery ──
    const handleGallery = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería.'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85, base64: true });
        if (result.canceled || !result.assets?.length) return;
        const asset = result.assets[0];
        if (!asset.base64) { Alert.alert('Error', 'No se pudo procesar la imagen.'); return; }
        setDecodingImage(true);
        decoderRef.current?.decode(`data:image/jpeg;base64,${asset.base64}`);
    };

    const handleDecodeResult = async (data: string | null) => {
        setDecodingImage(false);
        if (!data) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('🔍 Sin resultado', 'No se detectó ningún código QR. Intenta con una imagen más clara.', [{ text: 'Entendido' }]);
            return;
        }
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await saveScan(data);
        setGalleryResult(data);
        setGalleryModal(true);
        setScans(await getScans());
    };

    const cardShadow: ViewStyle = {
        shadowColor: colors.shadow, shadowOpacity: colors.shadowOpacity,
        shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4,
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <QRImageDecoder ref={decoderRef} onResult={handleDecodeResult} />

            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scroll, { paddingTop: Math.max(insets.top, 52), paddingBottom: Math.max(insets.bottom, 32) }]}
                style={{ opacity: fadeAnim, transform: [{ translateY: translateYAnim }] }}
            >
                {/* Header */}
                <View style={styles.headerRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <NexusLogo size={48} color={colors.primary} />
                        <View>
                            <Text style={[styles.greeting, { color: colors.subtext }]}>Panel de Control</Text>
                            <Text style={[styles.title, { color: colors.text }]}>QR Nexus</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
                        <View style={[styles.gearBtn, { backgroundColor: colors.card, borderColor: colors.border, ...cardShadow }]}>
                            <Ionicons name="settings-outline" size={22} color={colors.icon} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Bento Grid */}
                <View style={styles.grid}>
                    <TouchableOpacity activeOpacity={0.88}
                        onPress={async () => { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); navigation.navigate('Scanner'); }}
                        style={[styles.heroCard, cardShadow]}>
                        <LinearGradient
                            colors={theme === 'dark' ? ['#6366F1', '#4F46E5'] : ['#818CF8', '#6366F1']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroGradient}>
                            <View style={styles.heroContent}>
                                <View>
                                    <Text style={styles.heroCardTitle}>Escanear Código</Text>
                                    <Text style={styles.heroCardSub}>Cámara Principal</Text>
                                </View>
                                <View style={styles.heroIconCircle}>
                                    <Ionicons name="scan-outline" size={36} color="#fff" />
                                </View>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.halfRow}>
                        <TouchableOpacity activeOpacity={0.85}
                            onPress={async () => { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('Generate'); }}
                            style={[styles.halfCard, { backgroundColor: colors.card, borderColor: colors.border, ...cardShadow }]}>
                            <View style={[styles.halfIconBox, { backgroundColor: colors.primary + '18' }]}>
                                <Ionicons name="qr-code-outline" size={26} color={colors.primary} />
                            </View>
                            <Text style={[styles.halfCardTitle, { color: colors.text }]}>Generar QR</Text>
                            <Text style={[styles.halfCardSub, { color: colors.subtext }]}>Crea tu código</Text>
                        </TouchableOpacity>

                        <TouchableOpacity activeOpacity={0.85} onPress={handleGallery} disabled={decodingImage}
                            style={[styles.halfCard, { backgroundColor: colors.card, borderColor: colors.border, ...cardShadow, opacity: decodingImage ? 0.65 : 1 }]}>
                            <View style={[styles.halfIconBox, { backgroundColor: colors.primary + '18' }]}>
                                <Ionicons name={decodingImage ? 'hourglass-outline' : 'images-outline'} size={26} color={colors.primary} />
                            </View>
                            <Text style={[styles.halfCardTitle, { color: colors.text }]}>Galería</Text>
                            <Text style={[styles.halfCardSub, { color: colors.subtext }]}>{decodingImage ? 'Analizando...' : 'Desde tu carrete'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* History tabs */}
                <View style={[styles.historyTabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {(['scanned', 'generated'] as const).map(tab => {
                        const active = historyTab === tab;
                        return (
                            <TouchableOpacity key={tab}
                                style={[styles.historyTab, active && { backgroundColor: colors.primary + '18' }]}
                                onPress={async () => { await Haptics.selectionAsync(); setHistoryTab(tab); }}>
                                <Ionicons name={tab === 'scanned' ? 'scan-outline' : 'brush-outline'} size={15} color={active ? colors.primary : colors.subtext} />
                                <Text style={[styles.historyTabLabel, { color: active ? colors.primary : colors.subtext }, active && { fontWeight: '700' }]}>
                                    {tab === 'scanned' ? `Escaneados${scans.filter(s => s.favorite).length ? ' ⭐' : ''}` : `Generados${generatedQRs.filter(g => g.favorite).length ? ' ⭐' : ''}`}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Hint */}
                <Text style={[styles.swipeHint, { color: colors.subtext }]}>← Desliza para borrar · Toca para accionar · ⭐ Favorito</Text>

                {/* Scanned list */}
                {historyTab === 'scanned' && (
                    !loading && sortedScans.length === 0
                        ? <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border, ...cardShadow }]}>
                            <Ionicons name="folder-open-outline" size={32} color={colors.subtext} />
                            <Text style={[styles.emptyText, { color: colors.subtext }]}>Aún no has escaneado ningún código</Text>
                        </View>
                        : sortedScans.map(scan => (
                            <HistoryRow key={scan.id} item={scan} isGenerated={false} colors={colors} cardShadow={cardShadow}
                                onPress={() => setSelectedItem({ item: scan, isGenerated: false })}
                                onDelete={() => handleDeleteScan(scan.id)}
                                onToggleFavorite={() => handleToggleScanFav(scan.id)} />
                        ))
                )}

                {/* Generated list */}
                {historyTab === 'generated' && (
                    !loading && sortedGenerated.length === 0
                        ? <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border, ...cardShadow }]}>
                            <Ionicons name="qr-code-outline" size={32} color={colors.subtext} />
                            <Text style={[styles.emptyText, { color: colors.subtext }]}>Aún no has generado ningún código</Text>
                        </View>
                        : sortedGenerated.map(item => (
                            <HistoryRow key={item.id} item={item} isGenerated={true} colors={colors} cardShadow={cardShadow}
                                onPress={() => setSelectedItem({ item, isGenerated: true })}
                                onDelete={() => handleDeleteGenerated(item.id)}
                                onToggleFavorite={() => handleToggleGeneratedFav(item.id)} />
                        ))
                )}

                {/* Footer */}
                <View style={styles.footer}>
                    <View style={[styles.badge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.badgeText, { color: colors.subtext }]}>⚡ Developed by Jai</Text>
                    </View>
                </View>
            </Animated.ScrollView>

            {/* ── DETAIL MODAL (Re-action) ── */}
            <Modal visible={!!selectedItem} transparent animationType="slide" onRequestClose={() => setSelectedItem(null)}>
                <View style={styles.resultBackdrop}>
                    <View style={[styles.resultSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.handle, { backgroundColor: colors.border }]} />
                        <View style={[styles.resultIconBox, { backgroundColor: colors.primary + '18' }]}>
                            <Ionicons name={getIconForType(selectedItem?.item.type ?? 'text')} size={30} color={colors.primary} />
                        </View>
                        <Text style={[styles.resultTitle, { color: colors.text }]}>
                            {selectedItem?.isGenerated ? 'QR Generado' : 'QR Escaneado'}
                        </Text>
                        <Text style={[styles.resultDateText, { color: colors.subtext }]}>
                            {selectedItem ? formatDate(selectedItem.item.timestamp) : ''}
                        </Text>
                        <View style={[styles.resultDataBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <Text style={[styles.resultData, { color: colors.text }]} selectable numberOfLines={4}>
                                {selectedItem?.item.data}
                            </Text>
                        </View>
                        <View style={styles.actionsGrid}>
                            {isSelURL && (
                                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={handleOpenURL}>
                                    <Ionicons name="open-outline" size={18} color={colors.primaryText} />
                                    <Text style={[styles.actionBtnText, { color: colors.primaryText }]}>Abrir</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]} onPress={handleCopySelected}>
                                <Ionicons name="copy-outline" size={18} color={colors.text} />
                                <Text style={[styles.actionBtnText, { color: colors.text }]}>Copiar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]} onPress={handleShareSelected}>
                                <Ionicons name="share-social-outline" size={18} color={colors.text} />
                                <Text style={[styles.actionBtnText, { color: colors.text }]}>Compartir</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={[styles.closeBtn, { borderColor: colors.border }]} onPress={() => setSelectedItem(null)}>
                            <Text style={[styles.closeBtnText, { color: colors.subtext }]}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ── GALLERY RESULT MODAL ── */}
            <Modal visible={galleryModal} transparent animationType="fade" onRequestClose={() => { setGalleryModal(false); setGalleryResult(null); }}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.resultIconBox, { backgroundColor: colors.primary + '18' }]}>
                            <Ionicons name="checkmark-circle-outline" size={36} color={colors.primary} />
                        </View>
                        <Text style={[styles.resultTitle, { color: colors.text }]}>¡Código Detectado!</Text>
                        <Text style={[styles.resultDateText, { color: colors.subtext }]}>Guardado en tu historial</Text>
                        <View style={[styles.resultDataBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <Text style={[styles.resultData, { color: colors.text }]} selectable numberOfLines={4}>{galleryResult}</Text>
                        </View>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary, alignSelf: 'stretch', justifyContent: 'center' }]}
                            onPress={() => { setGalleryModal(false); setGalleryResult(null); }}>
                            <Text style={[styles.actionBtnText, { color: colors.primaryText }]}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { paddingHorizontal: 20, flexGrow: 1 },

    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 },
    greeting: { fontSize: 13, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
    title: { fontSize: 36, fontWeight: '800', letterSpacing: -0.5 },
    gearBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

    grid: { gap: 14, marginBottom: 32 },
    heroCard: { borderRadius: 24, overflow: 'hidden' },
    heroGradient: { paddingHorizontal: 24, paddingVertical: 28 },
    heroContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    heroCardTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
    heroCardSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
    heroIconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },

    halfRow: { flexDirection: 'row', gap: 14 },
    halfCard: { flex: 1, borderRadius: 20, padding: 20, borderWidth: 1, gap: 8 },
    halfIconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    halfCardTitle: { fontSize: 15, fontWeight: '700' },
    halfCardSub: { fontSize: 12, fontWeight: '500' },

    historyTabBar: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 10 },
    historyTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
    historyTabLabel: { fontSize: 13, fontWeight: '600' },

    swipeHint: { fontSize: 11, fontWeight: '500', textAlign: 'center', marginBottom: 14, opacity: 0.7 },

    // HistoryRow
    rowWrapper: { marginBottom: 10, borderRadius: 16, overflow: 'hidden' },
    deleteZone: {
        ...StyleSheet.absoluteFillObject as any,
        backgroundColor: '#EF4444',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    deleteBtn: { width: DELETE_WIDTH, height: '100%', justifyContent: 'center', alignItems: 'center', gap: 4 },
    deleteBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

    scanRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, borderWidth: 1 },
    scanIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    scanData: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
    scanDate: { fontSize: 12, fontWeight: '500' },

    generatedBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    generatedBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

    emptyCard: { alignItems: 'center', gap: 10, padding: 32, borderRadius: 20, borderWidth: 1 },
    emptyText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },

    // Detail/Result modal
    resultBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
    resultSheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, padding: 24, paddingBottom: 36, alignItems: 'center', gap: 12 },
    handle: { width: 44, height: 5, borderRadius: 3, marginBottom: 4 },
    resultIconBox: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    resultTitle: { fontSize: 20, fontWeight: '800' },
    resultDateText: { fontSize: 12, fontWeight: '500' },
    resultDataBox: { width: '100%', padding: 16, borderRadius: 14, borderWidth: 1 },
    resultData: { fontSize: 14, fontWeight: '500', lineHeight: 22 },
    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%', justifyContent: 'center' },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 14 },
    actionBtnText: { fontSize: 14, fontWeight: '700' },
    closeBtn: { paddingVertical: 12, paddingHorizontal: 28, borderRadius: 14, borderWidth: 1, marginTop: 2 },
    closeBtnText: { fontSize: 14, fontWeight: '600' },

    // Gallery modal
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: 24 },
    modalCard: { width: '100%', padding: 28, borderRadius: 28, borderWidth: 1, alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 14 },

    footer: { alignItems: 'center', marginTop: 28, paddingBottom: 8 },
    badge: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
    badgeText: { fontSize: 12, fontWeight: '600' },
});
