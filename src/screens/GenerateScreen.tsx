import React, { useRef, useState, useEffect } from 'react';
import {
    StyleSheet, Text, View, TouchableOpacity, TextInput,
    KeyboardAvoidingView, Platform, ScrollView, Animated, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as Haptics from '../utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as ExpoClipboard from 'expo-clipboard';
import { useTheme } from '../context/ThemeContext';
import { saveGeneratedQR } from '../utils/storage';

type GenerateScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Generate'>;
type Props = { navigation: GenerateScreenNavigationProp };
type Category = 'url' | 'wifi' | 'text';

const TABS: { key: Category; icon: string; label: string }[] = [
    { key: 'url', icon: 'link-outline', label: 'URL' },
    { key: 'wifi', icon: 'wifi-outline', label: 'WiFi' },
    { key: 'text', icon: 'document-text-outline', label: 'Texto' },
];

export default function GenerateScreen({ navigation }: Props) {
    const { colors, theme } = useTheme();
    const svgRef = useRef<any>(null);

    const [activeTab, setActiveTab] = useState<Category>('url');
    const [urlValue, setUrlValue] = useState('');
    const [wifiSsid, setWifiSsid] = useState('');
    const [wifiPass, setWifiPass] = useState('');
    const [wifiEncryption, setWifiEncryption] = useState<'WPA' | 'WEP' | 'nopass'>('WPA');
    const [textValue, setTextValue] = useState('');
    const [savedFlash, setSavedFlash] = useState(false); // brief "¡Guardado!" feedback

    const scaleAnim = useRef(new Animated.Value(0)).current;
    const prevHasValue = useRef(false);

    const qrValue = (() => {
        if (activeTab === 'url') return urlValue.trim();
        if (activeTab === 'wifi') {
            if (!wifiSsid.trim()) return '';
            const pass = wifiEncryption === 'nopass' ? '' : wifiPass;
            return `WIFI:T:${wifiEncryption};S:${wifiSsid};P:${pass};;`;
        }
        return textValue.trim();
    })();

    useEffect(() => {
        const hasValue = qrValue.length > 0;
        if (hasValue && !prevHasValue.current) {
            scaleAnim.setValue(0);
            Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 7 }).start();
        }
        prevHasValue.current = hasValue;
    }, [qrValue]);

    const switchTab = async (tab: Category) => { await Haptics.selectionAsync(); setActiveTab(tab); };

    const writePng = (dataURL: string, filename: string): Promise<string> =>
        new Promise((res) => {
            const path = FileSystem.cacheDirectory + filename;
            const b64 = dataURL.replace('data:image/png;base64,', '');
            FileSystem.writeAsStringAsync(path, b64, { encoding: FileSystem.EncodingType.Base64 })
                .then(() => res(path)).catch(console.error);
        });

    const handleSave = async () => {
        if (!svgRef.current || !qrValue) return;

        Alert.alert(
            "Guardar QR",
            "¿Estás seguro de que quieres guardar este código QR en tu galería?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Guardar",
                    onPress: async () => {
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        const { status } = await MediaLibrary.requestPermissionsAsync();
                        if (status !== 'granted') return;
                        svgRef.current.toDataURL(async (d: string) => {
                            const path = await writePng(d, 'qr-save.png');
                            await MediaLibrary.saveToLibraryAsync(path);
                            await saveGeneratedQR(qrValue, activeTab);
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        });
                    }
                }
            ]
        );
    };

    const handleShare = async () => {
        if (!svgRef.current || !qrValue) return;
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        svgRef.current.toDataURL(async (d: string) => {
            const path = await writePng(d, 'qr-share.png');
            await Sharing.shareAsync(path, { mimeType: 'image/png' });
            await saveGeneratedQR(qrValue, activeTab);
        });
    };

    const handleClear = async () => {
        if (!qrValue && !urlValue && !wifiSsid && !wifiPass && !textValue) return;

        Alert.alert(
            "Limpiar campos",
            "¿Estás seguro de que quieres borrar todo el contenido?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Limpiar",
                    style: "destructive",
                    onPress: async () => {
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setUrlValue('');
                        setWifiSsid('');
                        setWifiPass('');
                        setTextValue('');
                    }
                }
            ]
        );
    };

    // ── Save to generated history (no device save, no share) ──
    const handleAddToHistory = async () => {
        if (!qrValue) return;
        await saveGeneratedQR(qrValue, activeTab);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1800);
    };

    // Colores del QR según tema
    const qrFg = theme === 'dark' ? '#F8FAFC' : '#1E1B4B';
    const qrBg = 'transparent';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                    {/* Header */}
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <View style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Ionicons name="arrow-back" size={20} color={colors.icon} />
                                <Text style={[styles.backBtnText, { color: colors.text }]}>Volver</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.title, { color: colors.text }]}>Generador QR</Text>
                    <Text style={[styles.subtitle, { color: colors.subtext }]}>Escribe para crear magia</Text>

                    {/* Tabs */}
                    <View style={[styles.tabsBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {TABS.map((tab) => {
                            const active = activeTab === tab.key;
                            return (
                                <TouchableOpacity key={tab.key} activeOpacity={0.7} onPress={() => switchTab(tab.key)}
                                    style={[styles.tabItem, active && { backgroundColor: colors.primary + '18' }]}>
                                    <Ionicons name={tab.icon as any} size={18} color={active ? colors.primary : colors.subtext} />
                                    <Text style={[styles.tabLabel, { color: active ? colors.primary : colors.subtext }, active && { fontWeight: '700' }]}>
                                        {tab.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Inputs */}
                    {activeTab === 'url' && (
                        <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <TextInput style={[styles.input, { color: colors.text }]}
                                placeholder="https://ejemplo.com" placeholderTextColor={colors.subtext}
                                value={urlValue} onChangeText={setUrlValue} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
                        </View>
                    )}

                    {activeTab === 'wifi' && (
                        <View style={{ gap: 12 }}>
                            {/* SSID */}
                            <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <TextInput style={[styles.input, { color: colors.text }]}
                                    placeholder="Nombre de red (SSID)" placeholderTextColor={colors.subtext}
                                    value={wifiSsid} onChangeText={setWifiSsid} autoCapitalize="none" autoCorrect={false} />
                            </View>

                            {/* Encryption selector */}
                            <View style={[styles.encryptionBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                {(['WPA', 'WEP', 'nopass'] as const).map((enc) => {
                                    const active = wifiEncryption === enc;
                                    const label = enc === 'nopass' ? 'Abierta' : enc;
                                    return (
                                        <TouchableOpacity
                                            key={enc}
                                            activeOpacity={0.75}
                                            onPress={async () => { await Haptics.selectionAsync(); setWifiEncryption(enc); }}
                                            style={[styles.encryptionPill, active && { backgroundColor: colors.primary }]}
                                        >
                                            <Text style={[styles.encryptionLabel, { color: active ? colors.primaryText : colors.subtext },
                                            active && { fontWeight: '700' }]}>{label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Password (hidden when Open network) */}
                            {wifiEncryption !== 'nopass' && (
                                <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <TextInput style={[styles.input, { color: colors.text }]}
                                        placeholder="Contraseña" placeholderTextColor={colors.subtext}
                                        value={wifiPass} onChangeText={setWifiPass} secureTextEntry autoCapitalize="none" autoCorrect={false} />
                                </View>
                            )}
                        </View>
                    )}

                    {activeTab === 'text' && (
                        <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <TextInput style={[styles.input, { color: colors.text, minHeight: 90 }]}
                                placeholder="Escribe cualquier texto..." placeholderTextColor={colors.subtext}
                                value={textValue} onChangeText={setTextValue} multiline textAlignVertical="top" />
                        </View>
                    )}

                    {/* QR Display */}
                    <View style={styles.qrArea}>
                        {qrValue.length === 0 ? (
                            <View style={[styles.emptyQr, { borderColor: colors.border }]}>
                                <Ionicons name="qr-code-outline" size={52} color={colors.subtext} />
                                <Text style={[styles.emptyQrText, { color: colors.subtext }]}>
                                    El código aparecerá aquí{'\n'}cuando comiences a escribir
                                </Text>
                            </View>
                        ) : (
                            <Animated.View style={[styles.qrCard, { backgroundColor: colors.card, borderColor: colors.border, transform: [{ scale: scaleAnim }] }]}>
                                <QRCode value={qrValue} size={200} color={qrFg} backgroundColor={qrBg} getRef={(c) => (svgRef.current = c)} />
                            </Animated.View>
                        )}
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actions}>
                        {[
                            { label: 'Guardar', icon: 'download-outline', onPress: handleSave, primary: false, needsQr: true },
                            { label: 'Compartir', icon: 'share-social-outline', onPress: handleShare, primary: true, needsQr: true },
                            { label: savedFlash ? '¡Guardado ✓' : 'Agregar', icon: savedFlash ? 'checkmark-circle-outline' : 'bookmark-outline', onPress: handleAddToHistory, primary: false, needsQr: true },
                            { label: 'Limpiar', icon: 'trash-outline', onPress: handleClear, primary: false, needsQr: false },
                        ].map(({ label, icon, onPress, primary, needsQr }) => (
                            <TouchableOpacity
                                key={label}
                                activeOpacity={0.8}
                                onPress={onPress}
                                disabled={needsQr && !qrValue}
                                style={[styles.actionTouch, { opacity: (!needsQr || qrValue) ? 1 : 0.35 }]}
                            >
                                <View style={[
                                    styles.actionPill,
                                    { borderColor: primary ? colors.primary : savedFlash && label.startsWith('¡') ? colors.primary : colors.border },
                                    primary ? { backgroundColor: colors.primary } : savedFlash && label.startsWith('¡') ? { backgroundColor: colors.primary + '18' } : { backgroundColor: colors.card },
                                ]}>
                                    <Ionicons name={icon as any} size={20} color={primary ? colors.primaryText : savedFlash && label.startsWith('¡') ? colors.primary : colors.icon} />
                                    <Text style={[styles.actionLabel, { color: primary ? colors.primaryText : savedFlash && label.startsWith('¡') ? colors.primary : colors.text }]}>{label}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40, flexGrow: 1 },

    headerRow: { marginBottom: 20 },
    backBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1 },
    backBtnText: { fontSize: 15, fontWeight: '600' },

    title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
    subtitle: { fontSize: 14, fontWeight: '500', marginBottom: 24 },

    tabsBar: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
    tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11 },
    tabLabel: { fontSize: 13, fontWeight: '600' },

    inputBox: { borderRadius: 16, borderWidth: 1, marginBottom: 12 },
    input: { fontSize: 16, padding: 16 },

    qrArea: { alignItems: 'center', justifyContent: 'center', minHeight: 260, marginVertical: 24 },
    emptyQr: { alignItems: 'center', justifyContent: 'center', width: 230, height: 230, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', gap: 14 },
    emptyQrText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
    qrCard: { padding: 20, borderRadius: 24, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },

    actions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 'auto', paddingTop: 8, flexWrap: 'wrap' },
    actionTouch: { alignSelf: 'center' },
    actionPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: 20, borderRadius: 40, borderWidth: 1.5 },
    actionLabel: { fontSize: 13, fontWeight: '700' },

    // WiFi encryption selector
    encryptionBar: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
    encryptionPill: { flex: 1, alignItems: 'center', paddingVertical: 10 },
    encryptionLabel: { fontSize: 13, fontWeight: '600' },
});
