import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, FlatList, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { useChat } from '@/hooks/useChat';
import { Role } from '@/utils/Interfaces';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassSurface } from '@/components/GlassSurface';
import { LocaleGlass } from '@/constants/LocaleColors';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import { TypingIndicator } from '@/components/TypingIndicator';
import { buildMessages } from '@/lib/llm/generate';
import { getCase, touchCase } from '@/lib/cases/cases';
import { listCaseMessages, addCaseMessage, updateCaseMessage } from '@/lib/cases/messages';
import { CaseMessage } from '@/lib/cases/types';
import { legalModule, LEGAL_DISCLAIMER } from '@/lib/navigators/legal';
import { extractAndApply } from '@/lib/cases/extract';
import { retrieveContext } from '@/lib/rag/retrieve';
import { indexCaseText } from '@/lib/rag/index';

/**
 * Per-case legal chat. Deliberately NOT the shared ChatPage/useChat
 * conversation flow: case chat is isolated SQLite state (`case_messages`),
 * never written to Supabase, and never mixed into normal-chat history. It
 * reuses the same presentational building blocks (ChatMessage/ChatInput) and
 * the single shared on-device LLM instance from useChat().llm so the model is
 * only ever loaded once for the whole app.
 */
export default function CaseChat() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const { llm, isLocalModelReady, isLocalModelDownloading, isLocalModelGenerating } = useChat();
  const insets = useSafeAreaInsets();

  const [jurisdiction, setJurisdiction] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [messages, setMessages] = useState<CaseMessage[]>([]);
  const [sending, setSending] = useState(false);
  const liveResponseRef = useRef('');

  useEffect(() => {
    if (!caseId) return;
    (async () => {
      const c = await getCase(caseId);
      setJurisdiction(c?.jurisdiction ?? null);
      setCategory(c?.category ?? null);
      const history = await listCaseMessages(caseId);
      setMessages(history);
    })();
  }, [caseId]);

  // Mirror the live streaming response into a ref so we can read the final
  // text right after `await llm.generate(...)` resolves without relying on a
  // stale closure over React state (same pattern as ChatPage).
  useEffect(() => {
    if (llm?.response) liveResponseRef.current = llm.response;
  }, [llm?.response]);

  const assistantIdRef = useRef<string | null>(null);

  const handleSend = useCallback(async (text: string) => {
    if (!caseId) return;
    if (!llm || !isLocalModelReady) {
      Alert.alert(
        'Model loading',
        isLocalModelDownloading
          ? 'The on-device model is still downloading. Please wait for it to finish.'
          : 'The on-device model is still loading. Please try again in a moment.'
      );
      return;
    }

    setSending(true);
    liveResponseRef.current = '';

    const userMsg = await addCaseMessage({ caseId, role: 'user', content: text });
    const assistantMsg = await addCaseMessage({ caseId, role: 'assistant', content: '' });
    assistantIdRef.current = assistantMsg.id;
    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    try {
      const ragContext = await retrieveContext(caseId, text);
      const systemPrompt = legalModule.buildSystemPrompt({ jurisdiction, category, ragContext });
      const history = messages
        .filter((m) => m.content.trim().length > 0)
        .map((m) => ({ role: m.role, content: m.content }));

      const llmMessages = buildMessages({ systemPrompt, history, userText: text });
      await llm.generate(llmMessages);
      let finalContent = (liveResponseRef.current || llm.response || '').trim();

      // Safety net: the on-device model is small and won't always remember to
      // append the disclaimer verbatim even though the system prompt asks for
      // it. Never ship an answer without it.
      if (!finalContent.includes(LEGAL_DISCLAIMER.slice(0, 30))) {
        finalContent = `${finalContent}\n\n${LEGAL_DISCLAIMER}`;
      }

      await updateCaseMessage(assistantMsg.id, finalContent);
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: finalContent } : m))
      );
      await touchCase(caseId);

      // Index the exchange for future RAG retrieval, then run structured
      // extraction to update case memory (facts/timeline/deadlines).
      await indexCaseText({ caseId, sourceType: 'message', sourceId: assistantMsg.id, text: `${text}\n${finalContent}` });
      await extractAndApply(caseId, `User: ${text}\nAssistant: ${finalContent}`, llm);
    } catch (error) {
      console.error('[CaseChat] Generation failed:', error);
      Alert.alert('Error', 'Something went wrong generating a response.');
    } finally {
      setSending(false);
    }
  }, [caseId, llm, isLocalModelReady, isLocalModelDownloading, jurisdiction, category, messages]);

  return (
    <GradientBackground variant="background" style={styles.container}>
      <Stack.Screen options={{ title: 'Legal Research' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => (
            <ChatMessage
              id={item.id}
              chat_id={item.id}
              role={item.role === 'user' ? Role.User : Role.Bot}
              content={item.content}
              loading={sending && index === messages.length - 1 && item.role === 'assistant' && !item.content}
              isFirstInGroup
              isLastInGroup
              isOnlyInGroup
            />
          )}
        />
        {sending && isLocalModelGenerating && (
          <TypingIndicator modelName="Procedure Hub" />
        )}
        <GlassSurface style={[styles.inputBar, { paddingBottom: insets.bottom }]} borderRadius={0} strong>
          <ChatInput onShouldSend={handleSend} isLoading={sending} isLocal />
        </GlassSurface>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 12, paddingBottom: 8 },
  inputBar: { width: '100%' },
});
