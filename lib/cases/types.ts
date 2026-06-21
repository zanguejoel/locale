/**
 * Domain types for the Navigator case-management layer.
 *
 * These are storage-agnostic models shared by the SQLite repos, the workspace
 * screens, and the AI extraction layer. Every case-scoped row carries a
 * `case_id`; every case carries a `module_id` so future navigator modules
 * (Immigration, Tax, etc.) reuse the same tables.
 */

export type CaseStatus = 'Open' | 'In Progress' | 'Waiting' | 'Closed';

export interface LegalCase {
  id: string;
  moduleId: string;
  title: string;
  category: string;
  jurisdiction: string | null;
  status: CaseStatus;
  createdAt: number;
  updatedAt: number;
}

export interface CaseFact {
  id: string;
  caseId: string;
  text: string;
  isAssumption: boolean;
  createdAt: number;
}

export type CaseDocType = 'image' | 'pdf' | 'docx' | 'text';
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Unknown';

export interface CaseDocument {
  id: string;
  caseId: string;
  name: string;
  type: CaseDocType;
  uri: string | null;
  extractedText: string | null;
  /** JSON string of the document-analysis summary (type/date/action/risk). */
  summaryJson: string | null;
  risk: RiskLevel;
  createdAt: number;
}

export interface CaseEvent {
  id: string;
  caseId: string;
  /** ISO date (YYYY-MM-DD) when known; raw string otherwise. */
  date: string;
  label: string;
  /** Where this event came from: 'chat' | 'document' | 'manual'. */
  source: string;
  createdAt: number;
}

export type DeadlineKind = 'hearing' | 'filing' | 'response' | 'appeal' | 'other';

export interface CaseDeadline {
  id: string;
  caseId: string;
  /** ISO date (YYYY-MM-DD). */
  dueDate: string;
  label: string;
  kind: DeadlineKind;
  /** expo-notifications identifier, set when a reminder is scheduled. */
  reminderId: string | null;
  createdAt: number;
}

export type LetterKind = 'email' | 'letter' | 'complaint' | 'status_request' | 'information_request';
export type LetterTone = 'professional' | 'neutral' | 'assertive';

export interface CaseLetter {
  id: string;
  caseId: string;
  kind: LetterKind;
  tone: LetterTone;
  content: string;
  createdAt: number;
}

export interface CaseNote {
  id: string;
  caseId: string;
  text: string;
  createdAt: number;
}

export type CaseMessageRole = 'user' | 'assistant';

export interface CaseMessage {
  id: string;
  caseId: string;
  role: CaseMessageRole;
  content: string;
  createdAt: number;
}

export type ChunkSourceType = 'document' | 'fact' | 'message' | 'note';

export interface CaseChunk {
  id: string;
  caseId: string;
  sourceType: ChunkSourceType;
  sourceId: string | null;
  text: string;
  /** Embedding vector; stored as a Float32 BLOB, hydrated to number[] in JS. */
  embedding: number[] | null;
  createdAt: number;
}
