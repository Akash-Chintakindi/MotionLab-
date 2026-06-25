import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  Schema,
  type GenerativeModel,
} from "firebase/ai";
import { app } from "../lib/firebase";
import type { AIPracticeQuestion, GenerateParams } from "./practiceTypes";

const MODEL_NAME = "gemini-flash-latest";

/**
 * Structured-output schema mirroring {@link AIPracticeQuestion} (minus the
 * client-assigned `id`). Fields that only apply to one question type are marked
 * optional so the model can omit the irrelevant ones.
 */
const questionSchema = Schema.object({
  properties: {
    type: Schema.enumString({
      enum: ["multipleChoice", "numeric"],
      description:
        'Question kind: "multipleChoice" (4 options) or "numeric" (single value).',
    }),
    prompt: Schema.string({
      description: "The question text shown to the learner.",
    }),
    options: Schema.array({
      description:
        'Exactly 4 answer choices, only for multipleChoice questions. ids must be "a","b","c","d".',
      items: Schema.object({
        properties: {
          id: Schema.string({ description: 'One of "a","b","c","d".' }),
          label: Schema.string({ description: "The choice text." }),
        },
      }),
    }),
    correctOptionId: Schema.string({
      description:
        "For multipleChoice: the id of the correct option (one of the option ids).",
    }),
    value: Schema.number({
      description: "For numeric: the correct numeric answer.",
    }),
    tolerance: Schema.number({
      description:
        "For numeric: absolute tolerance for grading the learner's answer.",
    }),
    unit: Schema.string({
      description: 'For numeric: the unit of the answer, e.g. "m/s".',
    }),
    explanation: Schema.string({
      description: "Concise worked explanation, always shown after answering.",
    }),
  },
  optionalProperties: [
    "options",
    "correctOptionId",
    "value",
    "tolerance",
    "unit",
  ],
});

let model: GenerativeModel | undefined;

/** Lazily create the AI model once and reuse it across calls. */
function getModel(): GenerativeModel {
  if (!model) {
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    model = getGenerativeModel(ai, {
      model: MODEL_NAME,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: questionSchema,
        temperature: 0.8,
      },
    });
  }
  return model;
}

function difficultyGuidance(difficulty: GenerateParams["difficulty"]): string {
  switch (difficulty) {
    case "easy":
      return "Easy: a single-concept plug-in calculation or a qualitative conceptual check.";
    case "medium":
      return "Medium: requires two steps or combining two ideas.";
    case "hard":
      return "Hard: multi-step reasoning or a trickier conceptual subtlety.";
  }
}

function buildPrompt(params: GenerateParams): string {
  const { topic, difficulty, avoidPrompts } = params;
  const lines = [
    "You are an expert AP Physics C: Mechanics tutor writing one original practice problem.",
    `Topic: "${topic.title}".`,
    `Concept to focus on: ${topic.blurb}`,
    `Difficulty — ${difficultyGuidance(difficulty)}`,
    "Ground the problem strictly in AP Physics C kinematics for this topic.",
    "Use g = 9.8 m/s^2 for gravitational acceleration where relevant.",
    "",
    'If you choose type "multipleChoice": produce exactly 4 options with ids "a","b","c","d", set correctOptionId to the id of the correct choice, and write a concise explanation. Do not include numeric/value/tolerance/unit fields.',
    'If you choose type "numeric": set value to the correct number, set a sensible absolute tolerance, set unit (e.g. "m/s"), and write a concise explanation. Do not include options/correctOptionId.',
    "Keep the prompt self-contained and unambiguous, and always include an explanation.",
  ];

  if (avoidPrompts && avoidPrompts.length > 0) {
    lines.push(
      "",
      "Do NOT reuse or closely paraphrase any of these already-seen prompts:",
      ...avoidPrompts.map((p) => `- ${p}`),
    );
  }

  lines.push("", "Return ONLY valid JSON matching the provided schema.");
  return lines.join("\n");
}

/** True if the error looks like the AI Logic backend hasn't been provisioned. */
function looksLikeNotEnabled(err: unknown): boolean {
  const parts: string[] = [];
  if (err && typeof err === "object") {
    const anyErr = err as { message?: unknown; code?: unknown };
    if (typeof anyErr.message === "string") parts.push(anyErr.message);
    if (anyErr.code != null) parts.push(String(anyErr.code));
  } else if (typeof err === "string") {
    parts.push(err);
  }
  const haystack = parts.join(" ");
  return /PERMISSION_DENIED|not enabled|API has not been used|403/i.test(
    haystack,
  );
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

/** Create an Error with a `cause` without relying on the ES2022 2-arg ctor. */
function makeError(message: string, cause: unknown): Error {
  const err = new Error(message);
  (err as Error & { cause?: unknown }).cause = cause;
  return err;
}

/** Validate and normalize the raw model JSON into a well-formed question. */
function normalize(raw: unknown): AIPracticeQuestion {
  if (!raw || typeof raw !== "object") {
    throw new Error("Model returned a non-object response.");
  }
  const data = raw as Record<string, unknown>;

  const prompt = asString(data.prompt)?.trim();
  const explanation = asString(data.explanation)?.trim();
  if (!prompt) throw new Error("Model response is missing a prompt.");
  if (!explanation) throw new Error("Model response is missing an explanation.");

  const type = data.type;
  if (type !== "multipleChoice" && type !== "numeric") {
    throw new Error(`Model returned an unknown question type: ${String(type)}`);
  }

  const id = crypto.randomUUID();

  if (type === "multipleChoice") {
    const rawOptions = data.options;
    if (!Array.isArray(rawOptions) || rawOptions.length === 0) {
      throw new Error("multipleChoice response is missing options.");
    }
    const options = rawOptions.map((opt) => {
      const o = (opt ?? {}) as Record<string, unknown>;
      const optId = asString(o.id);
      const label = asString(o.label);
      if (!optId || !label) {
        throw new Error("multipleChoice option is missing id or label.");
      }
      return { id: optId, label };
    });

    const correctOptionId = asString(data.correctOptionId);
    if (!correctOptionId || !options.some((o) => o.id === correctOptionId)) {
      throw new Error("correctOptionId does not match any option.");
    }

    return { id, type, prompt, options, correctOptionId, explanation };
  }

  // numeric
  const value = data.value;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("numeric response is missing a finite value.");
  }
  const rawTolerance = data.tolerance;
  const tolerance =
    typeof rawTolerance === "number" &&
    Number.isFinite(rawTolerance) &&
    rawTolerance > 0
      ? rawTolerance
      : Math.max(0.01, Math.abs(value) * 0.02);
  const unit = asString(data.unit);

  const question: AIPracticeQuestion = {
    id,
    type,
    prompt,
    value,
    tolerance,
    explanation,
  };
  if (unit) question.unit = unit;
  return question;
}

/**
 * Generate a single AP Physics C kinematics practice question via Firebase AI
 * Logic (Gemini Developer API) using structured JSON output.
 */
export async function generatePracticeQuestion(
  params: GenerateParams,
): Promise<AIPracticeQuestion> {
  let text: string;
  try {
    const result = await getModel().generateContent(buildPrompt(params));
    text = result.response.text();
  } catch (err) {
    if (looksLikeNotEnabled(err)) {
      throw makeError(
        "The Firebase AI Logic service isn't enabled for this project. A maintainer needs to run `firebase init ailogic` to provision it. AI practice also requires the live Firebase config — it won't work against the demo emulator.",
        err,
      );
    }
    throw makeError(
      "Couldn't generate a practice problem. Please try again.",
      err,
    );
  }

  try {
    const parsed = JSON.parse(text);
    return normalize(parsed);
  } catch (err) {
    throw makeError(
      "Couldn't generate a practice problem. Please try again.",
      err,
    );
  }
}
