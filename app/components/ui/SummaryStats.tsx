import React from "react";
import GlitchText from "../GlitchText";
import { Aggregator } from "@/lib/calculator";
import { getModelCategory } from "@/lib/model-utils";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface StatItemProps {
  label: string;
  value: string | number;
  unit?: string;
  className?: string;
  tooltip?: React.ReactNode;
}

const formatNumberForDisplay = (
  num: number
): { displayValue: string; displayUnit: string | undefined } => {
  if (num >= 1_000_000) {
    return {
      displayValue: (num / 1_000_000).toFixed(1).replace(/\.0$/, ""),
      displayUnit: "M",
    };
  }
  if (num >= 1_000) {
    return {
      displayValue: (num / 1_000).toFixed(1).replace(/\.0$/, ""),
      displayUnit: "K",
    };
  }
  return { displayValue: num.toString(), displayUnit: undefined };
};

function StatItem({
  label,
  value,
  unit: explicitUnit,
  className,
  tooltip,
}: StatItemProps) {
  let displayValue: string;
  let displayUnit: string | undefined;

  if (typeof value === "number" && value > 100000) {
    const formatted = formatNumberForDisplay(value);
    displayValue = formatted.displayValue;
    displayUnit = explicitUnit || formatted.displayUnit;
  } else {
    displayValue = value.toString();
    displayUnit = explicitUnit;
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <p className="text-xs font-sans text-[#B08AFF] lowercase mb-1 flex items-center">
        <span className="opacity-70">{label}</span>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="inline-flex ml-2 items-center justify-center !text-violet-800/90">
                <Info className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="bg-black text-violet-100 max-w-[250px]"
            >
              {tooltip}
            </TooltipContent>
          </Tooltip>
        )}
      </p>
      <div className="flex items-baseline">
        <GlitchText
          text={displayValue}
          className="sm:text-3xl text-2xl font-sans font-medium text-gray-100 whitespace-nowrap"
        />
        {displayUnit && (
          <span className="ml-1 text-sm text-white font-mono lowercase">
            {displayUnit}
          </span>
        )}
      </div>
    </div>
  );
}

interface SummaryStatsProps {
  data: Aggregator;
  className?: string;
}

export default function SummaryStats({ data, className }: SummaryStatsProps) {
  // Calculate key metrics from the aggregator data
  const totalCost = data.totalCostAllModels?.toFixed(2) || "0";

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalMessages = 0;
  let totalConversations = 0;
  let modelUsage: Record<string, number> = {};
  let modelCosts: Record<string, number> = {};
  let modelConversationCount: Record<string, number> = {};

  // Process data to calculate metrics
  Object.values(data.usageByDay || {}).forEach((day) => {
    totalInputTokens += day.total.input_tokens;
    totalOutputTokens += day.total.output_tokens;
    totalMessages += day.total.message_count;
    totalConversations += day.total.conversation_count;

    // Calculate per-model usage and costs
    Object.entries(day.models).forEach(([model, usage]) => {
      modelUsage[model] =
        (modelUsage[model] || 0) + usage.input_tokens + usage.output_tokens;
      modelCosts[model] = (modelCosts[model] || 0) + usage.cost;
      modelConversationCount[model] =
        (modelConversationCount[model] || 0) + usage.conversation_count;
    });
  });

  // Find top model by usage and cost
  const topModelByUsage =
    Object.entries(modelConversationCount)
      .sort((a, b) => b[1] - a[1])
      .map(([model]) => model)[0] || "None";

  // Filter out vision models before determining the most expensive
  const nonVisionOrAudioModelCosts = Object.entries(modelCosts).filter(
    ([model]) => {
      const category = getModelCategory(model);
      return category !== "Vision" && category !== "Audio";
    }
  );

  const topModelByCost =
    nonVisionOrAudioModelCosts
      .sort((a, b) => b[1] - a[1])
      .map(([model]) => model)[0] || "None";

  // Get only the start date
  const userSinceDateRaw = data.startDate || "Date unknown";

  // Helper function to format date
  const formatDateFriendly = (dateString: string): string => {
    if (!dateString || dateString === "Date unknown") {
      return dateString; // Return original if invalid or placeholder
    }
    try {
      const date = new Date(dateString + "T00:00:00Z"); // Assume UTC to avoid timezone issues during parsing
      if (isNaN(date.getTime())) {
        return dateString; // Return original if parsing fails
      }

      const month = date.toLocaleString("en-US", {
        month: "short",
        timeZone: "UTC",
      });
      const year = date.getUTCFullYear();

      return `${month} ${year}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString; // Fallback to original string on error
    }
  };

  // --- Calculate additional stats ---
  const totalModelsUsed = data.allModelSlugs?.size ?? 0;
  const avgCostPerConversation =
    totalConversations > 0
      ? (data.totalCostAllModels ?? 0) / totalConversations
      : 0;

  const userSinceDateFormatted =
    formatDateFriendly(userSinceDateRaw).toLowerCase();

  return (
    <TooltipProvider>
      <div className={className}>
        <div className="grid grid-cols-2 md:grid-cols-3 sm:gap-6 gap-4 mb-6 sm:mt-18 mt-6">
          <StatItem label="Total Conversations" value={totalConversations} />

          <StatItem
            label="Estimated Cost"
            value={totalCost}
            unit="USD"
            className="mb-0"
            tooltip={
              <div className="text-2xs space-y-1">
                <p>best effort estimate that doesn&apos;t factor in:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>file uploads</li>
                  <li>token caching</li>
                  <li>reasoning tokens</li>
                  <li>deep research reports</li>
                </ul>
              </div>
            }
          />

          <StatItem
            label="Total Tokens"
            value={totalInputTokens + totalOutputTokens}
          />

          <StatItem
            label="Total Messages"
            value={totalMessages}
            tooltip={
              <div className="text-2xs">
                includes user, ai, system and intermediate tool messages
              </div>
            }
          />

          <StatItem label="User Since" value={userSinceDateFormatted} />

          <StatItem label="Models Used" value={totalModelsUsed} />

          <StatItem
            label="Avg Cost / Conv"
            value={avgCostPerConversation.toFixed(2)}
            unit="USD"
          />

          <StatItem label="Most Used Model" value={topModelByUsage} />

          <StatItem label="Most Expensive Model" value={topModelByCost} />
        </div>
      </div>
    </TooltipProvider>
  );
}
