const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { setGlobalOptions } = require("firebase-functions/v2");
const OpenAI = require("openai");
const { evaluate } = require("mathjs");

// The OpenAI key is stored as a Cloud Functions secret, never in the client
// bundle. Locally the emulator reads it from functions/.env.local instead.
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

const MODEL = "gpt-4o-mini";

// How many times to regenerate when math.js flags the model's answer as wrong
// before giving up and letting the client fall back to the question bank.
const MAX_ATTEMPTS = 3;

// Cap concurrency so a runaway client can't fan out unbounded OpenAI spend.
setGlobalOptions({ maxInstances: 10 });

const DIFFICULTY_GUIDANCE = {
  easy: "Easy (≈ AP MC opener): one concept applied directly — a single plug-in calculation or a clean qualitative check. Numbers should work out cleanly.",
  medium: "Medium (≈ typical AP MC): two steps or two combined ideas, e.g. ratio reasoning, reading a described v–t/x–t trend, or a two-stage motion.",
  hard: "Hard (≈ AP MC stinger / FRQ part): multi-step reasoning, a subtle conceptual trap, calculus on a given x(t)/v(t)/a(t), or a scenario where a common shortcut gives the wrong answer.",
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

// ---------------------------------------------------------------------------
// math.js answer verification
//
// The model can't be trusted to do arithmetic perfectly, so before returning a
// question we recompute the math it showed in its own explanation and confirm
// the declared answer agrees. We can only check what's actually computable; for
// purely conceptual questions (no arithmetic in the explanation) we pass through
// unchanged rather than reject good content. Everything is wrapped so a parse
// error can never crash the function.
// ---------------------------------------------------------------------------

/** Rewrite common unicode math notation into ASCII that math.js understands. */
function normalizeMath(text) {
  return String(text)
    .replace(/½/g, "(1/2)")
    .replace(/⅓/g, "(1/3)")
    .replace(/⅔/g, "(2/3)")
    .replace(/¼/g, "(1/4)")
    .replace(/¾/g, "(3/4)")
    .replace(/[−–—]/g, "-")
    .replace(/[×·]/g, "*")
    .replace(/÷/g, "/")
    .replace(/⁰/g, "^0")
    .replace(/¹/g, "^1")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/⁴/g, "^4")
    .replace(/⁵/g, "^5")
    .replace(/⁶/g, "^6")
    .replace(/√\s*\(/g, "sqrt(")
    .replace(/√\s*([0-9.]+)/g, "sqrt($1)");
}

/** Evaluate a single arithmetic fragment, or null if it isn't safely computable. */
function evalArithmetic(fragment) {
  // Keep math characters plus letters (so the `sqrt` function survives); other
  // symbols (units, words) become spaces.
  let cleaned = fragment.replace(/[^0-9.+\-*/^()\sA-Za-z]/g, " ");
  // The only function we allow is sqrt. Any other letters mean this is a
  // symbolic expression with variables (e.g. "g t", "Δx/Δt"), not a pure
  // computation we can trust — reject it.
  if (/[A-Za-z]/.test(cleaned.replace(/sqrt/gi, " "))) return null;
  cleaned = cleaned.replace(/\s+/g, "");
  if (!cleaned) return null;
  // Require a real operation (binary operator or sqrt) so bare answer
  // restatements (e.g. "= 4 m/s") don't trivially "verify" themselves.
  if (!/[+\-*/^]/.test(cleaned.replace(/^[+-]/, "")) && !/sqrt/i.test(cleaned)) {
    return null;
  }
  // Bail on unbalanced parens so math.js never throws on a partial fragment.
  let depth = 0;
  for (const ch of cleaned) {
    if (ch === "(") depth += 1;
    else if (ch === ")") depth -= 1;
    if (depth < 0) return null;
  }
  if (depth !== 0) return null;
  try {
    const result = evaluate(cleaned);
    return typeof result === "number" && Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

/** Pull every computable arithmetic result out of a free-text explanation. */
function collectResults(text) {
  if (typeof text !== "string") return [];
  const normalized = normalizeMath(text);
  const out = [];
  // Quantities on either side of "=" / "≈" are claimed equal; evaluate each.
  for (const part of normalized.split(/[=≈]/)) {
    const value = evalArithmetic(part);
    if (value !== null) out.push(value);
  }
  return out;
}

/** Leading numeric value of an option label (e.g. "1 s" → 1), or null. */
function leadingNumber(label) {
  const m = normalizeMath(String(label ?? "")).match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

/** Whether two numbers agree within grading tolerance (plus a rounding margin). */
function closeEnough(a, b, tolerance) {
  const eps = Math.max(tolerance ?? 0, Math.abs(b) * 0.02, 0.01);
  return Math.abs(a - b) <= eps;
}

/**
 * Verify a parsed question against math.js. Returns one of:
 *  - { status: "ok" }            verified consistent, or not computable (pass through)
 *  - { status: "inconsistent" }  the declared answer contradicts the math → regenerate
 */
function verifyQuestion(parsed) {
  if (!parsed || typeof parsed !== "object") {
    return { status: "ok", detail: "unparseable — left to client validation" };
  }

  if (parsed.type === "numeric") {
    const value = parsed.value;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return { status: "ok", detail: "no numeric value to verify" };
    }
    const results = collectResults(parsed.explanation);
    if (results.length === 0) {
      return { status: "ok", detail: "no computable arithmetic — conceptual passthrough" };
    }
    const match = results.some((r) => closeEnough(r, value, parsed.tolerance));
    return match
      ? { status: "ok", detail: "numeric answer matches explanation math" }
      : {
          status: "inconsistent",
          detail: `declared value ${value} matches none of computed [${results
            .map((r) => Number(r.toFixed(4)))
            .join(", ")}]`,
        };
  }

  if (parsed.type === "multipleChoice" && Array.isArray(parsed.options)) {
    const correct = parsed.options.find((o) => o && o.id === parsed.correctOptionId);
    const correctNum = correct ? leadingNumber(correct.label) : null;
    if (correctNum === null) {
      return { status: "ok", detail: "non-numeric options — conceptual passthrough" };
    }
    const results = collectResults(parsed.explanation);
    if (results.length === 0) {
      return { status: "ok", detail: "no computable arithmetic — conceptual passthrough" };
    }
    // Find every option whose number matches a computed result.
    const numbered = parsed.options
      .map((o) => ({ id: o.id, num: leadingNumber(o.label) }))
      .filter((o) => o.num !== null);
    const matchesComputed = (n) => results.some((r) => closeEnough(r, n, undefined));
    const matching = numbered.filter((o) => matchesComputed(o.num));
    if (matching.length === 0) {
      // The computation didn't land on any option; don't trust it to reject.
      return { status: "ok", detail: "computation matched no option — passthrough" };
    }
    if (matching.length === 1 && matching[0].id === parsed.correctOptionId) {
      return { status: "ok", detail: "exactly one option matches the math" };
    }
    return {
      status: "inconsistent",
      detail: `computed answer does not uniquely match the keyed option (${parsed.correctOptionId})`,
    };
  }

  return { status: "ok", detail: "unrecognized type — left to client validation" };
}

function buildPrompt(params) {
  const { topic, difficulty, avoidPrompts } = params;
  const guidance = DIFFICULTY_GUIDANCE[difficulty] || DIFFICULTY_GUIDANCE.medium;
  const lines = [
    `Topic: "${topic.title}".`,
    `Concept to focus on: ${topic.blurb}`,
    `Difficulty — ${guidance}`,
    "Write it like a real AP Physics exam kinematics item — exam-style phrasing, a concrete physical scenario (a car, ball, runner, projectile, particle with a given x(t)/v(t)/a(t), etc.), and realistic clean numbers.",
    "Reward AP-style reasoning where it fits: ratio reasoning (e.g. stopping distance ∝ v², range ∝ v²), the independence of horizontal and vertical motion, motion symmetry, and the sign relationship between velocity and acceleration (speeding up vs. slowing down).",
    "Use g = 9.8 m/s^2 for gravitational acceleration where relevant. State every quantity needed to answer; never rely on a figure, graph image, or table.",
    "",
    'If type is "multipleChoice": produce exactly 4 options with ids "a","b","c","d", set correctOptionId, and set value/tolerance/unit to null. Make all four options plausible and similar in form, and base the three distractors on SPECIFIC common student mistakes (e.g. forgetting a factor of ½, confusing distance with displacement, using v instead of v², sign errors, assuming zero acceleration at the peak). Do NOT make the correct option the longest or most detailed, and avoid "all/none of the above".',
    'If type is "numeric": set value, a sensible absolute tolerance (≈1–2% of the answer, or 0.1 for small integers), and unit (e.g. "m/s"), and set options/correctOptionId to null.',
    "Keep the prompt self-contained and unambiguous, and always include a concise worked explanation whose arithmetic exactly produces the stated answer.",
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

    const messages = [
      {
        role: "system",
        content:
          "You are an experienced AP Physics exam item-writer creating one original kinematics practice problem in the style of the College Board's released multiple-choice and free-response questions. Write fresh, original content (never copy real exam questions). Return ONLY JSON matching the provided schema. Double-check every calculation; the declared answer MUST match the arithmetic in your explanation.",
      },
      { role: "user", content: buildPrompt(params) },
    ];

    // Generate → verify with math.js → regenerate on contradiction. We never
    // ship an answer the math disagrees with; if all attempts fail we throw so
    // the client falls back to the curated question bank instead.
    let lastIssue = "unknown";
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      let content;
      try {
        const completion = await client.chat.completions.create({
          model: MODEL,
          temperature: 0.8,
          response_format: RESPONSE_FORMAT,
          messages,
        });
        content = completion.choices?.[0]?.message?.content;
      } catch (err) {
        // A hard API/network error won't fix itself on retry — fail fast.
        console.error("[generatePracticeQuestion] OpenAI call failed", err);
        throw new HttpsError("internal", "Failed to generate a question.");
      }

      if (!content) {
        lastIssue = "empty model response";
        console.warn(`[generatePracticeQuestion] ${lastIssue} (attempt ${attempt}/${MAX_ATTEMPTS})`);
        continue;
      }

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        lastIssue = "invalid JSON";
        console.warn(`[generatePracticeQuestion] ${lastIssue} (attempt ${attempt}/${MAX_ATTEMPTS})`);
        continue;
      }

      const check = verifyQuestion(parsed);
      if (check.status === "ok") {
        console.log(
          `[generatePracticeQuestion] OK via ${MODEL} (attempt ${attempt}; ${check.detail}) — ${parsed.type} on "${params.topic.title}" (${params.difficulty})`,
        );
        return parsed;
      }

      lastIssue = check.detail;
      console.warn(
        `[generatePracticeQuestion] math.js rejected the answer (attempt ${attempt}/${MAX_ATTEMPTS}): ${check.detail}`,
      );
      // Nudge the model to fix its arithmetic on the next attempt.
      messages.push({
        role: "user",
        content:
          "That problem's stated answer did not match its own arithmetic. Write a NEW problem and make absolutely sure the correct answer matches the math in the explanation.",
      });
    }

    console.error(
      `[generatePracticeQuestion] giving up after ${MAX_ATTEMPTS} attempts: ${lastIssue}`,
    );
    throw new HttpsError(
      "failed-precondition",
      "Could not produce a verified question; falling back to the question bank.",
    );
  },
);
