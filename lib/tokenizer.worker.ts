// lib/tokenizer.worker.ts
import { Tiktoken } from "js-tiktoken/lite";
// Import the specific rank data needed
import o200k_base from "js-tiktoken/ranks/o200k_base";
// If you need cl100k_base as a fallback, import it too:
// import cl100k_base from "js-tiktoken/ranks/cl100k_base";

let enc: Tiktoken | null = null;
let encoderName: string | null = null;

try {
  console.log("Worker: Initializing Tiktoken with o200k_base ranks...");
  // Instantiate directly with the imported rank data
  enc = new Tiktoken(o200k_base);
  encoderName = "o200k_base";
  console.log("Worker: o200k_base encoder initialized.");
} catch (e) {
  console.error("Worker: Failed to initialize Tiktoken with o200k_base:", e);
  // Attempt fallback if needed and imported
  // try {
  //   console.log("Worker: Falling back to cl100k_base ranks...");
  //   enc = new Tiktoken(cl100k_base);
  //   encoderName = "cl100k_base";
  //   console.log("Worker: cl100k_base encoder initialized.");
  // } catch (fallbackErr) {
  //   console.error("Worker: Failed to initialize Tiktoken with cl100k_base:", fallbackErr);
  // }
}

self.onmessage = async (event: MessageEvent) => {
  // No longer need INIT message type
  const { id, text } = event.data;

  if (id === undefined || typeof text !== "string") {
    console.warn("Worker: Received unknown message format", event.data);
    return;
  }

  if (!enc) {
    console.error("Worker: Encoder not available for tokenization.");
    const fallbackCount = Math.ceil(text.length / 4);
    self.postMessage({
      id,
      count: fallbackCount,
      error: "Encoder failed to initialize",
      fallbackUsed: true,
    });
    return;
  }

  if (!text) {
    self.postMessage({ id, count: 0 });
    return;
  }

  try {
    // Clean the text to remove disallowed special tokens before encoding
    let cleanedText = text.replace(/<\|endoftext\|>/g, "");
    cleanedText = cleanedText.replace(/<\|im_start\|>/g, "");
    cleanedText = cleanedText.replace(/<\|im_end\|>/g, "");

    // js-tiktoken doesn't seem to require the <|endoftext|> hack
    // and doesn't support the allowed_special option in the same way.
    // Encode the cleaned text
    const tokens = enc.encode(cleanedText);
    const count = tokens.length;
    self.postMessage({ id, count });
  } catch (error: any) {
    console.error("Worker: Error during tokenization for id:", id, error);
    const fallbackCount = Math.ceil(text.length / 4);
    self.postMessage({
      id,
      count: fallbackCount,
      error: `Tokenization failed: ${error?.message || error}`,
      fallbackUsed: true,
    });
  }
};

// Signal that the worker script has loaded and encoder *should* be ready
console.log("Tokenizer worker started.");
self.postMessage({ type: "WORKER_READY" });
