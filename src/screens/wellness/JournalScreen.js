// Journal Screen
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { COLORS, SPACING, FONT_SIZES, FONTS, BORDER_RADIUS, MOOD_EMOJIS } from '../../theme';
import { Header, AnimatedButton, EmptyState } from '../../components/common';
import { useAuth } from '../../services/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import db from '../../services/database';

export default function JournalScreen({ navigation }) {
    const { user } = useAuth();
    const [journals, setJournals] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        if (!user) return;
        const j = await db.getJournals(user.id);
        setJournals(j.sort((a, b) => b.date.localeCompare(a.date)));
    }, [user]);

    useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);

    async function deleteJournal(id) {
        Alert.alert('Delete Entry', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    await db.deleteJournal(id);
                    loadData();
                }
            },
        ]);
    }

    return (
        <View style={styles.container}>
            <Header
                title="Journal"
                subtitle={`${journals.length} entries`}
                onBack={() => navigation.goBack()}
                rightAction={
                    <AnimatedButton title="+ New" onPress={() => navigation.navigate('JournalEntry', {})} style={styles.newBtn} />
                }
            />
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            >
                {journals.length === 0 ? (
                    <EmptyState
                        icon="📝"
                        title="No journal entries"
                        message="Start writing to reflect on your wellness journey"
                        action={() => navigation.navigate('JournalEntry', {})}
                        actionLabel="Write First Entry"
                    />
                ) : (
                    journals.map((j, i) => (
                        <TouchableOpacity
                            key={j.id || i}
                            style={styles.journalCard}
                            onPress={() => navigation.navigate('JournalEntry', { journal: j })}
                            onLongPress={() => deleteJournal(j.id)}
                        >
                            <View style={styles.journalHeader}>
                                <Text style={styles.journalTitle}>{j.title}</Text>
                                {j.mood && <Text style={styles.journalMood}>{MOOD_EMOJIS[5 - j.mood]?.emoji}</Text>}
                            </View>
                            <Text style={styles.journalDate}>{j.date}</Text>
                            <Text style={styles.journalBody} numberOfLines={3}>{j.body}</Text>
                        </TouchableOpacity>
                    ))
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, paddingTop: Platform.OS === 'ios' ? 50 : 30 },
    content: { paddingBottom: SPACING.huge },
    newBtn: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md },
    journalCard: {
        marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
        backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.glassBorder,
    },
    journalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    journalTitle: { color: COLORS.text, fontSize: FONT_SIZES.lg, ...FONTS.semiBold, flex: 1 },
    journalMood: { fontSize: 20, marginLeft: SPACING.sm },
    journalDate: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: SPACING.xs },
    journalBody: { color: COLORS.textSecondary, fontSize: FONT_SIZES.md, marginTop: SPACING.md, lineHeight: 22 },
});
