/**
 * AIChatInterface — Titan AI Coach Chat
 *
 * Features:
 * 1. Persistent conversation history (survives app close/open via Supabase)
 * 2. Reasoning trace — collapsible "How I processed this" per agent message
 * 3. Conversation history passed to backend on every message for real memory
 */

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, FONTS, BORDER_RADIUS } from '../theme';
import { askAgent, EXAMPLE_QUERIES } from '../services/AgentService';
import {
  loadConversation,
  appendMessage,
  buildHistoryPayload,
  clearConversation,
} from '../services/ConversationService';
import { useAuth } from '../services/AuthContext';
import { useNavigation } from '@react-navigation/native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Reasoning Trace Component ──────────────────────────────────────────────

function ReasoningTrace({ steps }) {
  const [expanded, setExpanded] = useState(false);
  if (!steps || steps.length === 0) return null;

  return (
    <TouchableOpacity
      onPress={() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(e => !e);
      }}
      activeOpacity={0.7}
      style={styles.traceContainer}
    >
      <View style={styles.traceHeader}>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={12}
          color={COLORS.primary}
        />
        <Text style={styles.traceLabel}>
          {expanded ? 'Hide reasoning' : 'How I processed this'}
        </Text>
      </View>
      {expanded && (
        <View style={styles.traceSteps}>
          {steps.map((step, i) => (
            <View key={i} style={styles.traceStep}>
              <View style={styles.traceStepDot} />
              <Text style={styles.traceStepText}>{step}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Message Bubble ──────────────────────────────────────────────────────────

function MessageBubble({ item }) {
  const isUser = item.type === 'user';
  const ts =
    item.timestamp instanceof Date
      ? item.timestamp
      : new Date(item.timestamp);
  const timeStr = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.assistantMessage]}>
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {!isUser && (
          <View style={styles.agentHeader}>
            <Text style={styles.agentName}>Titan AI</Text>
            {item.tool && <Text style={styles.toolUsed}>via {item.tool}</Text>}
          </View>
        )}
        <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
          {item.text}
        </Text>
        <Text style={styles.timestamp}>{timeStr}</Text>
        {!isUser && <ReasoningTrace steps={item.reasoningSteps} />}
      </View>
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AIChatInterface({ onClose }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const flatListRef = useRef(null);

  const close = useMemo(() => {
    if (typeof onClose === 'function') return onClose;
    if (navigation?.canGoBack?.() || navigation?.goBack) return () => navigation.goBack();
    return null;
  }, [navigation, onClose]);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // ── Load persisted history on mount ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const history = await loadConversation(user?.id);
      if (!cancelled) {
        setMessages(history);
        setHistoryLoaded(true);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  // ── Auto-scroll on new message ──────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;

    const userMsg = {
      id: Date.now().toString(),
      type: 'user',
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);
    scrollToBottom();

    // Persist user message
    await appendMessage(user?.id, userMsg);

    try {
      // Build history for backend (last 10 turns verbatim)
      const history = buildHistoryPayload(messages, 10);

      const response = await askAgent(text, user?.id, {
        name: user?.name,
        age: user?.age,
        gender: user?.gender,
        proteinGoal: 60,
        weeklyGoal: 150,
      }, history);

      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        text: response.answer || "I'm not sure. Could you rephrase?",
        tool: response.tool_used,
        reasoningSteps: response.reasoning_steps || [],
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMsg]);
      await appendMessage(user?.id, assistantMsg);
      scrollToBottom();
    } catch (error) {
      const errMsg = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        text: 'Something went wrong. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
      await appendMessage(user?.id, errMsg);
    } finally {
      setLoading(false);
    }
  };

  // ── Clear conversation ──────────────────────────────────────────────────────
  const handleClear = async () => {
    await clearConversation(user?.id);
    setMessages([{
      id: 'welcome',
      type: 'assistant',
      text: 'Hi! I am your CampusTitan AI Coach. Ask me anything about your health!',
      timestamp: new Date(),
    }]);
  };

  // ── Suggestions (shown when only welcome message) ───────────────────────────
  const renderSuggestions = () => (
    <View style={styles.suggestionsContainer}>
      <Text style={styles.suggestionsTitle}>Try asking:</Text>
      <View style={styles.suggestionsList}>
        {EXAMPLE_QUERIES.slice(0, 4).map((query, i) => (
          <TouchableOpacity
            key={i}
            style={styles.suggestionChip}
            onPress={() => sendMessage(query)}
          >
            <Text style={styles.suggestionText}>{query}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (!historyLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.primary} />
        <Text style={{ color: COLORS.textMuted, marginTop: SPACING.sm }}>Loading conversation...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <LinearGradient colors={COLORS.gradientHero || COLORS.gradientPrimary} style={styles.header}>
        <TouchableOpacity onPress={close} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={COLORS.textInverse} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Titan AI Coach</Text>
          <Text style={styles.headerSubtitle}>Memory enabled · Ask me anything</Text>
        </View>
        <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
          <Ionicons name="trash-outline" size={20} color={COLORS.textInverse} />
        </TouchableOpacity>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => <MessageBubble item={item} />}
          keyExtractor={item => item.id}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.messagesList, { paddingBottom: SPACING.lg }]}
          ListHeaderComponent={messages.length <= 1 ? renderSuggestions : null}
          ListFooterComponent={
            loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={COLORS.primary} size="small" />
                <Text style={styles.loadingText}>Thinking...</Text>
              </View>
            ) : null
          }
          onContentSizeChange={scrollToBottom}
        />

        {/* Input bar */}
        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about your health..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={500}
            onSubmitEditing={() => sendMessage(inputText)}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || loading}
          >
            <LinearGradient colors={COLORS.gradientPrimary} style={styles.sendButtonGradient}>
              <Ionicons name="send" size={20} color={COLORS.textInverse} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  body: { flex: 1 },
  list: { flex: 1 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg },
  closeButton: {
    padding: SPACING.sm, width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  clearButton: {
    padding: SPACING.sm, width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  headerText: { flex: 1, marginLeft: SPACING.md },
  headerTitle: { color: COLORS.textInverse, fontSize: FONT_SIZES.xl, fontWeight: 'bold' },
  headerSubtitle: { color: COLORS.textInverse, opacity: 0.8, fontSize: FONT_SIZES.xs },

  // Messages
  messagesList: { padding: SPACING.md },
  messageContainer: { marginBottom: SPACING.md },
  userMessage: { alignItems: 'flex-end' },
  assistantMessage: { alignItems: 'flex-start' },
  messageBubble: { maxWidth: '80%', padding: SPACING.md, borderRadius: BORDER_RADIUS.lg },
  userBubble: { backgroundColor: COLORS.primary },
  assistantBubble: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.glassBorder },
  agentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs },
  agentName: { color: COLORS.primary, fontSize: FONT_SIZES.xs, fontWeight: 'bold' },
  toolUsed: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginLeft: SPACING.sm },
  messageText: { fontSize: FONT_SIZES.md, lineHeight: 22 },
  userText: { color: COLORS.textInverse },
  assistantText: { color: COLORS.text },
  timestamp: { fontSize: 10, color: COLORS.textMuted, marginTop: SPACING.xs, alignSelf: 'flex-end' },

  // Reasoning trace
  traceContainer: { marginTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.glassBorder, paddingTop: SPACING.xs },
  traceHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  traceLabel: { fontSize: 10, color: COLORS.primary, fontStyle: 'italic' },
  traceSteps: { marginTop: SPACING.xs },
  traceStep: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  traceStepDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.primary, marginRight: 6, marginTop: 5 },
  traceStepText: { fontSize: 11, color: COLORS.textSecondary, flex: 1, lineHeight: 16 },

  // Loading
  loadingContainer: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md },
  loadingText: { marginLeft: SPACING.sm, color: COLORS.textMuted, fontSize: FONT_SIZES.sm },

  // Suggestions
  suggestionsContainer: { padding: SPACING.md, marginBottom: SPACING.md },
  suggestionsTitle: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm, marginBottom: SPACING.sm },
  suggestionsList: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  suggestionChip: {
    backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.round,
    borderWidth: 1, borderColor: COLORS.glassBorder,
  },
  suggestionText: { color: COLORS.primary, fontSize: FONT_SIZES.sm },

  // Input
  inputContainer: {
    flexDirection: 'row', alignItems: 'flex-end', padding: SPACING.md,
    borderTopWidth: 1, borderTopColor: COLORS.glassBorder, backgroundColor: COLORS.surface,
  },
  input: {
    flex: 1, backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    maxHeight: 100, color: COLORS.text, fontSize: FONT_SIZES.md,
  },
  sendButton: { marginLeft: SPACING.sm, width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  sendButtonGradient: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { opacity: 0.5 },
});
