const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { setGlobalOptions } = require("firebase-functions/v2");
const OpenAI = require("openai");

// The OpenAI key is stored as a Cloud Functions secret, never in the client
// bundle. Locally the emulator reads it from functions/.env.local instead.
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

const MODEL = "gpt-4o-mini";

// Cap concurrency so a runaway client can't fan out unbounded OpenAI spend.
setGlobalOptions({ maxInstances: 10 });

const DIFFICULTY_GUIDANCE = {
  easy: "Easy: a single-concept plug-in calculation or a qualitative conceptual check.",
  medium: "Medium: requires two steps or combining two ideas.",
  hard: "Hard: multi-step reasoning or a trickier conceptual subtlety.",
};

/**
 * Structured-output JSON schema. OpenAI strict mode requires every property to
 * be listed in `required` and `additionalProperties: false`, so the fields that
 * only apply to one question type are made nullable and the model is told to
 * null out the irrelevant ones.
 */
const RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "practice_question",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        type: {
          type: "string",
          enum: ["multipleChoice", "numeric"],
          description:
            'Question kind: "multipleChoice" (4 options) or "numeric".',
        },
        prompt: { type: "string", description: "The question text." },
        options: {
          type: ["array", "null"],
          description:
            'Exactly 4 choices for multipleChoice (ids "a","b","c","d"); null for numeric.',
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              label: { type: "string" },
            },
            required: ["id", "label"],
          },
        },
        correctOptionId: {
          type: ["string", "null"],
          description: "For multipleChoice: id of the correct option.",
        },
        value: {
          type: ["number", "null"],
          description: "For numeric: the correct numeric answer.",
        },
        tolerance: {
          type: ["number", "null"],
          description: "For numeric: absolute grading tolerance.",
        },
        unit: {
          type: ["string", "null"],
          description: 'For numeric: the unit, e.g. "m/s".',
        },
        explanation: {
          type: "string",
          description: "Concise worked explanation shown after answering.",
        },
      },
      required: [
        "type",
        "prompt",
        "options",
        "correctOptionId",
        "value",
        "tolerance",
        "unit",
        "explanation",
      ],
    },
  },
};

function buildPrompt(params) {
  const { topic, difficulty, avoidPrompts } = params;
  const guidance = DIFFICULTY_GUIDANCE[difficulty] || DIFFICULTY_GUIDANCE.medium;
  const lines = [
    `Topic: "${topic.title}".`,
    `Concept to focus on: ${topic.blurb}`,
    `Difficulty — ${guidance}`,
    "Ground the problem strictly in AP Physics C kinematics for this topic.",
    "Use g = 9.8 m/s^2 for gravitational acceleration where relevant.",
    "",
    'If type is "multipleChoice": produce exactly 4 options with ids "a","b","c","d", set correctOptionId, and set value/tolerance/unit to null.',
    'If type is "numeric": set value, a sensible absolute tolerance, and unit (e.g. "m/s"), and set options/correctOptionId to null.',
    "Keep the prompt self-contained and unambiguous, and always include an explanation.",
  ];

  if (Array.isArray(avoidPrompts) && avoidPrompts.length > 0) {
    lines.push(
      "",
      "Do NOT reuse or closely paraphrase any of these already-seen prompts:",
      ...avoidPrompts.map((p) => `- ${p}`),
    );
  }
  return lines.join("\n");
}

function validateParams(data) {
  const topic = data && data.topic;
  const difficulty = data && data.difficulty;
  if (!topic || typeof topic.title !== "string" || typeof topic.blurb !== "string") {
    throw new HttpsError("invalid-argument", "Missing or malformed `topic`.");
  }
  if (!["easy", "medium", "hard"].includes(difficulty)) {
    throw new HttpsError("invalid-argument", "Invalid `difficulty`.");
  }
  const avoidPrompts = Array.isArray(data.avoidPrompts)
    ? data.avoidPrompts.filter((p) => typeof p === "string").slice(0, 30)
    : [];
  return { topic, difficulty, avoidPrompts };
}

/**
 * Callable: generate a single AP Physics C kinematics practice question via
 * OpenAI structured output. Returns the raw question object; the client
 * validates/normalizes and assigns its own id.
 */
exports.generatePracticeQuestion = onCall(
  { secrets: [OPENAI_API_KEY] },
  async (request) => {
    // Only signed-in learners may spend OpenAI quota.
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in to use AI practice.");
    }

    const params = validateParams(request.data || {});
    const client = new OpenAI({ apiKey: OPENAI_API_KEY.value() });

    let content;
    try {
      const completion = await client.chat.completions.create({
        model: MODEL,
        temperature: 0.8,
        response_format: RESPONSE_FORMAT,
        messages: [
          {
            role: "system",
            content:
              "You are an expert AP Physics C: Mechanics tutor writing one original practice problem. Return ONLY JSON matching the provided schema.",
          },
          { role: "user", content: buildPrompt(params) },
        ],
      });
      content = completion.choices?.[0]?.message?.content;
    } catch (err) {
      console.error("[generatePracticeQuestion] OpenAI call failed", err);
      throw new HttpsError("internal", "Failed to generate a question.");
    }

    if (!content) {
      throw new HttpsError("internal", "Model returned an empty response.");
    }

    try {
      const parsed = JSON.parse(content);
      console.log(
        `[generatePracticeQuestion] OK via ${MODEL} — ${parsed.type} on "${params.topic.title}" (${params.difficulty})`,
      );
      return parsed;
    } catch (err) {
      console.error("[generatePracticeQuestion] bad JSON from model", content);
      throw new HttpsError("internal", "Model returned invalid JSON.");
    }
  },
);
