/**
 * @file calculator.ts
 *
 * This file provides the primary logic for:
 * 1. Counting tokens for textual and image-based messages (via a Web Worker).
 * 2. Calculating costs based on per-model rates.
 * 3. Aggregating usage data by day, hour, and model.
 *
 * All functionality remains the same as the original, with variable and function
 * names refactored for clarity and maintainability. Additional documentation,
 * minor cleanup, and edge-case handling have been added where appropriate.
 */

//
// ─── MODEL COST DEFINITIONS ─────────────────────────────────────────────────────
//

/**
 * Cost configuration per model, priced per **million** tokens for input and output.
 * Text-based model usage cost = (inputTokens / 1e6 * inputRate) + (outputTokens / 1e6 * outputRate).
 */
export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "o1-pro": { input: 150.0, output: 600.0 },
  "o1-mini": { input: 1.1, output: 4.4 },
  "o4-mini-high": { input: 1.1, output: 4.4 },
  "o4-mini": { input: 1.1, output: 4.4 },
  "gpt-4": { input: 30.0, output: 60.0 },
  "gpt-4-turbo": { input: 10.0, output: 30.0 },
  "gpt-4o": { input: 5.0, output: 15.0 },
  "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
  "o3-mini": { input: 1.1, output: 4.4 },
  "o3-mini-high": { input: 1.1, output: 4.4 },
  "gpt-4o-jawbone": { input: 2.5, output: 10.0 },
  "gpt-4-5": { input: 75.0, output: 150.0 },
  "text-davinci-002-render-sha": { input: 12.0, output: 12.0 },
  o1: { input: 15.0, output: 60.0 },
  o3: { input: 10.0, output: 40.0 },
  "o1-preview": { input: 15.0, output: 60.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4-gizmo": { input: 30.0, output: 60.0 },
  "gpt-4-code-interpreter": { input: 30.0, output: 60.0 },
  auto: { input: 5.0, output: 15.0 },
  research: { input: 1.1, output: 4.4 },

  // Image models have a flat per-image cost. See IMAGE_MODEL_COSTS below.
  "dalle-2": { input: 0, output: 0 },
  "dalle-3": { input: 0, output: 0 },
  "gpt-image-1": { input: 0, output: 0 },
};

/**
 * Flat cost per image for image generation models (in USD). If a model slug
 * is in this object, we calculate cost as (numberOfImages * costPerImage).
 */
export const IMAGE_MODEL_COSTS: Record<string, number> = {
  "dalle-2": 0.02,
  "dalle-3": 0.08,
  "gpt-image-1": 0.167,
};

//
// ─── WEB WORKER SETUP FOR TOKENIZATION (JS-TIKTOKEN) ───────────────────────────
//

let worker: Worker | null = null; // Worker instance
let workerReady = false; // Whether the worker is ready for requests
let nextRequestId = 0; // Unique ID generator for worker requests

// Maps request IDs to the resolve/reject callbacks of the promise waiting for token count
const pendingRequests = new Map<number, (value: number) => void>();
const errorCallbacks = new Map<number, (reason?: any) => void>();

// Track when the worker started (for performance logging)
let workerStartTime: number | null = null;

/**
 * Lazily create or retrieve the tokenizer worker. Once created, it will be
 * reused until terminated.
 * @throws Error if running in a non-browser environment.
 */
function initTokenizerWorker(): Worker {
  if (typeof window === "undefined") {
    throw new Error("Tokenizer worker can only be initialized in the browser.");
  }

  if (!worker) {
    console.log("Creating Tokenizer Worker (js-tiktoken)...");
    workerStartTime = performance.now();

    // Initialize the worker, referencing the 'tokenizer.worker.ts' module.
    worker = new Worker(new URL("./tokenizer.worker.ts", import.meta.url), {
      type: "module",
    });

    worker.onmessage = (event: MessageEvent) => {
      const { id, count, error, fallbackUsed, type } = event.data;

      // Handle special worker signals
      if (type === "WORKER_READY") {
        // Worker finished its initialization
        const readyTime = workerStartTime
          ? (performance.now() - workerStartTime).toFixed(2)
          : "N/A";
        console.log(
          `Tokenizer Worker is ready. Initialization took ${readyTime} ms.`
        );
        workerStartTime = null;
        workerReady = true;
        return;
      }

      // Handle token count responses
      const resolve = pendingRequests.get(id);
      const reject = errorCallbacks.get(id);

      if (resolve && reject) {
        if (error) {
          console.warn(
            `Worker returned an error for request ${id}: ${error}${
              fallbackUsed ? " (fallback used)" : ""
            }`
          );
          // If the worker had to fallback to an estimate, we use that count
          if (fallbackUsed && typeof count === "number") {
            resolve(count);
          } else {
            reject(new Error(error));
          }
        } else if (typeof count === "number") {
          resolve(count);
        } else {
          reject(new Error(`Invalid response from worker for request ${id}.`));
        }

        pendingRequests.delete(id);
        errorCallbacks.delete(id);
      } else {
        console.warn(`Received message for unknown request ID: ${id}`);
      }
    };

    worker.onerror = (error: ErrorEvent) => {
      console.error("Tokenizer Worker Error:", error);
      workerReady = false;
      // Reject all pending promises
      errorCallbacks.forEach((rejectCallback) => {
        rejectCallback(new Error(`Worker error: ${error.message}`));
      });
      pendingRequests.clear();
      errorCallbacks.clear();
      worker = null;
    };
  }
  return worker;
}

/**
 * Count the tokens in a given text using the Web Worker. If the worker is not
 * ready, this function will wait and retry briefly until it is.
 * @param text The text to tokenize
 * @returns A promise resolving to the token count
 */
async function countTextTokens(text: string): Promise<number> {
  // Quick returns
  if (!text) return 0;
  if (typeof window === "undefined") {
    // Fallback estimate on server side
    console.warn(
      "Warning: token counting attempted in non-browser environment. Using fallback estimation."
    );
    return Math.ceil(text.length / 4);
  }

  const tokenizerWorker = initTokenizerWorker();
  const requestId = nextRequestId++;

  return new Promise<number>((resolve, reject) => {
    pendingRequests.set(requestId, resolve);
    errorCallbacks.set(requestId, reject);

    // Attempt to post the message once the worker is ready
    function attemptPostMessage() {
      if (workerReady && tokenizerWorker) {
        try {
          tokenizerWorker.postMessage({ id: requestId, text });
        } catch (postError: any) {
          console.error(
            "Failed to post message to tokenizer worker:",
            postError
          );
          pendingRequests.delete(requestId);
          errorCallbacks.delete(requestId);
          reject(postError);
        }
      } else if (!tokenizerWorker) {
        // Worker failed completely
        console.error(
          "Tokenizer Worker unavailable. Cannot process token count."
        );
        reject(new Error("Tokenizer Worker not available."));
        pendingRequests.delete(requestId);
        errorCallbacks.delete(requestId);
      } else {
        setTimeout(attemptPostMessage, 50);
      }
    }

    attemptPostMessage();
  });
}

/**
 * Terminate the tokenizer worker and clear any pending requests. Use this if the
 * worker is no longer needed.
 */
export function terminateTokenizerWorker() {
  if (worker) {
    console.log("Terminating Tokenizer Worker...");
    worker.terminate();
    worker = null;
    workerReady = false;
    pendingRequests.clear();
    errorCallbacks.clear();
  }
}

//
// ─── IMAGE TOKEN ESTIMATION ─────────────────────────────────────────────────────
//

/**
 * Estimate token usage for images based on their dimensions and a detail level.
 * - "low" detail -> 85 tokens (constant)
 * - "high" detail -> each 512x512 tile is 170 tokens + a base 85 tokens
 *
 * @param width  Image width in pixels
 * @param height Image height in pixels
 * @param detail "low" | "high" (defaults to "high")
 * @returns A promise that resolves to the estimated token count
 */
export async function countImageTokens(
  width: number,
  height: number,
  detail: string = "high"
): Promise<number> {
  // Low-resolution scenario
  if (detail.toLowerCase() === "low") {
    return 85;
  }

  // If image is bigger than 2048 on either dimension, scale down
  if (width > 2048 || height > 2048) {
    const aspectRatio = width / height;
    if (aspectRatio > 1) {
      width = 2048;
      height = Math.floor(2048 / aspectRatio);
    } else {
      height = 2048;
      width = Math.floor(2048 * aspectRatio);
    }
  }

  // Break the image into 512x512 tiles
  const tilesWide = Math.ceil(width / 512);
  const tilesHigh = Math.ceil(height / 512);
  const numTiles = tilesWide * tilesHigh;

  // Base 85 + 170 per tile
  return 85 + 170 * numTiles;
}

//
// ─── DATE/TIME HELPER FUNCTIONS ─────────────────────────────────────────────────
//

/**
 * Convert a Unix timestamp (in seconds or milliseconds) to a UTC YYYY-MM-DD string.
 * @param unixTime Unix timestamp in seconds (or ms, if > 1e11)
 */
export function getDayKey(unixTime: number): string {
  // If obviously in milliseconds, convert to seconds
  if (unixTime > 1e11) {
    unixTime = Math.floor(unixTime / 1000);
  }
  const date = new Date(unixTime * 1000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Extract the hour (0-23) from a Unix timestamp (in seconds or milliseconds).
 * @param unixTime Unix timestamp in seconds (or ms, if > 1e11)
 */
export function getHourOfDay(unixTime: number): number {
  if (unixTime > 1e11) {
    unixTime = Math.floor(unixTime / 1000);
  }
  return new Date(unixTime * 1000).getUTCHours();
}

//
// ─── AGGREGATION DATA STRUCTURES ────────────────────────────────────────────────
//

/**
 * Represents usage statistics for a single hour.
 */
export interface HourBucket {
  input_tokens: number;
  output_tokens: number;
  cost: number;
  message_count: number;
  conversation_count: number;
}

/**
 * Encompasses daily totals + an array of hour-by-hour usage details.
 */
export interface BucketWithHours {
  input_tokens: number;
  output_tokens: number;
  cost: number;
  message_count: number;
  conversation_count: number;
  hours: HourBucket[]; // 24 elements, one per hour
}

/**
 * Represents usage on a given day, including:
 * - `total` usage across all models
 * - A `models` record keyed by model slug, each containing its own usage stats
 */
export interface DayBucket {
  total: BucketWithHours;
  models: Record<string, BucketWithHours>;
}

/**
 * Primary aggregation structure for the entire dataset, keyed by day.
 */
export interface Aggregator {
  usageByDay: Record<string, DayBucket>;
  startDate?: string;
  endDate?: string;
  totalCostAllModels?: number;
  allModelSlugs?: Set<string>;
}

//
// ─── AGGREGATION HELPER FUNCTIONS ───────────────────────────────────────────────
//

/**
 * Create an empty HourBucket with zeroed-out fields.
 */
function createHourBucket(): HourBucket {
  return {
    input_tokens: 0,
    output_tokens: 0,
    cost: 0,
    message_count: 0,
    conversation_count: 0,
  };
}

/**
 * Create a bucket structure that includes daily totals plus an array of 24 hour buckets.
 */
function createBucketWithHours(): BucketWithHours {
  return {
    input_tokens: 0,
    output_tokens: 0,
    cost: 0,
    message_count: 0,
    conversation_count: 0,
    hours: Array.from({ length: 24 }, () => createHourBucket()),
  };
}

/**
 * Create a DayBucket containing a total bucket and a record for models.
 */
function createDayBucket(): DayBucket {
  return {
    total: createBucketWithHours(),
    models: {},
  };
}

/**
 * Update the aggregator with new usage data for a given day/hour/model.
 *
 * @param aggregator  The global aggregator structure
 * @param dayKey      Date string (YYYY-MM-DD)
 * @param hour        Hour of the day (0-23)
 * @param modelSlug   The model slug used
 * @param inputTokens Number of input (prompt) tokens
 * @param outputTokens Number of output tokens (assistant response)
 */
function updateAggregatorUsage(
  aggregator: Aggregator,
  dayKey: string,
  hour: number,
  modelSlug: string,
  inputTokens: number,
  outputTokens: number
) {
  // Ensure day bucket exists
  if (!aggregator.usageByDay[dayKey]) {
    aggregator.usageByDay[dayKey] = createDayBucket();
  }
  const dayBucket = aggregator.usageByDay[dayKey];

  // Ensure model bucket for that day
  if (!dayBucket.models[modelSlug]) {
    dayBucket.models[modelSlug] = createBucketWithHours();
  }
  const modelBucket = dayBucket.models[modelSlug];

  // Calculate cost for this batch of tokens
  let cost = 0;

  if (modelSlug in IMAGE_MODEL_COSTS) {
    // Image model cost based on number of images (we store them in outputTokens).
    const numberOfImages = outputTokens;
    cost = numberOfImages * IMAGE_MODEL_COSTS[modelSlug];
  } else {
    // Text-based model cost
    const costCfg = MODEL_COSTS[modelSlug] || { input: 0, output: 0 };
    cost =
      (inputTokens / 1e6) * costCfg.input +
      (outputTokens / 1e6) * costCfg.output;
  }

  //
  // Update model's hour bucket
  //
  modelBucket.hours[hour].input_tokens += inputTokens;
  modelBucket.hours[hour].output_tokens += outputTokens;
  modelBucket.hours[hour].cost += cost;
  modelBucket.hours[hour].message_count += 1;

  //
  // Update model's daily totals
  //
  modelBucket.input_tokens += inputTokens;
  modelBucket.output_tokens += outputTokens;
  modelBucket.cost += cost;
  modelBucket.message_count += 1;

  //
  // Update day's total hour bucket
  //
  dayBucket.total.hours[hour].input_tokens += inputTokens;
  dayBucket.total.hours[hour].output_tokens += outputTokens;
  dayBucket.total.hours[hour].cost += cost;
  dayBucket.total.hours[hour].message_count += 1;

  //
  // Update day's total daily totals
  //
  dayBucket.total.input_tokens += inputTokens;
  dayBucket.total.output_tokens += outputTokens;
  dayBucket.total.cost += cost;
  dayBucket.total.message_count += 1;
}

//
// ─── PER-CONVERSATION PROCESSING ────────────────────────────────────────────────
//

/**
 * Process a single conversation object (in the ChatGPT-style export format).
 * Identifies day/hour from the conversation's `create_time` and aggregates
 * usage data into the provided Aggregator.
 *
 * @param conversation A single conversation object from the export
 * @param aggregator   The global aggregator structure
 * @returns A set of model slugs used in this conversation
 */
export async function processConversation(
  conversation: any,
  aggregator: Aggregator
): Promise<Set<string>> {
  let conversationTimestamp = conversation?.create_time ?? Date.now() / 1000;
  let dayKey = "unknown-day";
  let hour = 0;

  // Attempt to parse the conversation timestamp safely
  try {
    dayKey = getDayKey(conversationTimestamp);
    hour = getHourOfDay(conversationTimestamp);
  } catch (err) {
    console.warn(
      "Could not parse create_time, defaulting to 'unknown-day' and hour = 0.",
      err
    );
  }

  // Ensure aggregator has a dayBucket for dayKey if dayKey is recognized
  if (dayKey !== "unknown-day" && !aggregator.usageByDay[dayKey]) {
    aggregator.usageByDay[dayKey] = createDayBucket();
  }

  // Track which models were used in this conversation
  const modelsUsedInConversation = new Set<string>();

  // If "mapping" field is present => typical ChatGPT format
  if (conversation?.mapping) {
    const used = await processMappedMessages(
      conversation.mapping,
      dayKey,
      hour,
      aggregator
    );
    used.forEach((m) => modelsUsedInConversation.add(m));
  } else {
    // No recognized data structure
    console.warn(
      "Conversation skipped: No 'mapping' field found.",
      conversation?.title
    );
  }

  // For each conversation, increment the conversation_count in the aggregator
  // for the day total and for each model used.
  if (dayKey !== "unknown-day" && modelsUsedInConversation.size > 0) {
    const dayBucket = aggregator.usageByDay[dayKey];
    dayBucket.total.conversation_count += 1; // One conversation overall

    modelsUsedInConversation.forEach((modelSlug) => {
      if (!dayBucket.models[modelSlug]) {
        dayBucket.models[modelSlug] = createBucketWithHours();
      }
      dayBucket.models[modelSlug].conversation_count += 1;
    });
  }

  return modelsUsedInConversation;
}

/**
 * Process an array of "flattened" messages that already contain pre-calculated
 * token counts. Updates the aggregator with final usage data.
 *
 * @param messages  A flat array of messages with token info
 * @param dayKey    Date key for the conversation
 * @param hour      Hour of day
 * @param aggregator The global aggregator structure
 * @returns Set of models used in these messages
 */
export async function processFlatMessagesWithTokenCounts(
  messages: any[],
  dayKey: string,
  hour: number,
  aggregator: Aggregator
): Promise<Set<string>> {
  let rollingContextTokens = 0;
  let rollingOutputTokens = 0;
  const modelsUsed = new Set<string>();

  for (const msg of messages) {
    const role = msg.role ?? "unknown";
    const contentTokens = msg.contentTokens ?? 0;
    const searchTokens = msg.searchTokens ?? 0;
    const outputTokens = msg.outputTokens ?? 0;
    const modelSlug = msg.model_slug ?? "unknown_model";

    // If this message is a reasoning recap, we skip it
    if (msg.isReasoningRecap) {
      continue;
    }

    // Add any "search" tokens to context (search results)
    if (searchTokens > 0) {
      rollingContextTokens += searchTokens;
    }

    // Process user/system/tool roles
    if (role === "user" || role === "system" || role === "tool") {
      // They contribute tokens to the "context" that goes into the next LLM response
      rollingContextTokens += contentTokens;
    } else if (role === "assistant") {
      // If it's an assistant message, we accumulate tokens for final usage increment
      if (modelSlug !== "unknown_model") {
        modelsUsed.add(modelSlug);
      }

      rollingContextTokens += contentTokens + outputTokens;
      rollingOutputTokens += outputTokens;

      // Only increment aggregator usage if it's the final message in a turn
      if (msg.isFinalMessage) {
        updateAggregatorUsage(
          aggregator,
          dayKey,
          hour,
          modelSlug,
          rollingContextTokens,
          rollingOutputTokens
        );
        rollingOutputTokens = 0;
      }
    }
  }
  return modelsUsed;
}

/**
 * Process "mapped" ChatGPT-style messages from a conversation's `mapping` object
 * (the structure used by exported ChatGPT JSON).
 *
 * This function flattens the messages, pre-calculates token usage, then calls
 * `processFlatMessagesWithTokenCounts` to finalize aggregator usage.
 *
 * @param mapping    The conversation.mapping object
 * @param dayKey     Date string (YYYY-MM-DD)
 * @param hour       Hour of the day (0-23)
 * @param aggregator The global aggregator
 * @returns A set of model slugs used in these messages
 */
export async function processMappedMessages(
  mapping: any,
  dayKey: string,
  hour: number,
  aggregator: Aggregator
): Promise<Set<string>> {
  const nodeMessages = [];
  const modelsUsed = new Set<string>();

  for (const nodeKey of Object.keys(mapping)) {
    const node = mapping[nodeKey];
    if (!node?.message) continue;

    const msg = node.message;
    const role = msg.author?.role ?? "unknown";
    const authorName = msg.author?.name ?? "";

    let contentTokens = 0;
    let searchTokens = 0;
    let outputTokens = 0;
    let modelSlug =
      msg.metadata?.model_slug || node.metadata?.model_slug || "unknown_model";

    const isReasoningMessage =
      msg.metadata?.reasoning_status === "is_reasoning" ||
      msg.content?.content_type === "thoughts";

    //
    // USER or SYSTEM messages
    //
    if (role === "user" || role === "system") {
      // Check if text is split into parts array
      if (Array.isArray(msg.content?.parts)) {
        for (const part of msg.content.parts) {
          if (typeof part === "string") {
            contentTokens += await countTextTokens(part);
          } else if (part && typeof part === "object") {
            // Possibly an image or unknown object
            if (
              part.asset_pointer ||
              part.content_type === "image_asset_pointer"
            ) {
              const w = part.width || 1024;
              const h = part.height || 1024;
              contentTokens += await countImageTokens(w, h, "high");
            } else {
              contentTokens += 20; // fallback for unknown
            }
          }
        }
      } else if (msg.content?.text) {
        contentTokens += await countTextTokens(msg.content.text);
      }

      // Some system messages reference about_model_message
      const aboutModelMsg =
        msg.metadata?.user_context_message_data?.about_model_message;
      if (aboutModelMsg) {
        contentTokens += await countTextTokens(aboutModelMsg);
      }
    }

    //
    // TOOL MESSAGES (search results, image generation, etc.)
    //
    if (role === "tool") {
      // Possibly a search result
      if (msg.metadata?.search_result_groups) {
        try {
          const searchResultsText = JSON.stringify(
            msg.metadata.search_result_groups
          );
          searchTokens = await countTextTokens(searchResultsText);
        } catch (err) {
          console.warn(
            `Could not tokenize search_result_groups for node ${nodeKey}:`,
            err
          );
        }
      }

      // Also parse the tool's own content
      if (Array.isArray(msg.content?.parts)) {
        for (const part of msg.content.parts) {
          if (typeof part === "string") {
            contentTokens += await countTextTokens(part);
          }
        }
      }

      // DALL·E detection
      if (authorName === "dalle.text2im") {
        // Count how many images
        const partsArray = msg.content?.parts ?? [];
        const numDalleImages = partsArray.filter(
          (p: any) => p?.content_type === "image_asset_pointer"
        ).length;
        if (numDalleImages > 0) {
          // We'll treat them as dalle-3
          updateAggregatorUsage(
            aggregator,
            dayKey,
            hour,
            "dalle-3",
            0,
            numDalleImages
          );
          modelsUsed.add("dalle-3");
        }
      }

      // GPT-4o image generation detection
      const partsArray = Array.isArray(msg.content?.parts)
        ? msg.content.parts
        : [];
      const hasAsyncImageGen =
        msg.metadata?.image_gen_async ||
        partsArray.some(
          (p: any) => p?.content_type === "image_asset_pointer"
        ) ||
        msg.metadata?.generation ||
        partsArray.some((p: any) => p?.metadata?.generation) ||
        partsArray.some((p: any) => p?.metadata?.dalle);

      if (hasAsyncImageGen) {
        const numImages = partsArray.filter(
          (p: any) => p?.content_type === "image_asset_pointer"
        ).length;
        if (numImages > 0) {
          updateAggregatorUsage(
            aggregator,
            dayKey,
            hour,
            "gpt-image-1",
            0,
            numImages
          );
          modelsUsed.add("gpt-image-1");
        }
      }
    }

    //
    // ASSISTANT MESSAGES
    //
    if (role === "assistant" || role === "tool") {
      // Reasoning content
      if (msg.content?.content_type === "thoughts") {
        if (Array.isArray(msg.content.thoughts)) {
          for (const thought of msg.content.thoughts) {
            if (thought.content) {
              outputTokens += await countTextTokens(thought.content);
            }
            if (thought.summary) {
              outputTokens += await countTextTokens(thought.summary);
            }
          }
        }
      }

      // Code blocks
      if (msg.content?.content_type === "code" && msg.content.text) {
        outputTokens += await countTextTokens(msg.content.text);
      }

      // Execution output
      if (
        msg.content?.content_type === "execution_output" &&
        msg.content.text
      ) {
        contentTokens += await countTextTokens(msg.content.text);
      }

      // Tether quotes
      if (msg.content?.content_type === "tether_quote" && msg.content.text) {
        contentTokens += await countTextTokens(msg.content.text);
      } else if (
        msg.content?.content_type === "tether_browsing_display" &&
        msg.content.result
      ) {
        contentTokens += await countTextTokens(msg.content.result);
      }

      // Citations
      if (
        Array.isArray(msg.metadata?.citations) &&
        msg.metadata.citations.length > 0
      ) {
        try {
          const citationsText = JSON.stringify(msg.metadata.citations);
          contentTokens += await countTextTokens(citationsText);
        } catch (citationErr) {
          console.warn("Could not tokenize citations:", citationErr);
        }
        // If the message has some async task referencing deep research, treat model as "research"
        if (msg.metadata?.async_task_id?.includes("deepresch")) {
          modelSlug = "research";
        }
      }

      // Parts array
      if (Array.isArray(msg.content?.parts)) {
        for (const part of msg.content.parts) {
          if (typeof part === "string") {
            outputTokens += await countTextTokens(part);
          } else if (part && typeof part === "object") {
            // Possibly an image
            if (
              part.asset_pointer ||
              part.content_type === "image_asset_pointer"
            ) {
              const w = part.width || 1024;
              const h = part.height || 1024;
              contentTokens += await countImageTokens(w, h, "high");
            } else {
              outputTokens += 20; // fallback
            }
          }
        }
      }

      // Any direct text
      if (msg.content?.text) {
        outputTokens += await countTextTokens(msg.content.text);
      }
    }

    // If it's a final reasoning recap, skip it
    const isReasoningRecap =
      msg.content?.content_type === "reasoning_recap" ||
      msg.metadata?.reasoning_status === "reasoning_ended";

    // Append the constructed message
    nodeMessages.push({
      role,
      contentTokens,
      outputTokens,
      searchTokens,
      model_slug: modelSlug,
      isReasoningMessage,
      isReasoningRecap,
      isFinalMessage: msg?.end_turn || msg?.channel === "final",
    });
  }

  // Process the flattened messages
  const usedModelsInFlat = await processFlatMessagesWithTokenCounts(
    nodeMessages,
    dayKey,
    hour,
    aggregator
  );

  // Combine the models used
  usedModelsInFlat.forEach((model) => modelsUsed.add(model));
  return modelsUsed;
}

//
// ─── MAIN ENTRY POINT: PROCESS CONVERSATIONS ────────────────────────────────────
//

/**
 * Process an array of conversation objects (OpenAI/ChatGPT export). Scans for
 * new model slugs, aggregates usage by day/hour/model, and calculates total cost.
 *
 * @param data Array of conversation objects
 * @returns The fully populated `Aggregator` structure
 * @throws Error if the passed data is not an array
 */
export async function processConversations(data: any[]): Promise<Aggregator> {
  if (!Array.isArray(data)) {
    throw new Error("Expected an array of conversation objects.");
  }

  const aggregator: Aggregator = {
    usageByDay: {},
    allModelSlugs: new Set<string>(),
    startDate: undefined,
    endDate: undefined,
    totalCostAllModels: 0,
  };

  // 1) First pass: discover unknown model slugs and add them as zero-cost placeholders
  scanForModelSlugs(data);

  // 2) Determine global date range
  let minTimestamp = Infinity;
  let maxTimestamp = -Infinity;
  for (const conversation of data) {
    if (conversation && typeof conversation.create_time === "number") {
      minTimestamp = Math.min(minTimestamp, conversation.create_time);
      maxTimestamp = Math.max(maxTimestamp, conversation.create_time);
    }
  }
  if (minTimestamp !== Infinity) {
    aggregator.startDate = getDayKey(minTimestamp);
    aggregator.endDate = getDayKey(maxTimestamp);
  }

  // 3) Process each conversation, updating the aggregator
  for (let i = 0; i < data.length; i++) {
    const conversation = data[i];
    if (!conversation || typeof conversation !== "object") {
      console.warn(`Skipping invalid conversation at index ${i}.`);
      continue;
    }
    const modelsInThisConversation = await processConversation(
      conversation,
      aggregator
    );
    modelsInThisConversation.forEach((slug) =>
      aggregator.allModelSlugs?.add(slug)
    );
  }

  // 4) Calculate total cost across all days
  let totalCost = 0;
  for (const dayKey in aggregator.usageByDay) {
    totalCost += aggregator.usageByDay[dayKey].total.cost;
  }
  aggregator.totalCostAllModels = totalCost;

  console.log("Aggregation complete. Final aggregator:", aggregator);
  return aggregator;
}

//
// ─── MODEL SLUG SCANNING ────────────────────────────────────────────────────────
//

/**
 * Scans a subset (or all) of the conversations to discover any model slugs that
 * are not yet in `MODEL_COSTS` or `IMAGE_MODEL_COSTS`. If a new slug is found,
 * a zero-cost placeholder is added to `MODEL_COSTS`.
 *
 * @param data    The array of conversation objects to scan
 * @param maxScan (Optional) Limit the number of conversations to scan
 * @returns A set of all discovered model slugs
 */
export function scanForModelSlugs(data: any[], maxScan?: number): Set<string> {
  const foundModels = new Set<string>();
  const scanCount = maxScan ? Math.min(data.length, maxScan) : data.length;

  console.log(
    `Scanning ${scanCount} of ${data.length} conversation(s) for model slugs...`
  );

  // Ensure these image models are always recognized
  foundModels.add("dalle-2");
  foundModels.add("dalle-3");
  foundModels.add("gpt-image-1");

  for (let i = 0; i < scanCount; i++) {
    const conversation = data[i];
    if (!conversation || typeof conversation !== "object") continue;

    // ChatGPT-like mapping
    if (conversation.mapping && typeof conversation.mapping === "object") {
      for (const nodeKey of Object.keys(conversation.mapping)) {
        const node = conversation.mapping[nodeKey];
        const msgModelSlug = node?.message?.metadata?.model_slug;
        const nodeModelSlug = node?.metadata?.model_slug;
        if (msgModelSlug) foundModels.add(msgModelSlug);
        if (nodeModelSlug) foundModels.add(nodeModelSlug);

        // DALL·E or GPT-4o image detection
        const authorName = node?.message?.author?.name;
        if (authorName === "dalle.text2im") {
          foundModels.add("dalle-3");
        }
        if (node?.message?.metadata?.image_gen_async) {
          foundModels.add("gpt-image-1");
        }
      }
    }

    // Direct messages array
    if (Array.isArray(conversation.messages)) {
      for (const msg of conversation.messages) {
        const msgModelSlug = msg?.metadata?.model_slug;
        if (msgModelSlug) foundModels.add(msgModelSlug);

        const topModelSlug = msg?.model_slug;
        if (topModelSlug) foundModels.add(topModelSlug);

        const authorName = msg?.author?.name || msg?.name;
        if (authorName === "dalle.text2im") {
          foundModels.add("dalle-3");
        }
        if (msg?.metadata?.image_gen_async) {
          foundModels.add("gpt-image-1");
        }
      }
    }

    // Conversation-level default_model_slug
    const defSlug = conversation.default_model_slug;
    if (typeof defSlug === "string") {
      foundModels.add(defSlug);
    }
  }

  console.log("Discovered model slugs:", Array.from(foundModels));

  // Add missing models to MODEL_COSTS as zero-cost placeholders
  const missing = Array.from(foundModels).filter(
    (model) => !(model in MODEL_COSTS) && model !== "unknown_model"
  );
  if (missing.length > 0) {
    console.warn("Models in data but missing from MODEL_COSTS:", missing);
    for (const m of missing) {
      MODEL_COSTS[m] = { input: 0, output: 0 };
      console.log(`Added zero-cost placeholder for model: ${m}`);
    }
  }

  // Optionally log unused models from the cost list
  const unused = Object.keys(MODEL_COSTS).filter((m) => !foundModels.has(m));
  if (unused.length > 0) {
    console.log("Models in MODEL_COSTS not found in the dataset:", unused);
  }

  return foundModels;
}
