import OpenAI from "openai";
import { SearchCandidate } from "@/types/config";

function getOpenAIClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "..." : str;
}

function logLLMCall(
  name: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  response: string,
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined
): void {
  console.log(`[Curator] === LLM Call: ${name} ===`);
  console.log(`[Curator] model: ${model}`);
  console.log(`[Curator] system: ${truncate(systemPrompt, 300)}`);
  console.log(`[Curator] user: ${truncate(userMessage, 500)}`);
  console.log(`[Curator] response: ${truncate(response, 500)}`);
  if (usage) {
    console.log(
      `[Curator] tokens: prompt=${usage.prompt_tokens ?? "?"} completion=${usage.completion_tokens ?? "?"} total=${usage.total_tokens ?? "?"}`
    );
  }
  console.log(`[Curator] === End ${name} ===`);
}

export function isLLMAvailable(): boolean {
  return getOpenAIClient() !== null;
}

function getSeason(): string {
  const month = new Date().getMonth(); // 0-indexed
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "autumn";
  return "winter";
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

export async function pickNextConcept(
  concepts: string[],
  currentQueueTitles: string[],
  recentConcepts: string[]
): Promise<string> {
  const client = getOpenAIClient();
  if (!client || concepts.length === 0) {
    // Fallback: round-robin
    if (recentConcepts.length === 0) return concepts[0];
    const lastIdx = concepts.indexOf(recentConcepts[recentConcepts.length - 1]);
    return concepts[(lastIdx + 1) % concepts.length];
  }

  const systemPrompt =
    "Pick the next concept to search for a TV video queue. Consider variety and what's already queued. Return ONLY the concept string, no quotes, no explanation.";
  const userMessage = JSON.stringify({
    availableConcepts: concepts,
    currentQueue: currentQueueTitles,
    recentlyUsedConcepts: recentConcepts,
    timeOfDay: getTimeOfDay(),
    season: getSeason(),
  });

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  const picked = response.choices[0]?.message?.content?.trim() ?? "";
  logLLMCall("pickNextConcept", "gpt-4o-mini", systemPrompt, userMessage, picked, response.usage ?? undefined);
  // Verify it's actually one of the concepts
  const match = concepts.find(
    (c) => c.toLowerCase() === picked.toLowerCase()
  );
  return match ?? concepts[0];
}

const SEARCH_ANGLES = [
  "focus on visual beauty and cinematography",
  "look for popular, high-view-count content",
  "find hidden gems from smaller channels",
  "focus on relaxing, calming, ambient content",
  "find educational or documentary style content",
  "look for compilation or 'best of' style videos",
  "find content from well-known creators or channels",
  "focus on unique or unusual perspectives",
  "look for long-form, immersive experiences",
  "find upbeat, energetic, inspiring content",
  "focus on behind-the-scenes or making-of content",
  "look for travel or exploration content",
  "find slow-paced, meditative content",
  "focus on storytelling and narrative content",
];

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export async function generateSearchQueries(
  concept: string,
  queueTitles: string[],
  historyTitles: string[]
): Promise<string[]> {
  const client = getOpenAIClient();
  if (!client) {
    // Fallback: use concept directly
    return [concept];
  }

  // Only mention season ~30% of the time to avoid every query being "winter X"
  const includeSeason = Math.random() < 0.3;
  const angles = pickRandom(SEARCH_ANGLES, 2);

  const systemPrompt =
    `You are a video curator for a home ambient TV channel. Generate 3-5 diverse YouTube search queries for the given concept.

IMPORTANT RULES FOR VARIETY:
- Each query should explore a DIFFERENT angle or sub-topic of the concept
- Do NOT repeat similar query patterns — vary the wording, style, and focus
- Do NOT put seasonal words (winter, summer, spring, fall, etc.) in more than 1 query${includeSeason ? "" : " — skip seasonal references entirely this time"}
- Do NOT put time-of-day words in queries
- Mix formats: some specific, some broad, some creative/unexpected
- Prefer documentaries, compilations, scenic footage
- Avoid news/political content

Suggested angles for this batch: ${angles.join("; ")}.

Return ONLY a JSON array of strings, e.g. ["query 1", "query 2"].`;

  const userPayload: Record<string, unknown> = {
    concept,
    currentQueue: queueTitles,
    recentHistory: historyTitles.slice(-20),
  };
  if (includeSeason) {
    userPayload.season = getSeason();
  }
  const userMessage = JSON.stringify(userPayload);

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.9,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  const text = response.choices[0]?.message?.content?.trim() ?? "[]";
  logLLMCall("generateSearchQueries", "gpt-4o-mini", systemPrompt, userMessage, text, response.usage ?? undefined);
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(String);
    }
  } catch {
    // Try extracting JSON array from text
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]).map(String);
      } catch {
        // fall through
      }
    }
  }
  return [concept];
}

export async function curateResults(
  concept: string,
  candidates: SearchCandidate[]
): Promise<string[]> {
  const client = getOpenAIClient();
  if (!client) {
    // Fallback: return all candidate IDs
    return candidates.map((c) => c.id);
  }

  const candidateSummaries = candidates.map((c) => ({
    id: c.id,
    title: c.title,
    uploader: c.uploader,
    duration: c.duration,
    viewCount: c.viewCount,
    description: c.description?.slice(0, 200),
  }));

  const systemPrompt =
    'You are a content safety and quality reviewer for a home TV. REJECT: NSFW, violent, triggering, clickbait, reaction videos, ads, misleading titles, news/political. APPROVE: matches concept, reputable channel, engaging visuals, good view count. Return ONLY a JSON array of approved video IDs, best first, e.g. ["id1", "id2"].';
  const userMessage = JSON.stringify({
    concept,
    candidates: candidateSummaries,
  });

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  const text = response.choices[0]?.message?.content?.trim() ?? "[]";
  logLLMCall("curateResults", "gpt-4o-mini", systemPrompt, userMessage, text, response.usage ?? undefined);
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.map(String).filter((id) =>
        candidates.some((c) => c.id === id)
      );
    }
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0])
          .map(String)
          .filter((id: string) => candidates.some((c) => c.id === id));
      } catch {
        // fall through
      }
    }
  }
  return candidates.map((c) => c.id);
}
