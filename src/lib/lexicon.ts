import type { Lexicon } from "./types";

/**
 * Default rule pack. The backend serves the latest version at /api/rules;
 * this copy is bundled so the app keeps working fully offline.
 * Includes common Hinglish phrasing used in Indian group chats.
 */
export const DEFAULT_LEXICON: Lexicon = {
  version: "2026.10-en+hinglish",
  urgent: [
    "urgent", "asap", "immediately", "critical", "blocker", "blocked", "emergency",
    "right now", "important", "high priority", "top priority", "escalate", "overdue",
    "time sensitive", "last chance", "final reminder", "don't miss", "dont miss",
    "jaldi", "abhi", "turant", "fatafat", "zaroori", "zaruri",
  ],
  action: [
    "can you", "could you", "would you", "will you", "please", "pls", "plz",
    "need you to", "need to", "needs to", "have to", "has to", "must",
    "make sure", "don't forget", "dont forget", "remember to", "reminder",
    "todo", "to-do", "action item", "assigned to", "take care of", "follow up",
    "kar do", "kardo", "bhej do", "bhejdo", "dekh lo", "dekhlo", "check karo",
    "yaad se", "bata do", "batado", "send me", "pay by", "pay the", "transfer to",
  ],
  actionStarts: [
    "send", "share", "submit", "review", "update", "fix", "call", "book", "pay",
    "upload", "check", "email", "finish", "complete", "prepare", "bring", "print",
    "confirm", "sign", "fill", "register", "reply", "schedule", "deploy", "push",
    "merge", "test", "write", "draft", "order", "collect", "transfer",
  ],
  decision: [
    "decided", "decision", "let's go with", "lets go with", "we'll go with",
    "we will go with", "going with", "agreed", "final:", "finalized", "finalised",
    "approved", "confirmed", "it's settled", "its settled", "settled on",
    "signed off", "go ahead with", "going ahead", "locked in", "we chose",
    "final hai", "pakka", "done deal", "fix hai", "tay hua",
  ],
  groupCallouts: ["@everyone", "@all", "@channel", "@here", "everyone", "guys", "all of you", "sab log", "sabko"],
  stopwords: [
    "the", "a", "an", "and", "or", "but", "if", "to", "of", "in", "on", "at", "for", "with", "is",
    "are", "was", "were", "be", "been", "it", "its", "this", "that", "i", "you", "we", "they", "he",
    "she", "me", "my", "your", "our", "so", "ok", "okay", "yes", "no", "just", "will", "can", "do",
    "did", "have", "has", "had", "not", "from", "by", "as", "what", "when", "how", "all", "about",
    "also", "there", "then", "than", "get", "got", "too", "very", "up", "out", "hai", "hain", "ki",
    "ka", "ke", "ko", "se", "bhi", "na", "toh", "kya", "haan", "nahi", "yeah", "guys", "pls", "please",
    "u", "ur", "im", "i'm", "its", "it's", "dont", "don't", "lol", "haha", "hey", "hi", "hello",
    "thanks", "thank", "now", "today", "tomorrow", "would", "could", "should", "let", "lets", "let's",
    "one", "some", "any", "need", "make", "sure", "send", "check", "kal", "aaj", "abhi", "bro", "da",
    "yaar", "everyone", "pm", "am", "going", "go", "here", "know", "think", "see", "done", "good",
  ],
};
