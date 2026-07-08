// Mood Log Screen
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, FONTS, BORDER_RADIUS, MOOD_EMOJIS } from '../../theme';
import { Header, AnimatedButton } from '../../components/common';
import { useAuth } from '../../services/AuthContext';
import db from '../../services/database';
import { format } from 'date-fns';

export default function MoodLogScreen({ navigation }) {
    const { user } = useAuth();
    const [selectedMood, setSelectedMood] = useState(null);
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    const quickNotes = [
        'Feeling energetic!', 'Stressed about exams', 'Had a great workout',
        'Tired but productive', 'Grateful for friends', 'Need more sleep',
        'Excited about weekend', 'Calm and peaceful',
    ];

    async function handleSave() {
        if (selectedMood === null) {
            Alert.alert('Select Mood', 'How are you feeling?');
            return;
        }
        setSaving(true);
        try {
            await db.addMoodLog({
                userId: user.id,
                date: format(new Date(), 'yyyy-MM-dd'),
                mood: selectedMood,
                note,
                time: format(new Date(), 'HH:mm'),
            });
            Alert.alert('Mood Logged! ✨', 'Keep tracking your feelings', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (e) {
            Alert.alert('Error', 'Failed to log mood');
        }
        setSaving(false);
    }

    return (
        <View style={styles.container}>
            <Header title="How are you feeling?" onBack={() => navigation.goBack()} />
            <ScrollView contentContainerStyle={styles.content}>
                {/* Mood Picker */}
                <View style={styles.moodPicker}>
                    {MOOD_EMOJIS.map((mood) => (
                        <TouchableOpacity
                            key={mood.value}
                            style={[
                                styles.moodOption,
                                selectedMood === mood.value && { backgroundColor: mood.color + '22', borderColor: mood.color },
                            ]}
                            onPress={() => setSelectedMood(mood.value)}
                        >
                            <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                            <Text style={[styles.moodLabel, selectedMood === mood.value && { color: mood.color }]}>{mood.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Selected mood display */}
                {selectedMood && (
                    <View style={styles.selectedDisplay}>
                        <Text style={styles.selectedEmoji}>{MOOD_EMOJIS[5 - selectedMood]?.emoji}</Text>
                        <Text style={[styles.selectedText, { color: MOOD_EMOJIS[5 - selectedMood]?.color }]}>
                            {MOOD_EMOJIS[5 - selectedMood]?.label}
                        </Text>
                    </View>
                )}

                {/* Note */}
                <Text style={styles.label}>Add a note (optional)</Text>
                <TextInput
                    style={styles.noteInput}
                    multiline
                    placeholder="What's on your mind?"
                    placeholderTextColor={COLORS.textMuted}
                    value={note}
                    onChangeText={setNote}
                />

                {/* Quick notes */}
                <Text style={styles.label}>Quick notes</Text>
                <View style={styles.quickNotes}>
                    {quickNotes.map((qn, i) => (
                        <TouchableOpacity
                            key={i}
                            style={[styles.quickNote, note === qn && styles.quickNoteActive]}
                            onPress={() => setNote(qn)}
                        >
                            <Text style={[styles.quickNoteText, note === qn && styles.quickNoteTextActive]}>{qn}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <AnimatedButton
                    title={saving ? "Saving..." : "Log Mood"}
                    onPress={handleSave}
                    disabled={saving}
                    icon="✨"
                    gradient={selectedMood ? [MOOD_EMOJIS[5 - selectedMood]?.color || COLORS.primary, COLORS.primary] : COLORS.gradientPrimary}
                    style={{ marginTop: SPACING.xxl }}
                />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, paddingTop: Platform.OS === 'ios' ? 50 : 30 },
    content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.huge },
    moodPicker: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.xxl },
    moodOption: {
        alignItems: 'center', paddingVertical: SPACING.lg, paddingHorizontal: SPACING.md,
        borderRadius: BORDER_RADIUS.lg, borderWidth: 2, borderColor: 'transparent', flex: 1, marginHorizontal: 2,
    },
    moodEmoji: { fontSize: 36 },
    moodLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs, ...FONTS.medium, marginTop: SPACING.sm },
    selectedDisplay: { alignItems: 'center', marginTop: SPACING.xxl },
    selectedEmoji: { fontSize: 64 },
    selectedText: { fontSize: FONT_SIZES.xxl, ...FONTS.bold, marginTop: SPACING.md },
    label: { fontSize: FONT_SIZES.sm, ...FONTS.semiBold, color: COLORS.textSecondary, marginTop: SPACING.xxl, marginBottom: SPACING.md },
    noteInput: {
        backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md,
        padding: SPACING.lg, color: COLORS.text, fontSize: FONT_SIZES.md,
        borderWidth: 1, borderColor: COLORS.glassBorder, minHeight: 100, textAlignVertical: 'top',
    },
    quickNotes: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    quickNote: {
        paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.round, backgroundColor: COLORS.surface,
        borderWidth: 1, borderColor: COLORS.glassBorder,
    },
    quickNoteActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    quickNoteText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },
    quickNoteTextActive: { color: COLORS.text },
});
