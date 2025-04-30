// Model categories in priority order
export const MODEL_CATEGORIES = [
  "GPT-4",
  "GPT-4.5",
  "GPT-4o",
  "GPT-3",
  "Reasoning",
  "Vision",
  "Audio",
  "Research",
  "Other",
] as const;

export type ModelCategory = (typeof MODEL_CATEGORIES)[number];

/**
 * Model categorization utilities
 */
export const modelCategorization = {
  /**
   * Determines which category a model belongs to based on its slug
   */
  getCategory(slug: string): ModelCategory {
    const lowerSlug = slug.toLowerCase();

    // GPT-4o series
    if (lowerSlug.includes("gpt-4o")) {
      // Special GPT-4 variants that should go in other categories
      if (lowerSlug.includes("vision")) {
        return "Vision";
      }
      return "GPT-4o";
    } else if (lowerSlug.includes("gpt-4-5")) {
      return "GPT-4.5";
    } else if (lowerSlug.includes("gpt-4")) {
      return "GPT-4";
    }
    // GPT-3.5 series including legacy davinci models that are GPT-3.5 equivalent
    else if (
      lowerSlug.includes("gpt-3.5") ||
      lowerSlug.includes("text-davinci")
    ) {
      return "GPT-3";
    }
    // Reasoning models (code-focused and specialized reasoning models)
    else if (
      lowerSlug.includes("reasoning") ||
      lowerSlug.includes("code") ||
      lowerSlug.includes("code-interpreter") ||
      lowerSlug.includes("o1") ||
      lowerSlug.includes("o3") ||
      lowerSlug.includes("o4") ||
      lowerSlug.includes("o4") ||
      lowerSlug.startsWith("o-")
    ) {
      return "Reasoning";
    }
    // Vision models
    else if (
      lowerSlug.includes("vision") ||
      lowerSlug.includes("image") ||
      lowerSlug.includes("dall-e") ||
      lowerSlug.includes("dalle") ||
      lowerSlug === "gpt-image-1" ||
      lowerSlug === "dalle-2" ||
      lowerSlug === "dalle-3"
    ) {
      return "Vision";
    }
    // Audio models
    else if (
      lowerSlug.includes("whisper") ||
      lowerSlug.includes("audio") ||
      lowerSlug.includes("tts") ||
      lowerSlug.includes("voice") ||
      lowerSlug.includes("speech")
    ) {
      return "Audio";
    }
    // Research models - generally older models used for research
    else if (
      lowerSlug.includes("research") ||
      lowerSlug.includes("davinci") || // older davinci models that aren't text-davinci
      lowerSlug.includes("curie") ||
      lowerSlug.includes("babbage") ||
      lowerSlug.includes("ada") ||
      lowerSlug.includes("instruct") ||
      lowerSlug.includes("embedding")
    ) {
      return "Research";
    }
    // Default case
    else {
      return "Other";
    }
  },

  /**
   * Compares categories for sorting (follows order in MODEL_CATEGORIES)
   */
  compareCategories(a: ModelCategory, b: ModelCategory): number {
    const indexA = MODEL_CATEGORIES.indexOf(a);
    const indexB = MODEL_CATEGORIES.indexOf(b);
    return indexA - indexB;
  },
};

/**
 * Model display and sorting utilities
 */
export const modelPresentation = {
  /**
   * Sort model options by their categories
   */
  sortByCategory<T extends { group?: string }>(options: T[]): T[] {
    return [...options].sort((a, b) => {
      const groupA = a.group || "Other";
      const groupB = b.group || "Other";
      return modelCategorization.compareCategories(
        groupA as ModelCategory,
        groupB as ModelCategory
      );
    });
  },

  /**
   * Format a model name for display
   */
  prettify(slug: string): string {
    return slug;
  },
};

// Export individual functions for convenience and backward compatibility
export const getModelCategory = modelCategorization.getCategory;
export const compareCategories = modelCategorization.compareCategories;
export const sortModelOptions = modelPresentation.sortByCategory;
export const prettifyModelName = modelPresentation.prettify;

// Define the model category color mapping - used in various chart components
export const MODEL_CATEGORY_COLORS: Record<string, string[]> = {
  "GPT-3.5": [
    "hsl(62, 98%, 67%)", // Original bright yellow-green
    "hsl(72, 98%, 70%)", // Larger hue shift, slightly brighter
    "hsl(52, 99%, 65%)", // Larger hue shift, slightly darker
    "hsl(67, 97%, 72%)", // Moderate hue shift, brighter
    "hsl(57, 99%, 63%)", // Moderate hue shift, darker
  ],
  "GPT-4": [
    "hsl(322, 100%, 50%)", // Original bright pink
    "hsl(335, 100%, 53%)", // Larger hue shift, slightly brighter
    "hsl(310, 100%, 48%)", // Larger hue shift, slightly darker
    "hsl(328, 98%, 55%)", // Moderate hue shift, brighter
    "hsl(316, 100%, 46%)", // Moderate hue shift, darker
  ],
  "GPT-4o": [
    "hsl(180, 100%, 50%)", // Original bright cyan
    "hsl(195, 100%, 53%)", // Larger hue shift, slightly brighter
    "hsl(180, 100%, 50%)", // Larger hue shift, slightly darker
    "hsl(187, 98%, 55%)", // Moderate hue shift, brighter
    "hsl(175, 100%, 46%)", // Moderate hue shift, darker
  ],
  "GPT-4.5": [
    "hsl(60, 100%, 55%)", // Original bright yellow
    "hsl(70, 100%, 58%)", // Larger hue shift, slightly brighter
    "hsl(50, 100%, 53%)", // Larger hue shift, slightly darker
    "hsl(65, 98%, 60%)", // Moderate hue shift, brighter
    "hsl(55, 100%, 51%)", // Moderate hue shift, darker
  ],
  Reasoning: [
    "hsl(6, 100%, 56%)", // Original bright red
    "hsl(16, 100%, 59%)", // Larger hue shift, slightly brighter
    "hsl(356, 100%, 54%)", // Larger hue shift, slightly darker
    "hsl(11, 98%, 61%)", // Moderate hue shift, brighter
    "hsl(1, 100%, 52%)", // Moderate hue shift, darker
  ],
  Research: [
    "hsl(119, 100%, 63%)", // Original bright green
    "hsl(134, 100%, 66%)", // Larger hue shift, slightly brighter
    "hsl(104, 100%, 60%)", // Larger hue shift, slightly darker
    "hsl(124, 98%, 68%)", // Moderate hue shift, brighter
    "hsl(114, 100%, 58%)", // Moderate hue shift, darker
  ],
  // Adding default colors for potential missing categories like Vision, Audio, Other
  Vision: [
    "hsl(270, 90%, 65%)", // Purple range
    "hsl(280, 90%, 68%)",
    "hsl(260, 90%, 62%)",
    "hsl(275, 88%, 70%)",
    "hsl(265, 92%, 60%)",
  ],
  Audio: [
    "hsl(30, 100%, 60%)", // Orange range
    "hsl(40, 100%, 63%)",
    "hsl(20, 100%, 57%)",
    "hsl(35, 98%, 65%)",
    "hsl(25, 100%, 55%)",
  ],
  Other: [
    "hsl(210, 80%, 70%)", // Blue range
    "hsl(220, 80%, 73%)",
    "hsl(200, 80%, 67%)",
    "hsl(215, 78%, 75%)",
    "hsl(205, 82%, 65%)",
  ],
};
