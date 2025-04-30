"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import { ResponsiveStream } from "@nivo/stream";
import { Aggregator } from "@/lib/calculator";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import {
  getModelCategory,
  prettifyModelName,
  MODEL_CATEGORY_COLORS,
} from "@/lib/model-utils";
import * as htmlToImage from "html-to-image";
import { Button } from "@/components/ui/button";
import { Download, ChevronsUpDown } from "lucide-react";

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

type Metric =
  | "input_tokens"
  | "output_tokens"
  | "cost"
  | "message_count"
  | "conversation_count";

interface StreamChartProps {
  aggregator: Aggregator;
}

// Nivo Stream expects data points where keys are layers (models)
// and values are numbers. We'll keep month keys separate.
type StreamDataPoint = { [modelSlug: string]: number };
type StreamData = StreamDataPoint[];

// Return type includes both data and corresponding month keys
interface TransformedStreamData {
  data: StreamData;
  monthKeys: string[];
  activeModelSlugs: string[]; // Keep track of models actually in the data for keys prop
}

// Helper to transform data for Nivo Stream
const transformDataForStream = (
  aggregator: Aggregator,
  metric: Metric,
  selectedModels: string[] // Use selected models
): TransformedStreamData => {
  const dailyAgg: Record<string, { [modelSlug: string]: number }> = {}; // { dayKey: { modelSlug: value } }
  const allAvailableModels = aggregator.allModelSlugs
    ? Array.from(aggregator.allModelSlugs)
    : [];
  const modelsToProcess =
    selectedModels.length > 0 ? selectedModels : allAvailableModels;
  const activeModelSlugsSet = new Set<string>(); // Track models with actual data

  // Use daily data directly without aggregation
  Object.entries(aggregator.usageByDay).forEach(([dayKey, dayBucket]) => {
    // Use the full YYYY-MM-DD as the key
    if (!dailyAgg[dayKey]) {
      dailyAgg[dayKey] = {};
    }

    modelsToProcess.forEach((slug) => {
      const modelData = dayBucket.models[slug];
      if (modelData) {
        const value = modelData[metric] || 0;
        // Initialize if not exists
        if (!dailyAgg[dayKey][slug]) {
          dailyAgg[dayKey][slug] = 0;
        }
        dailyAgg[dayKey][slug] += value;
        if (value > 0) {
          activeModelSlugsSet.add(slug); // Add model if it has data
        }
      }
    });
  });

  // Convert aggregated data into the format Nivo expects
  const sortedDayKeys = Object.keys(dailyAgg).sort();
  const activeModelSlugs = Array.from(activeModelSlugsSet).sort(); // Convert set to sorted array

  // Apply a simple moving average to smooth out extreme fluctuations
  // First, convert the daily data into a format easier to process
  const modelTimeSeries: Record<string, number[]> = {};
  activeModelSlugs.forEach((slug) => {
    modelTimeSeries[slug] = sortedDayKeys.map(
      (day) => dailyAgg[day][slug] || 0
    );
  });

  // Apply a 5-day moving average to each model's time series
  const smoothWindow = 5;
  const smoothedModelData: Record<string, number[]> = {};

  activeModelSlugs.forEach((slug) => {
    const rawValues = modelTimeSeries[slug];
    const smoothedValues = rawValues.map((_, index) => {
      // Calculate window bounds
      const windowStart = Math.max(0, index - Math.floor(smoothWindow / 2));
      const windowEnd = Math.min(
        rawValues.length - 1,
        index + Math.floor(smoothWindow / 2)
      );
      // Calculate sum of values in window
      let sum = 0;
      for (let i = windowStart; i <= windowEnd; i++) {
        sum += rawValues[i];
      }
      // Return average
      return sum / (windowEnd - windowStart + 1);
    });
    smoothedModelData[slug] = smoothedValues;
  });

  // Convert smoothed data back to Nivo format
  const streamData: StreamData = sortedDayKeys.map((dayKey, dayIndex) => {
    const dayDataPoint: StreamDataPoint = {}; // No dayKey inside
    activeModelSlugs.forEach((slug) => {
      // Use smoothed data for each point
      dayDataPoint[slug] = smoothedModelData[slug][dayIndex];
    });
    return dayDataPoint;
  });

  return { data: streamData, monthKeys: sortedDayKeys, activeModelSlugs };
};

export default function StreamChart({ aggregator }: StreamChartProps) {
  const [selectedMetric, setSelectedMetric] =
    useState<Metric>("conversation_count");
  const [selectedModels, setSelectedModels] = useState<string[]>([]); // State for selected models
  const chartContainerRef = useRef<HTMLDivElement>(null); // Ref for the chart container

  // Memoize model slugs and options
  const modelOptions: MultiSelectOption[] = useMemo(() => {
    if (!aggregator || !aggregator.allModelSlugs) return [];

    return Array.from(aggregator.allModelSlugs)
      .sort()
      .map((slug) => ({
        value: slug,
        label: prettifyModelName(slug),
        group: getModelCategory(slug),
      }));
  }, [aggregator]);

  // Reset selection when data changes
  React.useEffect(() => {
    setSelectedModels([]);
  }, [aggregator]);

  // Memoize transformed data and month keys
  const {
    data: streamData,
    monthKeys,
    activeModelSlugs,
  } = useMemo(
    () => transformDataForStream(aggregator, selectedMetric, selectedModels),
    [aggregator, selectedMetric, selectedModels]
  );

  // Group models by their categories for the custom legend
  const modelsByCategory = useMemo(() => {
    const groupedModels: Record<string, string[]> = {};

    activeModelSlugs.forEach((slug) => {
      const category = getModelCategory(slug);
      if (!groupedModels[category]) {
        groupedModels[category] = [];
      }
      groupedModels[category].push(slug);
    });

    return groupedModels;
  }, [activeModelSlugs]);

  // Get category names sorted
  const sortedCategories = useMemo(() => {
    return Object.keys(modelsByCategory).sort((a, b) =>
      (a as any).localeCompare(b as any)
    );
  }, [modelsByCategory]);

  // Custom legend component to replace the default Nivo legend
  const CustomLegend = () => (
    <div className="absolute top-[50px] right-0 mr-2 overflow-y-auto w-[100px]">
      {sortedCategories.map((category) => (
        <div key={category} className="px-1 py-1">
          {/* Category heading */}
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

  // Handle PNG Export
  const handleExport = useCallback(() => {
    if (chartContainerRef.current === null) {
      return;
    }

    htmlToImage
      .toPng(chartContainerRef.current, {
        // Use a dark background for the PNG export as the chart is styled for dark mode
        backgroundColor: "#1e1b4b", // Adjust if your background is different
        // You might need to adjust width/height or pixelRatio for higher resolution
        // width: chartContainerRef.current.offsetWidth * 2,
        // height: chartContainerRef.current.offsetHeight * 2,
        // style: { transform: 'scale(2)', transformOrigin: 'top left' }
        filter: (node) => {
          // Exclude the controls and legend from the export if desired
          // This example excludes the filter controls container
          if (
            node instanceof HTMLElement &&
            node.classList.contains("chart-controls-container")
          ) {
            return false;
          }
          // Exclude the custom legend container
          // REMOVED: The condition below was removed to include the legend
          // if (node instanceof HTMLElement && node.classList.contains('custom-legend-container')) {
          //    return false;
          // }
          return true;
        },
      })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = `stream-chart-${selectedMetric}-${
          selectedModels.length > 0 ? selectedModels.join("-") : "all-models"
        }.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error("Oops, something went wrong!", err);
        // Optionally show an error message to the user
      });
  }, [selectedMetric, selectedModels]); // Add dependencies

  // Basic loading/no data state
  if (
    !aggregator ||
    !aggregator.usageByDay ||
    Object.keys(aggregator.usageByDay).length === 0 ||
    streamData.length === 0 ||
    monthKeys.length === 0
  ) {
    return <div>Loading stream chart data or no data available...</div>;
  }

  const hasDataToShow = activeModelSlugs.length > 0;

  // Common Nivo theme settings for dark mode - match exactly with the bar chart
  const theme = {
    axis: {
      ticks: {
        line: {
          strokeWidth: 0,
        },
        text: {
          fill: "#B08AFF", // Match heatmap purple color
          fontSize: 10,
          textTransform: "lowercase" as const,
          fontFamily:
            "Geist Mono, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
          opacity: 0.8,
        },
      },
      legend: {
        text: {
          fill: "#B08AFF", // Match heatmap purple color
          fontSize: 10,
          textTransform: "lowercase" as const,
          fontFamily:
            "Geist Mono, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
        },
      },
    },
    grid: {
      line: { stroke: "rgba(255, 1, 200, 0.2)", strokeDasharray: "1 3" }, // Use pink/violet color from heatmap
    },
    tooltip: {
      container: {
        background: "#2d2d2d",
        color: "#ffffff",
        fontSize: "10px",
        fontFamily: "var(--font-geist-mono)",
      },
    },
    legends: {
      text: {
        fill: "#9ca3af",
        fontSize: 10,
        textTransform: "lowercase" as const,
        fontFamily:
          "Geist Mono, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
      },
    },
  };

  // Label formatting function
  const formatLabel = (value: number) => {
    if (selectedMetric === "cost") {
      return `$${value.toFixed(2)}`;
    }
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  return (
    <div className="relative">
      {/* Filter Controls Container - match style with bar chart */}
      <div className="absolute top-0 right-0 z-10 p-2 flex items-center gap-2 chart-controls-container">
        {/* Metric Selector */}
        <div className="relative flex items-center">
          <span className="mr-2 text-xs text-slate-600 font-sans sm:block hidden">
            show
          </span>
          <select
            id="stream-metric-select"
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as Metric)}
            className="bg-violet-600/20 text-violet-200 p-1 pl-2 pr-5 text-xs border border-violet-500/30 focus:outline-none focus:border-violet-500/30 hover:bg-violet-600/30 appearance-none font-sans md:min-w-[120px] min-w-[120px]"
          >
            <option value="cost">cost ($)</option>
            <option value="message_count">messages</option>
            <option value="conversation_count">conversations</option>
            <option value="input_tokens">input tokens</option>
            <option value="output_tokens">output tokens</option>
          </select>
          <ChevronsUpDown className="absolute right-1.5 top-1/2 transform -translate-y-1/2 h-3 w-3 shrink-0 opacity-50 text-violet-200 pointer-events-none" />
        </div>

        {/* Model MultiSelect */}
        <div className="flex items-center">
          <span className="mr-2 text-xs text-slate-600 font-sans sm:block hidden">
            from
          </span>
          <MultiSelect
            options={modelOptions}
            selected={selectedModels}
            onChange={setSelectedModels}
            placeholder="all models"
            className="bg-violet-600/20 text-violet-200 border border-violet-500/30 hover:bg-violet-600/30 focus:border-violet-500/30 font-sans w-[140px] md:w-[160px]"
            selectAllText="Select All"
          />
        </div>

        {/* Divider */}
        <div className="flex items-center">
          <div className="w-px h-5 bg-violet-500/30" />
        </div>

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

      {/* Chart Container - match height and padding with bar chart */}
      <div
        style={{ height: "560px", paddingTop: "60px" }}
        ref={chartContainerRef}
      >
        {hasDataToShow ? (
          <>
            <ResponsiveStream
              data={streamData}
              keys={activeModelSlugs}
              margin={{ top: 20, right: 115, bottom: 50, left: 40 }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: "",
                legendPosition: "middle",
                legendOffset: 40,
                format: (index) => {
                  const dayKey = monthKeys[index];
                  if (!dayKey) return "";

                  // Format to show month and year (like Jan 2023)
                  try {
                    const date = new Date(dayKey);
                    const monthNames = [
                      "Jan",
                      "Feb",
                      "Mar",
                      "Apr",
                      "May",
                      "Jun",
                      "Jul",
                      "Aug",
                      "Sep",
                      "Oct",
                      "Nov",
                      "Dec",
                    ];
                    return `${
                      monthNames[date.getMonth()]
                    } ${date.getFullYear()}`;
                  } catch {
                    return dayKey;
                  }
                },
                // Show only quarterly ticks (Jan, Apr, Jul, Oct) and skip first/last points
                tickValues: (() => {
                  const tickIndicesSet = new Set<number>();

                  // Skip first and last points as they often overlap with nearby labels
                  if (monthKeys.length > 2) {
                    // Add indices for quarter changes (Jan, Apr, Jul, Oct)
                    const quarterMonths = [0, 3, 6, 9]; // Jan, Apr, Jul, Oct

                    // Skip the first point (i=0) and start from i=1
                    for (let i = 1; i < monthKeys.length - 1; i++) {
                      try {
                        const currentDate = new Date(monthKeys[i]);
                        const prevDate = new Date(monthKeys[i - 1]);
                        const currentMonth = currentDate.getMonth();
                        const prevMonth = prevDate.getMonth();

                        // If we're entering a new quarter month
                        if (
                          quarterMonths.includes(currentMonth) &&
                          !quarterMonths.includes(prevMonth)
                        ) {
                          tickIndicesSet.add(i);
                        }

                        // Also show January of each year (new year)
                        if (currentMonth === 0 && prevMonth !== 0) {
                          tickIndicesSet.add(i);
                        }
                      } catch {
                        // Skip if date parsing fails
                      }
                    }
                  }

                  // Convert Set back to a sorted array to ensure uniqueness and order
                  return Array.from(tickIndicesSet).sort((a, b) => a - b);
                })(),
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: "",
                legendPosition: "middle",
                legendOffset: -40,
                format: (value) => {
                  const absValue = Math.abs(value);
                  if (absValue === 0) return "0"; // Return "0" if absolute value is 0

                  if (selectedMetric === "cost") {
                    // Use absValue for cost formatting
                    return absValue < 1
                      ? `$${absValue.toFixed(2)}`
                      : `$${Math.round(absValue)}`;
                  }
                  // Use absValue for large number formatting
                  if (absValue >= 1000000)
                    return `${(absValue / 1000000).toFixed(1)}M`;
                  if (absValue >= 1000)
                    return `${(absValue / 1000).toFixed(1)}K`;
                  // Return absolute value as string for smaller numbers
                  return absValue.toString();
                },
              }}
              enableGridX={false}
              enableGridY={true}
              offsetType="silhouette"
              order="ascending"
              colors={({ id }) => getModelColor(id as string)}
              fillOpacity={0.95}
              borderWidth={0}
              curve="basis"
              animate={true}
              motionConfig="gentle"
              theme={theme}
              isInteractive={false}
            />
            <div className="custom-legend-container">
              <CustomLegend />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select models with usage data for the selected metric.
          </div>
        )}
      </div>
    </div>
  );
}
