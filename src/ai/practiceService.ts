import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";
import type { AIPracticeQuestion, GenerateParams } from "./practiceTypes";

/**
 * Name of the deployed callable Cloud Function that proxies OpenAI. The function
 * holds the OpenAI key server-side; the key never reaches the browser.
 */
const CALLABLE_NAME = "generatePracticeQuestion";

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

/** Create an Error with a `cause` without relying on the ES2022 2-arg ctor. */
function makeError(message: string, cause: unknown): Error {
  const err = new Error(message);
  (err as Error & { cause?: unknown }).cause = cause;
  return err;
}

/**
 * True if the error looks like the proxy function isn't deployed / configured
 * (e.g. function not found, or the caller isn't authenticated). Callers can use
 * this to fall back to the static question bank gracefully.
 */
function looksLikeUnavailable(err: unknown): boolean {
  const code = ((err as { code?: unknown })?.code ?? "").toString();
  const msg = ((err as { message?: unknown })?.message ?? "")
    .toString()
    .toLowerCase();
  return (
    /not-found|unauthenticated|unavailable|permission-denied/i.test(code) ||
    /not found|unauthenticated|unavailable/.test(msg)
  );
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
 * Generate a single AP Physics C kinematics practice question by calling the
 * `generatePracticeQuestion` Cloud Function, which proxies OpenAI server-side.
 */
export async function generatePracticeQuestion(
  params: GenerateParams,
): Promise<AIPracticeQuestion> {
  let data: unknown;
  try {
    const callable = httpsCallable(functions, CALLABLE_NAME);
    const result = await callable({
      topic: params.topic,
      difficulty: params.difficulty,
      avoidPrompts: params.avoidPrompts,
    });
    data = result.data;
  } catch (err) {
    if (looksLikeUnavailable(err)) {
      throw makeError(
        "AI practice isn't set up yet. A maintainer needs to deploy the `generatePracticeQuestion` Cloud Function and set the OPENAI_API_KEY secret. Until then, practice falls back to the question bank.",
        err,
      );
    }
    throw makeError(
      "Couldn't generate a practice problem. Please try again.",
      err,
    );
  }

  try {
    return normalize(data);
  } catch (err) {
    throw makeError(
      "Couldn't generate a practice problem. Please try again.",
      err,
    );
  }
}
