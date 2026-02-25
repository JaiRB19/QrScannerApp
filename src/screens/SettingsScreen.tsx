import React, { useEffect, useRef } from 'react';
import {
    StyleSheet, Text, View, Switch, TouchableOpacity,
    Alert, Animated, Easing, ScrollView, Linking,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from '../utils/haptics';
import { useTheme } from '../context/ThemeContext';
import { clearHistory } from '../utils/storage';
import NexusLogo from '../components/NexusLogo';

type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;
type Props = { navigation: SettingsScreenNavigationProp };

export default function SettingsScreen({ navigation }: Props) {
    const { theme, colors, toggleTheme, hapticsEnabled, toggleHaptics } = useTheme();
    const isDark = theme === 'dark';

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateYAnim = useRef(new Animated.Value(24)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.exp) }),
            Animated.timing(translateYAnim, { toValue: 0, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.exp) }),
        ]).start();
    }, []);

    const handleToggle = async () => { await Haptics.selectionAsync(); toggleTheme(); };
    const handleToggleHaptics = async () => { toggleHaptics(); };

    const handleClearHistory = () => {
        Alert.alert(
            'Borrar Historial',
            '¿Estás seguro? Esta acción no se puede deshacer.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Borrar Todo', style: 'destructive',
                    onPress: async () => {
                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        await clearHistory();
                    },
                },
            ]
        );
    };

    const openLink = async (url: string) => {
        try {
            await Haptics.selectionAsync();
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert('Error', 'No se puede abrir este enlace');
            }
        } catch (error) {
            console.error('Error opening link:', error);
        }
    };

    const cardShadow = {
        shadowColor: colors.shadow,
        shadowOpacity: colors.shadowOpacity,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 2,
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            <Animated.ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
                style={{ opacity: fadeAnim, transform: [{ translateY: translateYAnim }] }}
            >

                {/* Header */}
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <View style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border, ...cardShadow }]}>
                            <Ionicons name="arrow-back" size={20} color={colors.icon} />
                            <Text style={[styles.backBtnText, { color: colors.text }]}>Volver</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <Text style={[styles.title, { color: colors.text }]}>Configuración</Text>
                <Text style={[styles.subtitle, { color: colors.subtext }]}>Personaliza tu experiencia</Text>

                {/* Appearance section */}
                <Text style={[styles.sectionLabel, { color: colors.subtext }]}>APARIENCIA</Text>
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, ...cardShadow }]}>
                    {/* Theme toggle */}
                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconBox, { backgroundColor: colors.primary + '18' }]}>
                                <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={20} color={colors.primary} />
                            </View>
                            <View>
                                <Text style={[styles.rowTitle, { color: colors.text }]}>{isDark ? 'Modo Oscuro' : 'Modo Claro'}</Text>
                                <Text style={[styles.rowSubtitle, { color: colors.subtext }]}>{isDark ? 'Estilo Premium Dark' : 'Estilo Bento Blanco'}</Text>
                            </View>
                        </View>
                        <Switch
                            value={isDark}
                            onValueChange={handleToggle}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.card}
                        />
                    </View>

                    {/* Divider */}
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    {/* Haptics toggle */}
                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconBox, { backgroundColor: colors.primary + '18' }]}>
                                <Ionicons name="phone-portrait-outline" size={20} color={colors.primary} />
                            </View>
                            <View>
                                <Text style={[styles.rowTitle, { color: colors.text }]}>Vibración</Text>
                                <Text style={[styles.rowSubtitle, { color: colors.subtext }]}>{hapticsEnabled ? 'Activada' : 'Desactivada'}</Text>
                            </View>
                        </View>
                        <Switch
                            value={hapticsEnabled}
                            onValueChange={handleToggleHaptics}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.card}
                        />
                    </View>
                </View>

                {/* Legal section */}
                <Text style={[styles.sectionLabel, { color: colors.subtext, marginTop: 28 }]}>LEGAL</Text>
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, ...cardShadow }]}>
                    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => openLink('https://example.com/privacy')}>
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconBox, { backgroundColor: colors.primary + '18' }]}>
                                <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                            </View>
                            <View>
                                <Text style={[styles.rowTitle, { color: colors.text }]}>Política de Privacidad</Text>
                                <Text style={[styles.rowSubtitle, { color: colors.subtext }]}>Cómo protegemos tus datos</Text>
                            </View>
                        </View>
                        <Ionicons name="open-outline" size={18} color={colors.subtext} />
                    </TouchableOpacity>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => openLink('https://example.com/terms')}>
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconBox, { backgroundColor: colors.primary + '18' }]}>
                                <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                            </View>
                            <View>
                                <Text style={[styles.rowTitle, { color: colors.text }]}>Términos de Servicio</Text>
                                <Text style={[styles.rowSubtitle, { color: colors.subtext }]}>Condiciones de uso</Text>
                            </View>
                        </View>
                        <Ionicons name="open-outline" size={18} color={colors.subtext} />
                    </TouchableOpacity>
                </View>

                {/* Support section */}
                <Text style={[styles.sectionLabel, { color: colors.subtext, marginTop: 28 }]}>SOPORTE</Text>
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, ...cardShadow }]}>
                    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => openLink('https://example.com/rate')}>
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconBox, { backgroundColor: colors.primary + '18' }]}>
                                <Ionicons name="star-outline" size={20} color={colors.primary} />
                            </View>
                            <View>
                                <Text style={[styles.rowTitle, { color: colors.text }]}>Calificar App</Text>
                                <Text style={[styles.rowSubtitle, { color: colors.subtext }]}>¡Danos 5 estrellas!</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
                    </TouchableOpacity>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => openLink('mailto:support@example.com')}>
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconBox, { backgroundColor: colors.primary + '18' }]}>
                                <Ionicons name="mail-outline" size={20} color={colors.primary} />
                            </View>
                            <View>
                                <Text style={[styles.rowTitle, { color: colors.text }]}>Soporte y Ayuda</Text>
                                <Text style={[styles.rowSubtitle, { color: colors.subtext }]}>Contáctanos directamente</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
                    </TouchableOpacity>
                </View>

                {/* Data section */}
                <Text style={[styles.sectionLabel, { color: colors.subtext, marginTop: 28 }]}>DATOS</Text>
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, ...cardShadow }]}>
                    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={handleClearHistory}>
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
                                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                            </View>
                            <View>
                                <Text style={[styles.rowTitle, { color: '#EF4444' }]}>Borrar Historial</Text>
                                <Text style={[styles.rowSubtitle, { color: colors.subtext }]}>Elimina todos los registros</Text>
                            </View>
                        </View>
                        <Ionicons name="trash-outline" size={18} color="#EF4444" style={{ opacity: 0.6 }} />
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <NexusLogo size={40} color={colors.primary} opacity={0.6} />
                    <Text style={[styles.footerText, { color: colors.subtext, marginTop: 12 }]}>QR Nexus · v1.0.0</Text>
                    <Text style={[styles.footerText, { color: colors.subtext }]}>⚡ Developed by Jai</Text>
                </View>

            </Animated.ScrollView>
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
    subtitle: { fontSize: 14, fontWeight: '500', marginBottom: 28 },

    sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, paddingLeft: 2 },

    card: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
    iconBox: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    divider: { height: 1, marginHorizontal: 16 },
    rowTitle: { fontSize: 15, fontWeight: '700', marginBottom: 1 },
    rowSubtitle: { fontSize: 12 },

    footer: { alignItems: 'center', marginTop: 48, gap: 4 },
    footerText: { fontSize: 13, fontWeight: '500' },
});
