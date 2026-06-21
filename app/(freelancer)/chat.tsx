import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, FlatList, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { useChat } from '@/hooks/useChat';
import { Role } from '@/utils/Interfaces';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassSurface } from '@/components/GlassSurface';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import { TypingIndicator } from '@/components/TypingIndicator';
import { buildMessages } from '@/lib/llm/generate';
import { listFreelanceMessages, addFreelanceMessage, updateFreelanceMessageContent } from '@/lib/freelance/messages';
import { FreelanceMessage } from '@/lib/freelance/types';
import { buildFreelancerSystemPrompt } from '@/lib/navigators/freelance';
import { retrieveFreelanceContext } from '@/lib/freelance/retrieve';

/**
 * The single global FREELANCER_MODE business assistant thread. Mirrors
 * app/(legal)/[caseId]/chat.tsx structurally (shared LLM instance, ref-based
 * stale-closure-avoidance for the streamed response) but isn't scoped to a
 * single entity — it retrieves across all clients/projects/invoices/expenses/
 * contracts via `retrieveFreelanceContext`.
 */
export default function FreelancerChat() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const insets = useSafeAreaInsets();
  const { llm, isLocalModelReady, isLocalModelDownloading, isLocalModelGenerating } = useChat();

  const [messages, setMessages] = useState<FreelanceMessage[]>([]);
  const [sending, setSending] = useState(false);
  const liveResponseRef = useRef('');

  useEffect(() => {
    listFreelanceMessages().then(setMessages);
  }, []);

  useEffect(() => {
    if (llm?.response) liveResponseRef.current = llm.response;
  }, [llm?.response]);

  const handleSend = useCallback(async (text: string) => {
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

    const userMsg = await addFreelanceMessage({ role: 'user', content: text });
    const assistantMsg = await addFreelanceMessage({ role: 'assistant', content: '' });
    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    try {
      const ragContext = await retrieveFreelanceContext(text);
      const systemPrompt = buildFreelancerSystemPrompt({ ragContext });
      const history = messages
        .filter((m) => m.content.trim().length > 0)
        .map((m) => ({ role: m.role, content: m.content }));

      const llmMessages = buildMessages({ systemPrompt, history, userText: text });
      await llm.generate(llmMessages);
      const finalContent = (liveResponseRef.current || llm.response || '').trim();

      await updateFreelanceMessageContent(assistantMsg.id, finalContent);
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: finalContent } : m))
      );
    } catch (error) {
      console.error('[FreelancerChat] Generation failed:', error);
      Alert.alert('Error', 'Something went wrong generating a response.');
    } finally {
      setSending(false);
    }
  }, [llm, isLocalModelReady, isLocalModelDownloading, messages]);

  return (
    <GradientBackground variant="background" style={styles.container}>
      <Stack.Screen options={{ title: 'Business Assistant' }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
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
          <TypingIndicator modelName="Business Assistant" />
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
