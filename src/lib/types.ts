export type Source = "whatsapp" | "json" | "paste" | "sample";

export interface Message {
  id: string;
  author: string;
  text: string;
  ts: number; // epoch ms
}

export interface Conversation {
  id: string;
  name: string;
  source: Source;
  messages: Message[];
  /** index of the last message the user has read; -1 = nothing read */
  lastReadIndex: number;
  createdAt: number;
  pinned?: boolean;
}

export interface Profile {
  name: string;
  aliases: string[];
  vips: string[];
  keywords: string[];
}

export type Kind = "mention" | "question" | "action" | "decision" | "deadline" | "urgent";

export type Priority = "critical" | "high" | "medium" | "low";

export interface Due {
  ts: number;
  label: string;
  overdue: boolean;
}

export interface Insight {
  key: string; // convId:msgId
  convId: string;
  convName: string;
  msgId: string;
  author: string;
  text: string;
  ts: number;
  unread: boolean;
  kinds: Kind[];
  score: number;
  priority: Priority;
  reasons: string[];
  due?: Due;
  forMe: boolean;
  answered: boolean;
}

export interface ItemState {
  done?: boolean;
  dismissed?: boolean;
  snoozedUntil?: number;
}

export interface Lexicon {
  version: string;
  urgent: string[];
  action: string[];
  actionStarts: string[];
  decision: string[];
  groupCallouts: string[];
  stopwords: string[];
}

export interface ConvAnalysis {
  convId: string;
  insights: Insight[];
  unread: number;
  score: number;
  priority: Priority;
  participants: string[];
  topics: string[];
  summary: string[];
  needsReply: number;
}

export interface AppData {
  version: 1;
  profile: Profile | null;
  conversations: Conversation[];
  items: Record<string, ItemState>;
}
