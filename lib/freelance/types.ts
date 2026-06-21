/** Domain types for the Freelancer Hub module. */

export type ClientStatus = 'active' | 'inactive' | 'prospect';

export interface Client {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: ClientStatus;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
}

export type ProjectStatus = 'active' | 'completed' | 'on_hold' | 'cancelled';

export interface Project {
  id: string;
  clientId: string;
  title: string;
  description: string | null;
  hourlyRate: number;
  budget: number | null;
  status: ProjectStatus;
  hoursLogged: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: number;
  updatedAt: number;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  clientId: string;
  projectId: string | null;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  hours: number;
  rate: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: InvoiceStatus;
  createdAt: number;
  updatedAt: number;
}

export type PaymentStatus = 'pending' | 'paid' | 'failed';

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  status: PaymentStatus;
  dueDate: string | null;
  paidDate: string | null;
  createdAt: number;
}

export const EXPENSE_CATEGORIES = [
  'Software',
  'Equipment',
  'Office',
  'Travel',
  'Marketing',
  'Professional Services',
  'Other',
] as const;
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export interface Expense {
  id: string;
  vendor: string;
  amount: number;
  date: string;
  category: ExpenseCategory;
  sourceDocumentUri: string | null;
  notes: string | null;
  createdAt: number;
}

export interface Contract {
  id: string;
  clientId: string | null;
  projectId: string | null;
  name: string;
  type: string;
  uri: string | null;
  extractedText: string | null;
  startDate: string | null;
  endDate: string | null;
  renewalDate: string | null;
  paymentTerms: string | null;
  noticePeriod: string | null;
  reminderId: string | null;
  createdAt: number;
}

export type FreelanceChunkScopeType = 'client' | 'project' | 'invoice' | 'expense' | 'contract' | 'global';

export interface FreelanceChunk {
  id: string;
  scopeType: FreelanceChunkScopeType;
  scopeId: string | null;
  sourceType: string;
  sourceId: string | null;
  text: string;
  embedding: number[] | null;
  createdAt: number;
}

export type FreelanceMessageRole = 'user' | 'assistant';

export interface FreelanceMessage {
  id: string;
  role: FreelanceMessageRole;
  content: string;
  createdAt: number;
}
