import { DEFAULT_LEXICON } from "@/lib/lexicon";
import type { RulePackId } from "@/lib/contracts";
import type { Lexicon } from "@/lib/types";

/** Hinglish-only terms; removing them gives the English-only pack. */
const HINGLISH = new Set([
  "jaldi", "abhi", "turant", "fatafat", "zaroori", "zaruri", "kar do", "kardo", "bhej do", "bhejdo", "dekh lo", "dekhlo",
  "check karo", "yaad se", "bata do", "batado", "final hai", "pakka", "fix hai", "tay hua", "sab log", "sabko",
  "hai", "hain", "ki", "ka", "ke", "ko", "se", "bhi", "na", "toh", "kya", "haan", "nahi", "kal", "aaj", "yaar", "bro", "da",
]); // prettier-ignore

const strip = (list: string[]) => list.filter((t) => !HINGLISH.has(t));

const PACKS: Record<RulePackId, Lexicon> = {
  "en+hinglish": DEFAULT_LEXICON,
  en: {
    version: DEFAULT_LEXICON.version.replace("en+hinglish", "en"),
    urgent: strip(DEFAULT_LEXICON.urgent),
    action: strip(DEFAULT_LEXICON.action),
    actionStarts: strip(DEFAULT_LEXICON.actionStarts),
    decision: strip(DEFAULT_LEXICON.decision),
    groupCallouts: strip(DEFAULT_LEXICON.groupCallouts),
    stopwords: strip(DEFAULT_LEXICON.stopwords),
  },
};

export function getRulePack(id: RulePackId): Lexicon {
  return PACKS[id];
}
