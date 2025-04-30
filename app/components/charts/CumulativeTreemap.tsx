"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import { ResponsiveTreeMap } from "@nivo/treemap";
import { Aggregator } from "@/lib/calculator";
import {
  getModelCategory,
  prettifyModelName,
  MODEL_CATEGORY_COLORS,
} from "@/lib/model-utils";
import * as htmlToImage from "html-to-image";
import { Button } from "@/components/ui/button";
import { Download, ChevronsUpDown } from "lucide-react";

// Define the types of metrics that can be displayed
type Metric =
  | "input_tokens"
  | "output_tokens"
  | "total_tokens" // Add a combined token metric
  | "cost"
  | "message_count"
  | "conversation_count";

// Define the props for the component
interface CumulativeTreemapProps {
  aggregator: Aggregator;
}

// Nivo treemap expects data in a specific hierarchical format
interface TreemapChildNode {
  name: string;
  value: number;
}
interface TreemapRootData {
  name: string;
  children: TreemapChildNode[];
  // value for root is optional/often ignored by nivo if children exist
}

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

// Helper function to transform aggregator data into Nivo Treemap format
const transformDataForTreemap = (
  aggregator: Aggregator,
  metric: Metric
): TreemapRootData => {
  const modelTotals: Record<string, number> = {}; // { modelSlug: cumulativeValue }

  // Sum the selected metric for each model across all days
  Object.values(aggregator.usageByDay).forEach((dayBucket) => {
    Object.entries(dayBucket.models).forEach(([slug, modelData]) => {
      if (!modelTotals[slug]) {
        modelTotals[slug] = 0;
      }
      let value = 0;
      if (metric === "total_tokens") {
        value = modelData.input_tokens + modelData.output_tokens;
      } else {
        value = modelData[metric] || 0;
      }
      modelTotals[slug] += value;
    });
  });

  // Format for Nivo: root node with children for each model
  const children: TreemapChildNode[] = Object.entries(modelTotals)
    .filter(([slug, value]) => value > 0) // Filter out models with no usage for this metric
    .map(([slug, value]) => ({
      name: slug,
      value: value, // Nivo uses 'value' for size calculation
    }));

  return {
    name: "Total Usage", // Root node name
    children: children,
    // value: 0, // Root value isn't used directly for sizing here
  };
};

// Common Nivo theme settings for dark mode (can be shared)
const theme = {
  axis: {
    ticks: { text: { fill: "#a0aec0" } },
    legend: { text: { fill: "#cbd5e0" } },
  },
  grid: {
    line: { stroke: "#4a5568", strokeDasharray: "1 3" },
  },
  tooltip: {
    container: { background: "#2d3748", color: "#e2e8f0" },
  },
  labels: {
    text: { fill: "#ffffff" }, // Make labels white for visibility
  },
  legends: {
    text: { fill: "#e2e8f0", fontFamily: "var(--font-geist-mono)" },
  },
};

// Label formatting function
const formatValue = (value: number, metric: Metric) => {
  if (metric === "cost") {
    return `$${value.toFixed(2)}`;
  }
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString(); // Use locale string for better formatting
};

export default function CumulativeTreemap({
  aggregator,
}: CumulativeTreemapProps) {
  const [selectedMetric, setSelectedMetric] = useState<Metric>("cost");
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Get all model slugs from the data
  const allModelSlugs = useMemo(() => {
    const slugs = new Set<string>();
    Object.values(aggregator.usageByDay || {}).forEach((dayBucket) => {
      Object.keys(dayBucket.models || {}).forEach((slug) => {
        slugs.add(slug);
      });
    });
    return Array.from(slugs).sort();
  }, [aggregator.usageByDay]);

  // Memoize the transformed data based on selected metric
  const treeData: TreemapRootData = useMemo(
    () => transformDataForTreemap(aggregator, selectedMetric),
    [aggregator, selectedMetric]
  );

  // Group models by their categories for the custom legend
  const modelsByCategory = useMemo(() => {
    const groupedModels: Record<string, string[]> = {};

    allModelSlugs.forEach((slug) => {
      const category = getModelCategory(slug);
      if (!groupedModels[category]) {
        groupedModels[category] = [];
      }
      groupedModels[category].push(slug);
    });

    return groupedModels;
  }, [allModelSlugs]);

  // Get category names sorted
  const sortedCategories = useMemo(() => {
    return Object.keys(modelsByCategory).sort((a, b) => a.localeCompare(b));
  }, [modelsByCategory]);

  // Custom legend component
  const CustomLegend = () => (
    <div className="absolute top-[50px] right-0 mr-2 overflow-y-auto w-[100px]">
      {sortedCategories.map((category) => (
        <div key={category} className="px-1 py-1">
          {/* Category heading similar to multi-select */}
          <div className="px-1 text-5xs text-violet-400 font-normal uppercase font-mono tracking-wider">
            {category}
          </div>

          {/* Models in this category */}
          {modelsByCategory[category].map((modelSlug) => (
            <div
              key={modelSlug}
              className="flex items-center pl-1 text-violet-200 font-sans"
            >
              <div
                className="w-2 h-2 mr-1 flex-shrink-0"
                style={{ backgroundColor: getModelColor(modelSlug) }}
              />
              <span className="truncate pr-1 text-3xs">
                {prettifyModelName(modelSlug)}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  // Handle PNG Export (similar to other charts)
  const handleExport = useCallback(() => {
    if (chartContainerRef.current === null) {
      return;
    }

    htmlToImage
      .toPng(chartContainerRef.current, {
        backgroundColor: "#1e1b4b", // Dark background for export
        filter: (node) => {
          // Exclude the filter controls container
          if (
            node instanceof HTMLElement &&
            node.classList.contains("chart-controls-container")
          ) {
            return false;
          }
          // Include the custom legend container by default
          // if (node instanceof HTMLElement && node.classList.contains('custom-legend-container')) {
          //    return false;
          // }
          return true;
        },
      })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = `treemap-chart-${selectedMetric}.png`; // Treemap doesn't have model selection
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error("Oops, something went wrong!", err);
      });
  }, [selectedMetric]); // Dependency is only selectedMetric

  // Basic loading/no data state
  if (
    !aggregator ||
    !aggregator.usageByDay ||
    Object.keys(aggregator.usageByDay).length === 0 ||
    !treeData ||
    !treeData.children ||
    treeData.children.length === 0
  ) {
    return <div>Loading chart data or no data available...</div>;
  }

  return (
    <div className="relative">
      {/* Controls Container - Added class name */}
      <div className="absolute top-0 right-0 z-10 p-2 flex items-center gap-2 chart-controls-container">
        {/* Metric Selector */}
        <div className="flex items-center">
          <span className="mr-2 text-xs text-slate-600 font-sans sm:block hidden">
            show
          </span>
          <div className="relative flex items-center">
            <select
              id="metric-select-treemap"
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as Metric)}
              className="bg-violet-600/20 text-violet-200 p-1 pl-2 pr-5 text-xs border border-violet-500/30 focus:outline-none focus:border-violet-500/30 hover:bg-violet-600/30 appearance-none font-sans md:min-w-[120px] min-w-[120px]"
            >
              {/* Keep specific labels from Treemap */}
              <option value="cost">cost ($)</option>
              <option value="total_tokens">total tokens</option>
              <option value="input_tokens">input tokens</option>
              <option value="output_tokens">output tokens</option>
              <option value="message_count">messages</option>
              <option value="conversation_count">conversations</option>
            </select>
            <ChevronsUpDown className="absolute right-1.5 top-1/2 transform -translate-y-1/2 h-3 w-3 shrink-0 opacity-50 text-violet-200 pointer-events-none" />
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-violet-500/30 mx-1" />

        {/* Export Button */}
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

      {/* Chart Container - Added padding-top and ref */}
      <div
        style={{ height: "560px", paddingTop: "60px" }}
        ref={chartContainerRef}
      >
        <ResponsiveTreeMap
          data={treeData}
          identity="name" // Key to identify nodes
          value="value" // Key for node value (determines size)
          valueFormat={(value) => formatValue(value, selectedMetric)} // Format values in tooltips/labels
          margin={{ top: 10, right: 120, bottom: 10, left: 10 }} // Increased right margin to make room for legend
          labelSkipSize={10} // Reduced from 12 to show more labels in smaller boxes
          enableParentLabel={false} // Disable the parent "Total Usage" label
          orientLabel={false} // Force all labels to be horizontal
          label={({ id, width, height, value }) => {
            const modelName = prettifyModelName(id as string);
            // Only show label if it's likely to fit (rough estimation)
            const estimatedCharWidth = 12; // Approximate width of a character in pixels
            const maxChars = Math.floor((width - 10) / estimatedCharWidth);

            // No label for extremely small boxes
            if (maxChars < 3 || height < 20) return "";

            // Format value based on metric
            const formattedValue = formatValue(value, selectedMetric);

            // Always prioritize showing the model name
            // For very small boxes, just show truncated model name if needed
            if (height < 50 || width < 120) {
              if (modelName.length > maxChars) {
                return modelName.substring(0, maxChars - 3) + "...";
              }
              return modelName;
            }

            // For medium sized boxes, show model name and truncated/shortened value if space permits
            if (height < 70 || width < 180) {
              // Reserve space for the value - at least 8 chars for value (including $ and unit indicators)
              const reservedChars = 8;

              // If space is really tight, just show the model name
              if (maxChars < modelName.length + reservedChars) {
                if (modelName.length > maxChars) {
                  return modelName.substring(0, maxChars - 3) + "...";
                }
                return modelName;
              }

              // Otherwise show both with shortened value format
              let shortValue = "";
              if (selectedMetric === "cost") {
                // For cost, we want to keep "$" and round to whole dollars
                shortValue =
                  "$" + Math.round(parseFloat(formattedValue.substring(1)));
              } else {
                // For other metrics, preserve K/M unit indicators
                const match = formattedValue.match(/^([\d.]+)([KM])?$/);
                if (match) {
                  const num = parseFloat(match[1]);
                  const unit = match[2] || "";
                  shortValue = Math.round(num) + unit;
                } else {
                  shortValue = Math.round(
                    parseFloat(formattedValue)
                  ).toString();
                }
              }

              return `${modelName} ${shortValue}`;
            }

            // For larger boxes, show both model name and full value
            return `${modelName} ${formattedValue}`;
          }}
          labelTextColor={{ from: "color", modifiers: [["darker", 5]] }} // Increased contrast for better visibility
          parentLabelTextColor={{ from: "color", modifiers: [["darker", 2]] }} // Darker labels for parent nodes
          colors={({ id }) => getModelColor(id as string)} // Use our custom color function
          borderColor={{ from: "color", modifiers: [["darker", 2]] }}
          theme={{
            ...theme,
            labels: {
              ...theme.labels,
              text: {
                ...theme.labels.text,
                fontSize: 10, // Increase font size for better readability
                fontFamily: "var(--font-geist-mono)",
                fontWeight: 500, // Make labels bolder
              },
            },
          }}
          nodeOpacity={1} // Slightly transparent nodes
          borderWidth={1}
          tooltip={(
            { node } // Custom tooltip
          ) => (
            <div
              className="bg-black p-0.5 border border-black flex flex-col items-start"
              style={{
                color: "#ffffff",
                padding: "6px 10px",
                boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                fontSize: "10px",
                fontFamily: "var(--font-geist-mono)",
              }}
            >
              <div className="flex flex-row items-center justify-start w-full">
                <span
                  className="w-3 h-3 mr-2"
                  style={{ backgroundColor: getModelColor(node.id as string) }}
                ></span>
                <p className="text-xs font-sans text-white">
                  {prettifyModelName(node.id as string)}
                </p>
              </div>
              <div className="flex flex-col mt-1 w-full text-left">
                <p className="text-2xs font-sans text-white">
                  <span className="text-violet-300/70">
                    {selectedMetric === "cost"
                      ? "Cost"
                      : selectedMetric.replace(/_/g, " ")}
                    :
                  </span>{" "}
                  {formatValue(node.value, selectedMetric)}
                </p>
              </div>
            </div>
          )}
        />
        {/* Added class name for potential filtering */}
        <div className="custom-legend-container">
          <CustomLegend />
        </div>
      </div>
    </div>
  );
}
