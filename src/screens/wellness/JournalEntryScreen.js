// Journal Entry Screen (create/view)
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Alert, TextInput, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, FONT_SIZES, FONTS, BORDER_RADIUS, MOOD_EMOJIS } from '../../theme';
import { Header, AnimatedButton } from '../../components/common';
import { useAuth } from '../../services/AuthContext';
import db from '../../services/database';
import { format } from 'date-fns';
import SyncService from '../../services/SyncService';

export default function JournalEntryScreen({ navigation, route }) {
    const { user } = useAuth();
    const existingJournal = route.params?.journal;
    const [title, setTitle] = useState(existingJournal?.title || '');
    const [body, setBody] = useState(existingJournal?.body || '');
    const [mood, setMood] = useState(existingJournal?.mood || 3);
    const [saving, setSaving] = useState(false);
    const isViewing = !!existingJournal;

    async function handleSave() {
        if (!title.trim() || !body.trim()) {
            Alert.alert('Error', 'Please enter title and content');
            return;
        }
        setSaving(true);
        try {
            if (existingJournal?.id) {
                await db.updateJournal(existingJournal.id, { title, body, mood });
            } else {
                await db.addJournal({
                    userId: user.id,
                    title,
                    body,
                    mood,
                    date: format(new Date(), 'yyyy-MM-dd'),
                });
            }
            // Check for new achievements (like Night Owl)
            await SyncService.runAchievementCheck(user?.id);

            Alert.alert('Saved! ✨', '', [{ text: 'OK', onPress: () => navigation.goBack() }]);
        } catch (e) {
            Alert.alert('Error', 'Failed to save journal entry');
        }
        setSaving(false);
    }

    return (
        <View style={styles.container}>
            <Header
                title={isViewing ? 'Journal Entry' : 'New Entry'}
                subtitle={isViewing ? existingJournal.date : format(new Date(), 'MMM dd, yyyy')}
                onBack={() => navigation.goBack()}
            />
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                {/* Mood */}
                <Text style={styles.label}>How do you feel?</Text>
                <View style={styles.moodRow}>
                    {MOOD_EMOJIS.map((m) => (
                        <TouchableOpacity
                            key={m.value}
                            style={[styles.moodBtn, mood === m.value && { backgroundColor: m.color + '22', borderColor: m.color }]}
                            onPress={() => setMood(m.value)}
                        >
                            <Text style={{ fontSize: 24 }}>{m.emoji}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Title */}
                <TextInput
                    style={styles.titleInput}
                    placeholder="Entry title..."
                    placeholderTextColor={COLORS.textMuted}
                    value={title}
                    onChangeText={setTitle}
                />

                {/* Body */}
                <TextInput
                    style={styles.bodyInput}
                    placeholder="Write your thoughts..."
                    placeholderTextColor={COLORS.textMuted}
                    value={body}
                    onChangeText={setBody}
                    multiline
                    textAlignVertical="top"
                />

                <AnimatedButton
                    title={saving ? "Saving..." : (isViewing ? "Update Entry" : "Save Entry")}
                    onPress={handleSave}
                    disabled={saving}
                    icon="📝"
                    style={{ marginTop: SPACING.xxl }}
                />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, paddingTop: Platform.OS === 'ios' ? 50 : 30 },
    content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.huge },
    label: { fontSize: FONT_SIZES.sm, ...FONTS.semiBold, color: COLORS.textSecondary, marginTop: SPACING.lg, marginBottom: SPACING.md },
    moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
    moodBtn: {
        padding: SPACING.md, borderRadius: BORDER_RADIUS.md,
        borderWidth: 2, borderColor: 'transparent',
    },
    titleInput: {
        color: COLORS.text, fontSize: FONT_SIZES.xxl, ...FONTS.bold,
        paddingVertical: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.glassBorder,
        marginTop: SPACING.xl,
    },
    bodyInput: {
        color: COLORS.text, fontSize: FONT_SIZES.md, lineHeight: 24,
        paddingVertical: SPACING.lg, minHeight: 200,
    },
});
