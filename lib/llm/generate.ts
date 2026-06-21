/**
 * Shared on-device generation helpers.
 *
 * Generalizes the prompt-building logic that used to live inline in
 * ChatPage's local send path so both normal chat and navigator-module case
 * chats (Legal Navigator, and future modules) build messages the same way
 * against the single shared `globalLLM` instance.
 */
import { LOCAL_MODEL_LIMITS } from '@/constants/LocalModelsConfig';

export interface SimpleMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Build the message list sent to the local LLM: a system prompt, capped prior
 * history, and the new user turn. `ragContext`, if provided, is the caller's
 * responsibility to fold into `systemPrompt` (the navigator module's
 * `buildSystemPrompt` does this) — kept separate here only for callers that
 * want to inject it as its own turn instead.
 */
export function buildMessages(input: {
  systemPrompt: string;
  history: HistoryMessage[];
  userText: string;
}): SimpleMessage[] {
  const cappedHistory = input.history
    .filter((m) => (m.content || '').trim().length > 0)
    .slice(-LOCAL_MODEL_LIMITS.MAX_CONTEXT_MESSAGES);

  return [
    { role: 'system', content: input.systemPrompt },
    ...cappedHistory,
    { role: 'user', content: input.userText },
  ];
}

/**
 * Minimal shape of the executorch `useLLM` instance we depend on. Kept as an
 * interface (rather than importing the library type) so this module has no
 * native-module import — callers pass the shared `globalLLM` from
 * `useChat().llm`.
 */
export interface LlmHandle {
  generate: (messages: SimpleMessage[]) => Promise<void>;
  response: string;
}

/**
 * Run generation and return the final text. Reads the response from a ref the
 * caller keeps in sync with `llm.response` via a `useEffect` (React state /
 * closures captured before `await` can be stale — see ChatPage's
 * `localStreamContentRef` for the pattern), falling back to `llm.response`.
 */
export async function runGeneration(
  llm: LlmHandle,
  messages: SimpleMessage[],
  liveResponseRef?: { current: string }
): Promise<string> {
  await llm.generate(messages);
  return (liveResponseRef?.current || llm.response || '').trim();
}
