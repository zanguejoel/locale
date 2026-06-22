/**
 * Navigator module framework.
 *
 * A "navigator module" turns the assistant into a domain companion (Legal,
 * Immigration, Tax, …) that shares the same case-management, document-analysis,
 * timeline, reminder, and export infrastructure. Each module is just a
 * definition object; the sidebar, router, and AI layer iterate the registry so
 * adding a module requires no new tables or screens.
 */
import { LetterKind, LetterTone } from '@/lib/cases/types';

export interface NavigatorModule {
  /** Stable id stored as `module_id` on every case (e.g. 'legal'). */
  id: string;
  /** Sidebar label, e.g. 'Procedure Hub'. */
  title: string;
  /** Ionicons glyph name for the sidebar entry. */
  icon: string;
  /** Expo-router path to the module workspace, e.g. '/(legal)'. */
  route: string;
  /** System-mode tag, e.g. 'PROCEDURE_HUB_MODE'. */
  systemMode: string;
  /** Categories a case in this module can have. */
  categories: string[];
  /** Follow-up communication types this module offers. */
  followUpTypes: LetterKind[];
  /** Tones offered for follow-up generation. */
  tones: LetterTone[];
  /** Disclaimer appended to every answer and export. */
  disclaimer: string;
  /** Build the system prompt for a chat turn in this module. */
  buildSystemPrompt: (ctx: NavigatorPromptContext) => string;
  /** Build the structured-extraction prompt run after each exchange. */
  buildExtractionPrompt: (ctx: NavigatorExtractionContext) => string;
}

export interface NavigatorPromptContext {
  jurisdiction?: string | null;
  category?: string | null;
  /** Retrieved RAG context (case documents/history), already concatenated. */
  ragContext?: string;
}

export interface NavigatorExtractionContext {
  /** The latest user + assistant exchange to extract structured data from. */
  exchange: string;
}
