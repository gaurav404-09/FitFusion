// Settings Screen
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, Alert, Switch, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { COLORS, SPACING, FONT_SIZES, FONTS, BORDER_RADIUS } from '../../theme';
import { Header, AnimatedButton } from '../../components/common';
import { useAuth } from '../../services/AuthContext';
import db from '../../services/database';

export default function SettingsScreen({ navigation }) {
    const { logout, user, updateProfile } = useAuth();
    const [notifications, setNotifications] = useState(true);
    const [mealReminders, setMealReminders] = useState(true);
    const [activityReminders, setActivityReminders] = useState(true);
    const [dataSharing, setDataSharing] = useState(true);
    const [occupation, setOccupation] = useState('Student');
    const [workMode, setWorkMode] = useState('Onsite');
    const [weight, setWeight] = useState(user?.weight?.toString() || '');
    const [profileLoaded, setProfileLoaded] = useState(false);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const raw = await AsyncStorage.getItem('@wellness_profile');
                if (!mounted) return;
                if (raw) {
                    const p = JSON.parse(raw);
                    setOccupation(p?.occupation || 'Student');
                    setWorkMode(p?.workMode || 'Onsite');
                    if (p?.weight) setWeight(p.weight);
                }
            } finally {
                if (mounted) setProfileLoaded(true);
            }
        })();
        return () => { mounted = false; };
    }, []);

    async function saveWellnessProfile() {
        const parsedWeight = parseFloat(weight);
        if (isNaN(parsedWeight) && weight !== '') {
            Alert.alert('Invalid Weight', 'Please enter a valid number for weight.');
            return;
        }

        try {
            setProfileLoaded(false);
            // Save locally for mental wellness features
            await AsyncStorage.setItem('@wellness_profile', JSON.stringify({ occupation, workMode, weight }));

            // Sync with Supabase for persistent profile
            if (user?.id) {
                await updateProfile({ weight: parsedWeight || null });
            }
            Alert.alert('Saved', 'Wellness profile updated.');
        } catch (e) {
            console.error('Save profile error:', e);
            Alert.alert('Error', 'Failed to save profile.');
        } finally {
            setProfileLoaded(true);
        }
    }

    function handleLogout() {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: logout },
        ]);
    }

    function handleClearData() {
        Alert.alert(
            'Clear All Data',
            'This will delete all your local data. This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear', style: 'destructive', onPress: async () => {
                        await db.clearAll();
                        logout();
                    }
                },
            ]
        );
    }

    return (
        <View style={styles.container}>
            <Header title="Settings" onBack={() => navigation.goBack()} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                {/* Notifications */}
                <Text style={styles.sectionTitle}>Notifications</Text>
                <View style={styles.settingsCard}>
                    <SettingRow label="Push Notifications" icon="🔔" value={notifications} onToggle={setNotifications} />
                    <SettingRow label="Meal Reminders" icon="🍽️" value={mealReminders} onToggle={setMealReminders} />
                    <SettingRow label="Activity Reminders" icon="⏰" value={activityReminders} onToggle={setActivityReminders} />
                </View>

                {/* Privacy */}
                <Text style={styles.sectionTitle}>Privacy & Security</Text>
                <View style={styles.settingsCard}>
                    <SettingRow label="Share Anonymized Data" icon="📊" value={dataSharing} onToggle={setDataSharing} />
                    <View style={styles.infoRow}>
                        <Text style={styles.infoIcon}>🔒</Text>
                        <View style={styles.infoText}>
                            <Text style={styles.infoLabel}>Data Encryption</Text>
                            <Text style={styles.infoDesc}>Your data is stored securely on-device</Text>
                        </View>
                        <View style={styles.activeBadge}>
                            <Text style={styles.activeBadgeText}>Active</Text>
                        </View>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoIcon}>🛡️</Text>
                        <View style={styles.infoText}>
                            <Text style={styles.infoLabel}>Authentication</Text>
                            <Text style={styles.infoDesc}>Secured with token-based auth</Text>
                        </View>
                        <View style={styles.activeBadge}>
                            <Text style={styles.activeBadgeText}>Active</Text>
                        </View>
                    </View>
                </View>

                {/* Goals */}
                <Text style={styles.sectionTitle}>Daily Goals</Text>
                <View style={styles.settingsCard}>
                    <View style={styles.goalRow}>
                        <Text style={styles.goalIcon}>🔥</Text>
                        <Text style={styles.goalLabel}>Daily Calorie Goal</Text>
                        <Text style={styles.goalValue}>2000 kcal</Text>
                    </View>
                    <View style={styles.goalRow}>
                        <Text style={styles.goalIcon}>⚡</Text>
                        <Text style={styles.goalLabel}>Activity Goal</Text>
                        <Text style={styles.goalValue}>45 min</Text>
                    </View>
                    <View style={styles.goalRow}>
                        <Text style={styles.goalIcon}>💧</Text>
                        <Text style={styles.goalLabel}>Water Intake</Text>
                        <Text style={styles.goalValue}>8 glasses</Text>
                    </View>
                </View>

                {/* Wellness Profile */}
                <Text style={styles.sectionTitle}>Wellness Profile</Text>
                <View style={styles.settingsCard}>
                    <Text style={styles.pickerLabel}>Occupation</Text>
                    <View style={styles.pickerWrap}>
                        <Picker selectedValue={occupation} onValueChange={setOccupation}>
                            <Picker.Item label="Student" value="Student" />
                            <Picker.Item label="Corporate" value="Corporate" />
                            <Picker.Item label="Freelancer" value="Freelancer" />
                            <Picker.Item label="Other" value="Other" />
                        </Picker>
                    </View>
                    <Text style={[styles.pickerLabel, { marginTop: SPACING.md }]}>Work Mode</Text>
                    <View style={styles.pickerWrap}>
                        <Picker selectedValue={workMode} onValueChange={setWorkMode}>
                            <Picker.Item label="Onsite" value="Onsite" />
                            <Picker.Item label="Remote" value="Remote" />
                            <Picker.Item label="Hybrid" value="Hybrid" />
                        </Picker>
                    </View>

                    <Text style={[styles.pickerLabel, { marginTop: SPACING.md }]}>Weight (kg)</Text>
                    <View style={styles.pickerWrap}>
                        <TextInput
                            style={styles.weightInput}
                            value={weight}
                            onChangeText={setWeight}
                            placeholder="e.g. 70"
                            placeholderTextColor={COLORS.textMuted}
                            keyboardType="numeric"
                        />
                    </View>
                    <AnimatedButton
                        title="Save Wellness Profile"
                        onPress={saveWellnessProfile}
                        style={{ marginTop: SPACING.lg }}
                        disabled={!profileLoaded}
                    />
                </View>

                {/* About */}
                <Text style={styles.sectionTitle}>About</Text>
                <View style={styles.settingsCard}>
                    <View style={styles.aboutRow}>
                        <Text style={styles.aboutLabel}>App Version</Text>
                        <Text style={styles.aboutValue}>1.0.0</Text>
                    </View>
                    <View style={styles.aboutRow}>
                        <Text style={styles.aboutLabel}>Account</Text>
                        <Text style={styles.aboutValue}>{user?.email}</Text>
                    </View>
                    <View style={styles.aboutRow}>
                        <Text style={styles.aboutLabel}>Role</Text>
                        <Text style={styles.aboutValue}>{user?.role}</Text>
                    </View>
                </View>

                {/* Danger Zone */}
                <Text style={[styles.sectionTitle, { color: COLORS.error }]}>Danger Zone</Text>
                <View style={[styles.settingsCard, { borderColor: COLORS.error + '33' }]}>
                    <TouchableOpacity style={styles.dangerRow} onPress={handleClearData}>
                        <Text style={styles.dangerIcon}>🗑️</Text>
                        <Text style={styles.dangerText}>Clear All Local Data</Text>
                    </TouchableOpacity>
                </View>

                <AnimatedButton
                    title="Logout"
                    onPress={handleLogout}
                    gradient={[COLORS.error, '#B91C1C']}
                    icon="👋"
                    style={{ marginHorizontal: SPACING.lg, marginTop: SPACING.xxl }}
                />

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

function SettingRow({ label, icon, value, onToggle }) {
    return (
        <View style={settingStyles.row}>
            <Text style={settingStyles.icon}>{icon}</Text>
            <Text style={settingStyles.label}>{label}</Text>
            <Switch
                value={value}
                onValueChange={onToggle}
                trackColor={{ false: COLORS.surfaceLight, true: COLORS.primary + '44' }}
                thumbColor={value ? COLORS.primary : COLORS.textMuted}
            />
        </View>
    );
}

const settingStyles = StyleSheet.create({
    row: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.glassBorder,
    },
    icon: { fontSize: 18, marginRight: SPACING.md },
    label: { flex: 1, color: COLORS.text, fontSize: FONT_SIZES.md },
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, paddingTop: Platform.OS === 'ios' ? 50 : 30 },
    content: { paddingBottom: SPACING.huge },
    sectionTitle: {
        fontSize: FONT_SIZES.sm, ...FONTS.bold, color: COLORS.textSecondary, textTransform: 'uppercase',
        paddingHorizontal: SPACING.lg, marginTop: SPACING.xxl, marginBottom: SPACING.md,
    },
    settingsCard: {
        marginHorizontal: SPACING.lg, backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg,
        borderWidth: 1, borderColor: COLORS.glassBorder,
    },
    infoRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.glassBorder,
    },
    infoIcon: { fontSize: 18, marginRight: SPACING.md },
    infoText: { flex: 1 },
    infoLabel: { color: COLORS.text, fontSize: FONT_SIZES.md },
    infoDesc: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: 2 },
    activeBadge: {
        backgroundColor: COLORS.success + '22', paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.round,
    },
    activeBadgeText: { color: COLORS.success, fontSize: FONT_SIZES.xs, ...FONTS.semiBold },
    goalRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.glassBorder,
    },
    goalIcon: { fontSize: 18, marginRight: SPACING.md },
    goalLabel: { flex: 1, color: COLORS.text, fontSize: FONT_SIZES.md },
    goalValue: { color: COLORS.primary, fontSize: FONT_SIZES.md, ...FONTS.bold },
    aboutRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.glassBorder,
    },
    aboutLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZES.md },
    aboutValue: { color: COLORS.text, fontSize: FONT_SIZES.md, ...FONTS.medium },
    dangerRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md,
    },
    dangerIcon: { fontSize: 18, marginRight: SPACING.md },
    dangerText: { color: COLORS.error, fontSize: FONT_SIZES.md, ...FONTS.medium },
    pickerLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm, ...FONTS.semiBold, marginBottom: SPACING.xs },
    pickerWrap: { borderWidth: 1, borderColor: COLORS.glassBorder, borderRadius: BORDER_RADIUS.md, overflow: 'hidden', backgroundColor: COLORS.surfaceLight },
    weightInput: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        fontSize: FONT_SIZES.md,
        color: COLORS.text,
        ...FONTS.medium,
    },
});
