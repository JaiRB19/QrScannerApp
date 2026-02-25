import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet, Text, View, TouchableOpacity,
    Dimensions, Animated, Linking, Modal, Share,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { saveScan } from '../utils/storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from '../utils/haptics';
import * as ExpoClipboard from 'expo-clipboard';

type ScannerScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Scanner'>;
type Props = { navigation: ScannerScreenNavigationProp };

const { width, height } = Dimensions.get('window');
const FRAME_SIZE = width * 0.65;
const PANEL_HEIGHT = 320;

export default function ScannerScreen({ navigation }: Props) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    const [permission, requestPermission] = useCameraPermissions();
    const [torchOn, setTorchOn] = useState(false);
    const [scanned, setScanned] = useState(false);
    const [scannedData, setScannedData] = useState('');
    const [modalVisible, setModalVisible] = useState(false);

    // Animated scan line
    const lineAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(lineAnim, { toValue: FRAME_SIZE - 4, duration: 1800, useNativeDriver: true }),
                Animated.timing(lineAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    const handleBarcodeScanned = async ({ data }: { type: string; data: string }) => {
        if (scanned) return;
        setScanned(true);
        setScannedData(data);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await saveScan(data);
        setModalVisible(true);
    };

    const closeScannerModal = () => {
        setModalVisible(false);
        setTimeout(() => setScanned(false), 400);
    };

    const isURL = scannedData.startsWith('http') || scannedData.startsWith('www') || scannedData.startsWith('https');

    const handleOpenURL = async () => {
        const url = scannedData.startsWith('http') ? scannedData : `https://${scannedData}`;
        if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    };

    const handleCopy = async () => {
        await ExpoClipboard.setStringAsync(scannedData);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleShare = async () => {
        await Share.share({ message: scannedData });
    };

    if (!permission) return <View style={[styles.container, { backgroundColor: colors.background }]} />;

    if (!permission.granted) {
        return (
            <View style={[styles.container, styles.permCenter, { backgroundColor: colors.background }]}>
                <View style={[styles.permCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.permIconBox, { backgroundColor: colors.primary + '18' }]}>
                        <Ionicons name="camera-outline" size={36} color={colors.primary} />
                    </View>
                    <Text style={[styles.permTitle, { color: colors.text }]}>Acceso a Cámara</Text>
                    <Text style={[styles.permMsg, { color: colors.subtext }]}>
                        Necesitamos permiso para usar tu cámara y escanear códigos QR.
                    </Text>
                    <TouchableOpacity style={[styles.permBtn, { backgroundColor: colors.primary }]} onPress={requestPermission}>
                        <Text style={[styles.permBtnTxt, { color: colors.primaryText }]}>Otorgar Permiso</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.permBtn, { backgroundColor: colors.border, marginTop: 10 }]} onPress={() => navigation.goBack()}>
                        <Text style={[styles.permBtnTxt, { color: colors.text }]}>← Volver</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const cameraHeight = height - PANEL_HEIGHT - insets.bottom;

    return (
        <View style={[styles.container, { backgroundColor: '#000' }]}>

            {/* ── CAMERA SECTION ── */}
            <View style={{ height: cameraHeight, overflow: 'hidden' }}>
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    facing="back"
                    enableTorch={torchOn}
                    onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                />

                {/* Top bar */}
                <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                        <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.cameraTitle}>Escanear QR</Text>
                    <TouchableOpacity onPress={() => setTorchOn(v => !v)} style={styles.iconBtn}>
                        <Ionicons name={torchOn ? 'flash' : 'flash-outline'} size={22} color={torchOn ? '#FCD34D' : '#fff'} />
                    </TouchableOpacity>
                </View>

                {/* Frame masks */}
                <View style={StyleSheet.absoluteFillObject}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.52)' }} />
                    <View style={{ flexDirection: 'row', height: FRAME_SIZE }}>
                        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.52)' }} />
                        <View style={{ width: FRAME_SIZE, height: FRAME_SIZE, overflow: 'hidden' }}>
                            <View style={[styles.corner, styles.cTL, { borderColor: colors.primary }]} />
                            <View style={[styles.corner, styles.cTR, { borderColor: colors.primary }]} />
                            <View style={[styles.corner, styles.cBL, { borderColor: colors.primary }]} />
                            <View style={[styles.corner, styles.cBR, { borderColor: colors.primary }]} />
                            <Animated.View
                                style={[styles.scanLine, { backgroundColor: colors.primary, transform: [{ translateY: lineAnim }] }]}
                            />
                        </View>
                        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.52)' }} />
                    </View>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.52)' }} />
                </View>
            </View>

            {/* ── BOTTOM PANEL (fijo, sin swipe) ── */}
            <View style={[styles.bottomPanel, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: insets.bottom + 16 }]}>
                <View style={[styles.handle, { backgroundColor: colors.border }]} />

                <View style={[styles.statusDot, { backgroundColor: scanned ? colors.primary : colors.border }]} />
                <Text style={[styles.panelTitle, { color: colors.text }]}>
                    {scanned ? '¡Código detectado!' : 'Listo para escanear'}
                </Text>
                <Text style={[styles.panelSubtitle, { color: colors.subtext }]}>
                    {scanned ? 'Revisa el resultado.' : 'Centra el código QR dentro del cuadro morado.'}
                </Text>

                {/* Tips */}
                <View style={styles.tipsRow}>
                    {[
                        { icon: 'sunny-outline', label: 'Buena luz' },
                        { icon: 'expand-outline', label: 'Encuadra' },
                        { icon: 'hand-right-outline', label: 'Sin vibrar' },
                    ].map(({ icon, label }) => (
                        <View key={label} style={[styles.tipItem, { backgroundColor: colors.primary + '14', borderRadius: 14, padding: 12 }]}>
                            <Ionicons name={icon as any} size={22} color={colors.primary} />
                            <Text style={[styles.tipText, { color: colors.text }]}>{label}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* ── RESULT BOTTOM SHEET ── */}
            <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeScannerModal}>
                <View style={styles.resultBackdrop}>
                    <View style={[styles.resultSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.handle, { backgroundColor: colors.border, alignSelf: 'center', marginBottom: 8 }]} />

                        <View style={[styles.resultIconBox, { backgroundColor: colors.primary + '18' }]}>
                            <Ionicons name="checkmark-circle" size={36} color={colors.primary} />
                        </View>

                        <Text style={[styles.resultTitle, { color: colors.text }]}>¡Código Escaneado!</Text>

                        <View style={[styles.resultDataBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <Text style={[styles.resultData, { color: colors.text }]} selectable numberOfLines={3}>
                                {scannedData}
                            </Text>
                        </View>

                        <View style={styles.actionsGrid}>
                            {isURL && (
                                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={handleOpenURL}>
                                    <Ionicons name="open-outline" size={20} color={colors.primaryText} />
                                    <Text style={[styles.actionBtnText, { color: colors.primaryText }]}>Abrir URL</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]} onPress={handleCopy}>
                                <Ionicons name="copy-outline" size={20} color={colors.text} />
                                <Text style={[styles.actionBtnText, { color: colors.text }]}>Copiar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]} onPress={handleShare}>
                                <Ionicons name="share-social-outline" size={20} color={colors.text} />
                                <Text style={[styles.actionBtnText, { color: colors.text }]}>Compartir</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={[styles.newScanBtn, { borderColor: colors.border }]} onPress={closeScannerModal}>
                            <Ionicons name="scan-outline" size={18} color={colors.subtext} />
                            <Text style={[styles.newScanText, { color: colors.subtext }]}>Escanear Nuevo</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    permCenter: { justifyContent: 'center', alignItems: 'center', padding: 24 },
    permCard: { width: '100%', borderRadius: 28, borderWidth: 1, padding: 28, alignItems: 'center', gap: 10 },
    permIconBox: { width: 68, height: 68, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    permTitle: { fontSize: 22, fontWeight: '800' },
    permMsg: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
    permBtn: { width: '100%', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
    permBtnTxt: { fontSize: 15, fontWeight: '700' },

    topBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, zIndex: 20,
    },
    iconBtn: {
        width: 42, height: 42, borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.48)',
        alignItems: 'center', justifyContent: 'center',
    },
    cameraTitle: {
        color: '#fff', fontSize: 17, fontWeight: '700',
        textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
    },

    corner: { position: 'absolute', width: 24, height: 24, borderWidth: 3.5 },
    cTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
    cTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
    cBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
    cBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
    scanLine: { position: 'absolute', left: 0, right: 0, height: 2.5, borderRadius: 2, opacity: 0.85 },

    bottomPanel: {
        height: PANEL_HEIGHT,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
        paddingHorizontal: 28, paddingTop: 16,
        alignItems: 'center', gap: 10,
    },
    handle: { width: 44, height: 5, borderRadius: 3 },
    statusDot: { width: 12, height: 12, borderRadius: 6 },
    panelTitle: { fontSize: 20, fontWeight: '800' },
    panelSubtitle: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20 },
    tipsRow: { flexDirection: 'row', gap: 10, marginTop: 8, width: '100%' },
    tipItem: { alignItems: 'center', gap: 8, flex: 1 },
    tipText: { fontSize: 12, fontWeight: '600' },

    resultBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
    resultSheet: {
        borderTopLeftRadius: 32, borderTopRightRadius: 32,
        borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
        padding: 24, paddingBottom: 36, alignItems: 'center', gap: 14,
    },
    resultIconBox: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    resultTitle: { fontSize: 22, fontWeight: '800' },
    resultDataBox: { width: '100%', padding: 16, borderRadius: 14, borderWidth: 1 },
    resultData: { fontSize: 14, fontWeight: '500', lineHeight: 22 },

    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, width: '100%', justifyContent: 'center' },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: 22, borderRadius: 14 },
    actionBtnText: { fontSize: 14, fontWeight: '700' },
    newScanBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14, borderWidth: 1, marginTop: 4 },
    newScanText: { fontSize: 14, fontWeight: '600' },
});
