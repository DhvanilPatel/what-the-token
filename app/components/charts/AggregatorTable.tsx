import React, { useRef, useCallback } from "react";
import { Aggregator } from "@/lib/calculator"; // Import Aggregator type
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Import Table components
import {
  getModelCategory,
  prettifyModelName,
  MODEL_CATEGORY_COLORS,
} from "@/lib/model-utils"; // Import MODEL_CATEGORY_COLORS here
import * as htmlToImage from "html-to-image"; // Import html-to-image
import { Button } from "@/components/ui/button"; // Import Button component
import { Download, Info } from "lucide-react"; // Import Download and Info icons
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"; // Import all Tooltip components

// Helper function to get color for a model based on its category
const getModelColor = (modelSlug: string): string => {
  const category = getModelCategory(modelSlug);
  const categoryColors = MODEL_CATEGORY_COLORS[category];

  if (!categoryColors) {
    return "#01FFFF"; // Default to cyan if category not found
  }

  // Get a consistent index for this model within its category colors
  // Hash the model slug to get a consistent number
  const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  };

  // Use the hash to pick a color from the category's color array
  const colorIndex = hashCode(modelSlug) % categoryColors.length;
  return categoryColors[colorIndex];
};

interface AggregatorSummaryTableProps {
  aggregator: Aggregator;
}

/**
 * Renders a summary table based on the Aggregator structure.
 */
export default function AggregatorSummaryTable({
  aggregator,
}: AggregatorSummaryTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null); // Ref for the container

  // Get all unique model slugs found during aggregation
  const modelSlugs: string[] = aggregator.allModelSlugs
    ? Array.from(aggregator.allModelSlugs).sort()
    : [];

  // Calculate overall totals (can also use aggregator.totalCostAllModels)
  let grandTotalCost = 0;
  let grandTotalInput = 0;
  let grandTotalOutput = 0;
  let grandTotalMessages = 0;
  let grandTotalConversations = 0;

  // Sum up totals from the daily buckets for verification or display
  Object.values(aggregator.usageByDay).forEach((dayBucket) => {
    grandTotalInput += dayBucket.total.input_tokens;
    grandTotalOutput += dayBucket.total.output_tokens;
    grandTotalCost += dayBucket.total.cost;
    grandTotalMessages += dayBucket.total.message_count;
    grandTotalConversations += dayBucket.total.conversation_count;
  });

  // Calculate per-model totals
  const modelTotals = modelSlugs
    .map((model: string) => {
      let totalInput = 0;
      let totalOutput = 0;
      let totalCost = 0;
      let totalMessages = 0;
      let totalConversations = 0;

      // Sum this model's usage across all days¯
      Object.values(aggregator.usageByDay).forEach((dayBucket) => {
        const modelData = dayBucket.models[model];
        if (modelData) {
          totalInput += modelData.input_tokens;
          totalOutput += modelData.output_tokens;
          totalCost += modelData.cost;
          totalMessages += modelData.message_count;
          totalConversations += modelData.conversation_count;
        }
      });

      // Don't include if this model had no usage
      if (totalMessages === 0 && totalConversations === 0) return null;

      return {
        model,
        totalInput,
        totalOutput,
        totalMessages,
        totalConversations,
        totalCost,
        category: getModelCategory(model),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null); // Filter out nulls and type guard

  // Group models by category
  const modelsByCategory: Record<string, typeof modelTotals> = {};

  modelTotals.forEach((modelData) => {
    if (!modelsByCategory[modelData.category]) {
      modelsByCategory[modelData.category] = [];
    }
    modelsByCategory[modelData.category].push(modelData);
  });

  // Get sorted categories for display order
  const sortedCategories = Object.keys(modelsByCategory).sort();

  // Handle PNG Export
  const handleExport = useCallback(() => {
    if (tableContainerRef.current === null) {
      return;
    }

    htmlToImage
      .toPng(tableContainerRef.current, {
        backgroundColor: "#1e1b4b", // Dark background for export
        filter: (node) => {
          // Exclude the export button container
          if (
            node instanceof HTMLElement &&
            node.classList.contains("export-button-container")
          ) {
            return false;
          }
          return true;
        },
      })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = `model-summary-table.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error("Oops, something went wrong exporting table!", err);
      });
  }, []); // No dependencies needed

  return (
    <TooltipProvider>
      <div className="relative" ref={tableContainerRef}>
        {/* Export Button Container - Positioned Top Right */}
        <div className="absolute top-0 right-0 p-1 export-button-container">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="bg-violet-600/20 text-violet-200 border border-violet-500/30 hover:bg-violet-600/30 hover:text-violet-100 rounded-none !w-7 !h-7 flex items-center justify-center"
            title="Export as PNG"
          >
            <Download className="!h-3 !w-3" />
          </Button>
        </div>

        <Table className="mt-16">
          <TableHeader>
            <TableRow className="!text-violet-400">
              <TableHead className="font-mono text-[10px] text-[#B08AFF] lowercase opacity-80">
                Model
              </TableHead>
              <TableHead className="text-right font-mono text-[10px] text-[#B08AFF] lowercase opacity-80">
                Input Tokens
              </TableHead>
              <TableHead className="text-right font-mono text-[10px] text-[#B08AFF] lowercase opacity-80">
                Output Tokens
              </TableHead>
              <TableHead className="text-right font-mono text-[10px] text-[#B08AFF] lowercase opacity-80">
                Messages
              </TableHead>
              <TableHead className="text-right font-mono text-[10px] text-[#B08AFF] lowercase opacity-80">
                Conversations
              </TableHead>
              <TableHead className="text-right font-mono text-[10px] text-[#B08AFF] lowercase opacity-80">
                Est. Cost
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCategories.map((category) => (
              <React.Fragment key={category}>
                {/* Category Row */}
                <TableRow className="border-t border-violet-800/30 hover:bg-transparent">
                  <TableCell
                    colSpan={6}
                    className="font-mono text-[10px] text-[#B08AFF] lowercase opacity-80 py-1 bg-violet-900/10"
                  >
                    {category}
                  </TableCell>
                </TableRow>

                {/* Model Rows in this category */}
                {modelsByCategory[category].map((totals) => (
                  <TableRow key={totals.model}>
                    <TableCell
                      className="font-medium font-sans flex flex-row items-center"
                      colorIndicator={getModelColor(totals.model)}
                    >
                      {prettifyModelName(totals.model)}
                      {prettifyModelName(totals.model) === "research" && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="inline-flex ml-2 items-center justify-center">
                              <Info className="h-3 w-3 !text-violet-800/90" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="right"
                            className="bg-black text-violet-100 max-w-[250px]"
                          >
                            costs and token usage are very wrong since OpenAI
                            doesn&apos;t share reasoning tokens, and it&apos;s
                            not known which model powers deep research.
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {totals.model === "gpt-image-1" && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="inline-flex ml-2 items-center justify-center">
                              <Info className="h-3 w-3 !text-violet-800/90" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="right"
                            className="bg-black text-violet-100 max-w-[250px]"
                          >
                            shown cost is the base price per image. actual cost
                            may be higher as it doesn&apos;t factor in input
                            tokens or additional output tokens for image
                            generation.
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell className="text-right !text-xs font-mono">
                      {totals.totalInput.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right !text-xs font-mono">
                      {totals.totalOutput.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right !text-xs font-mono">
                      {totals.totalMessages.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right !text-xs font-mono">
                      {totals.totalConversations.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right !text-xs font-mono">
                      ${totals.totalCost.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            ))}

            {/* Grand Total Row */}
            <TableRow className="border-t-2 border-violet-700 bg-violet-900/20">
              <TableCell className="font-medium text-base font-sans">
                Total
              </TableCell>
              <TableCell className="text-right !text-sm font-mono">
                {grandTotalInput.toLocaleString()}
              </TableCell>
              <TableCell className="text-right !text-sm font-mono">
                {grandTotalOutput.toLocaleString()}
              </TableCell>
              <TableCell className="text-right !text-sm font-mono">
                {grandTotalMessages.toLocaleString()}
              </TableCell>
              <TableCell className="text-right !text-sm font-mono">
                {grandTotalConversations.toLocaleString()}
              </TableCell>
              <TableCell className="text-right !text-sm font-mono">
                ${(aggregator.totalCostAllModels ?? grandTotalCost).toFixed(2)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
