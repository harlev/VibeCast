import OpenAI from "openai";
import { SearchCandidate } from "@/types/config";

function getOpenAIClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
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

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          "Pick the next concept to search for a TV video queue. Consider variety and what's already queued. Return ONLY the concept string, no quotes, no explanation.",
      },
      {
        role: "user",
        content: JSON.stringify({
          availableConcepts: concepts,
          currentQueue: currentQueueTitles,
          recentlyUsedConcepts: recentConcepts,
          timeOfDay: getTimeOfDay(),
          season: getSeason(),
        }),
      },
    ],
  });

  const picked = response.choices[0]?.message?.content?.trim() ?? "";
  // Verify it's actually one of the concepts
  const match = concepts.find(
    (c) => c.toLowerCase() === picked.toLowerCase()
  );
  return match ?? concepts[0];
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

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content:
          'You are a video curator for a home ambient TV channel. Generate 3-5 YouTube search queries for the given concept. Consider season, time of day, and queue variety. Prefer documentaries, compilations, scenic footage. Avoid news/political content. Return ONLY a JSON array of strings, e.g. ["query 1", "query 2"].',
      },
      {
        role: "user",
        content: JSON.stringify({
          concept,
          season: getSeason(),
          timeOfDay: getTimeOfDay(),
          currentQueue: queueTitles,
          recentHistory: historyTitles.slice(-20),
        }),
      },
    ],
  });

  const text = response.choices[0]?.message?.content?.trim() ?? "[]";
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

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          'You are a content safety and quality reviewer for a home TV. REJECT: NSFW, violent, triggering, clickbait, reaction videos, ads, misleading titles, news/political. APPROVE: matches concept, reputable channel, engaging visuals, good view count. Return ONLY a JSON array of approved video IDs, best first, e.g. ["id1", "id2"].',
      },
      {
        role: "user",
        content: JSON.stringify({
          concept,
          candidates: candidateSummaries,
        }),
      },
    ],
  });

  const text = response.choices[0]?.message?.content?.trim() ?? "[]";
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
