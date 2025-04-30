"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import { ResponsiveBar } from "@nivo/bar";
import { Aggregator } from "@/lib/calculator";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import {
  getModelCategory,
  prettifyModelName,
  MODEL_CATEGORY_COLORS,
} from "@/lib/model-utils";
import { format as d3Format } from "d3-format";
import * as htmlToImage from "html-to-image";
import { Button } from "@/components/ui/button";
import { Download, ChevronsUpDown } from "lucide-react";

// Define the types of metrics that can be displayed
type Metric =
  | "input_tokens"
  | "output_tokens"
  | "cost"
  | "message_count"
  | "conversation_count";

// Define the types of time aggregation
type AggregationType = "week" | "month";

// Define the props for the component
interface ModelUsageBarChartProps {
  aggregator: Aggregator;
}

// Define the structure of the data points Nivo Bar expects
// Each object is a time period (week or month), keys are model slugs + time key
type BarDataPoint = {
  timeKey: string; // YYYY-Www or YYYY-MM format
  [modelSlug: string]: number | string; // Metric value for each model
};
type BarData = BarDataPoint[];

// Helper function to get ISO week number and year (e.g., 2023-W42)
const getWeekKey = (dateString: string): string => {
  const date = new Date(dateString);
  // Adjust to UTC to avoid timezone issues affecting week calculation
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7)); // Adjust to Thursday of the week
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  // Calculate full weeks to Thursday
  const weekNo = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  // Return YYYY-Www format
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
};

// Helper function to get month key from date string (e.g., 2023-05)
const getMonthKey = (dateString: string): string => {
  const date = new Date(dateString);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}`;
};

// Format week key as Quarter + Year
const getQuarterFromWeekKey = (weekKey: string): string => {
  try {
    // Extract year and week number from the YYYY-Www format
    const match = weekKey.match(/^(\d{4})-W(\d{1,2})$/);
    if (!match) {
      return weekKey; // Return original if format doesn't match
    }

    const year = parseInt(match[1], 10);
    const weekNum = parseInt(match[2], 10);

    // Create a date for Jan 1 of the year
    const firstDayOfYear = new Date(year, 0, 1);

    // Add the week offset (weeks start from 1)
    const targetDate = new Date(firstDayOfYear);
    targetDate.setDate(firstDayOfYear.getDate() + (weekNum - 1) * 7);

    // Get the quarter (0-3)
    const quarter = Math.floor(targetDate.getMonth() / 3);

    // Map quarter to first month of that quarter
    const quarterMonths = ["Jan", "Apr", "Jul", "Oct"];

    return `${quarterMonths[quarter]} ${year}`;
  } catch (e) {
    // Fallback to safe display if any errors
    console.error("Error parsing week key:", weekKey, e);
    return weekKey;
  }
};

// Format month key for display
const formatMonthKey = (monthKey: string): string => {
  try {
    // Extract year and month from the YYYY-MM format
    const match = monthKey.match(/^(\d{4})-(\d{2})$/);
    if (!match) {
      return monthKey; // Return original if format doesn't match
    }

    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // JS months are 0-indexed

    // Create array of month names
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

    return `${monthNames[month]} ${year}`;
  } catch (e) {
    // Fallback to safe display if any errors
    console.error("Error parsing month key:", monthKey, e);
    return monthKey;
  }
};

// Function to determine which week keys should show labels (one per quarter)
const getQuarterlyTickValues = (data: BarData): string[] => {
  const tickValues: string[] = [];
  let currentQuarter = "";

  data.forEach((itemData) => {
    const quarter = getQuarterFromWeekKey(itemData.timeKey);
    if (quarter !== currentQuarter) {
      tickValues.push(itemData.timeKey);
      currentQuarter = quarter;
    }
  });

  return tickValues;
};

// Function to determine which month keys should show labels
const getMonthlyTickValues = (data: BarData): string[] => {
  // For monthly view, we can show all months
  return data.map((itemData) => itemData.timeKey);
};

// Helper function to transform aggregator data into Nivo Bar format (Weekly or Monthly)
const transformDataForBarChart = (
  aggregator: Aggregator,
  metric: Metric,
  selectedModels: string[],
  aggregationType: AggregationType
): BarData => {
  const timeAgg: Record<string, { [modelSlug: string]: number }> = {}; // { 'YYYY-Www' or 'YYYY-MM': { modelSlug: value } }

  // Aggregate daily data into time totals per selected model
  Object.entries(aggregator.usageByDay).forEach(([dayKey, dayBucket]) => {
    const timeKey =
      aggregationType === "week" ? getWeekKey(dayKey) : getMonthKey(dayKey);

    if (!timeAgg[timeKey]) {
      timeAgg[timeKey] = {};
    }

    // Get list of models to process (all models if selection is empty)
    const modelsToProcess =
      selectedModels.length > 0
        ? selectedModels
        : Object.keys(dayBucket.models);

    modelsToProcess.forEach((slug) => {
      const modelData = dayBucket.models[slug];
      if (modelData) {
        const value = modelData[metric] || 0;
        if (!timeAgg[timeKey][slug]) {
          timeAgg[timeKey][slug] = 0;
        }
        timeAgg[timeKey][slug] += value;
      }
    });
  });

  // Convert aggregated data into the array format Nivo expects
  const sortedTimeKeys = Object.keys(timeAgg).sort();
  const barData: BarData = sortedTimeKeys.map((timeKey) => {
    const timeDataPoint: BarDataPoint = { timeKey: timeKey }; // Use 'timeKey' as the index key

    // Determine which models to include in this data point
    const timeModels = Object.keys(timeAgg[timeKey] || {});
    const modelsToInclude =
      selectedModels.length > 0
        ? selectedModels.filter((slug) => timeModels.includes(slug))
        : timeModels;

    // Add each model's value to this time period's data point
    modelsToInclude.forEach((slug) => {
      timeDataPoint[slug] = timeAgg[timeKey]?.[slug] || 0;
    });

    return timeDataPoint;
  });

  return barData;
};

// Helper function to get unit label for each metric
const getMetricUnit = (metric: Metric): string => {
  switch (metric) {
    case "input_tokens":
    case "output_tokens":
      return "tokens";
    case "cost":
      return "$";
    case "message_count":
      return "messages";
    case "conversation_count":
      return "conversations";
    default:
      return "";
  }
};

// Helper to extract week number from the week key
const getWeekNumber = (weekKey: string): string => {
  const match = weekKey.match(/^(\d{4})-W(\d{1,2})$/);
  if (match) {
    return match[2];
  }
  return "";
};

// Helper to extract year from the week key
const getYearFromWeekKey = (weekKey: string): string => {
  const match = weekKey.match(/^(\d{4})-W(\d{1,2})$/);
  if (match) {
    return match[1];
  }
  return "";
};

// Helper to extract month from the month key
const getMonthFromKey = (monthKey: string): string => {
  const match = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (match) {
    const monthNum = parseInt(match[2], 10);
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return monthNames[monthNum - 1];
  }
  return "";
};

// Helper to extract year from the month key
const getYearFromMonthKey = (monthKey: string): string => {
  const match = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (match) {
    return match[1];
  }
  return "";
};

// Helper function to prettify metric names
const prettifyMetricName = (metric: Metric): string => {
  switch (metric) {
    case "input_tokens":
      return "Input Tokens";
    case "output_tokens":
      return "Output Tokens";
    case "message_count":
      return "Messages";
    case "conversation_count":
      return "Conversations";
    default:
      return metric.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }
};

// Helper function to get color for a model based on its category
const getModelColor = (modelSlug: string): string => {
  const category = getModelCategory(modelSlug);

  if (!MODEL_CATEGORY_COLORS[category]) {
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
  const colorIndex =
    hashCode(modelSlug) % MODEL_CATEGORY_COLORS[category].length;
  return MODEL_CATEGORY_COLORS[category][colorIndex];
};

export default function ModelUsageBarChart({
  aggregator,
}: ModelUsageBarChartProps) {
  const [selectedMetric, setSelectedMetric] =
    useState<Metric>("conversation_count");
  const [aggregationType, setAggregationType] =
    useState<AggregationType>("week"); // Default to week
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Get all available model slugs from the aggregator
  const allModelSlugs = useMemo(
    () =>
      aggregator.allModelSlugs
        ? Array.from(aggregator.allModelSlugs).sort()
        : [],
    [aggregator.allModelSlugs]
  );

  // State for currently selected models, default to empty initially (meaning "all models")
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

  // Convert slugs to options for MultiSelect
  const modelOptions: MultiSelectOption[] = useMemo(
    () =>
      allModelSlugs.map((slug) => ({
        value: slug,
        label: prettifyModelName(slug),
        group: getModelCategory(slug),
      })),
    [allModelSlugs]
  );

  // Reset selected models when aggregator data changes
  React.useEffect(() => {
    setSelectedModels([]); // Clear selection on new data = select all models
  }, [aggregator]);

  // Memoize the transformed data based on selected metric, models, and aggregation type
  const barData = useMemo(
    () =>
      transformDataForBarChart(
        aggregator,
        selectedMetric,
        selectedModels,
        aggregationType
      ),
    [aggregator, selectedMetric, selectedModels, aggregationType]
  );

  // Custom color function to assign colors based on model category
  const getModelColors = () => {
    const colorMap: Record<string, string> = {};
    // Use all models if selectedModels is empty
    const modelsToColor =
      selectedModels.length > 0 ? selectedModels : allModelSlugs;

    modelsToColor.forEach((slug) => {
      colorMap[slug] = getModelColor(slug);
    });
    return colorMap;
  };

  // Group models by their categories for the custom legend
  const modelsByCategory = useMemo(() => {
    const groupedModels: Record<string, string[]> = {};
    // Use all models if selectedModels is empty
    const modelsToGroup =
      selectedModels.length > 0 ? selectedModels : allModelSlugs;

    modelsToGroup.forEach((slug) => {
      const category = getModelCategory(slug);
      if (!groupedModels[category]) {
        groupedModels[category] = [];
      }
      groupedModels[category].push(slug);
    });

    return groupedModels;
  }, [selectedModels, allModelSlugs]);

  // Get category names sorted according to MODEL_CATEGORIES order
  const sortedCategories = useMemo(() => {
    return Object.keys(modelsByCategory).sort((a, b) =>
      // We're using the compareCategories function from model-utils
      // which is also used in the multi-select component
      (a as any).localeCompare(b as any)
    );
  }, [modelsByCategory]);

  // Handle PNG Export
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
        link.download = `${aggregationType}ly-bar-chart-${selectedMetric}-${
          selectedModels.length > 0 ? selectedModels.join("-") : "all-models"
        }.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error("Oops, something went wrong!", err);
      });
  }, [selectedMetric, selectedModels, allModelSlugs, aggregationType]);

  // Basic loading/no data state
  if (
    !aggregator ||
    !aggregator.usageByDay ||
    Object.keys(aggregator.usageByDay).length === 0 ||
    allModelSlugs.length === 0
  ) {
    return <div>Loading chart data or no data available...</div>;
  }

  // Get the keys to use for the bar chart - all models or selected models
  const barChartKeys =
    selectedModels.length > 0 ? selectedModels : allModelSlugs;

  // Render only if there's data to show after transformation
  const hasDataToShow = barData.length > 0;

  // Common Nivo theme settings for dark mode
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

  // Custom legend component to replace the default Nivo legend
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

  return (
    <div className="relative">
      {/* Controls Container */}
      <div className="absolute top-0 right-0 z-10 p-2 flex items-center gap-2 chart-controls-container">
        {/* Metric Selector */}
        <div className="flex items-center">
          {/* Aggregation Type Switcher */}
          <div className="flex items-center border border-violet-500/30 overflow-hidden mr-3">
            <button
              onClick={() => setAggregationType("week")}
              className={`px-2 py-0.5 !text-xs font-sans ${
                aggregationType === "week"
                  ? "bg-violet-600/40 text-violet-100"
                  : "bg-violet-600/10 text-violet-300 hover:bg-violet-600/20"
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setAggregationType("month")}
              className={`px-2 py-0.5 !text-xs font-sans ${
                aggregationType === "month"
                  ? "bg-violet-600/40 text-violet-100"
                  : "bg-violet-600/10 text-violet-300 hover:bg-violet-600/20"
              }`}
            >
              Monthly
            </button>
          </div>
          <div className="relative flex items-center">
            <select
              id="metric-select-barchart"
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
        </div>

        {/* Model Multi-Selector - Removed selectAllText to match CalendarHeatmap */}
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
          />
        </div>

        {/* Divider - Adjusted from user edit */}
        <div className="w-px h-5 bg-violet-500/30 mx-1" />

        {/* Export Button - Adjusted from user edit */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="bg-violet-600/20 text-violet-200 border border-violet-500/30 hover:bg-violet-600/30 hover:text-violet-100 rounded-none !w-7 !h-7 flex items-center justify-center"
          title="Export as PNG"
        >
          <Download className="h-3 !w-3" />
        </Button>
      </div>

      {/* Chart Container - Added padding-top */}
      <div
        style={{ height: "560px", paddingTop: "60px" }}
        ref={chartContainerRef}
      >
        {" "}
        {/* Increased height slightly */}
        {hasDataToShow ? (
          <>
            <ResponsiveBar
              data={barData}
              keys={barChartKeys}
              indexBy="timeKey"
              margin={{ top: 20, right: 115, bottom: 50, left: 40 }}
              padding={0.1}
              valueScale={{ type: "linear" }}
              indexScale={{ type: "band", round: true }}
              colors={({ id }) => getModelColor(id as string)}
              borderColor={{ from: "color", modifiers: [["darker", 1.6]] }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: "",
                legendPosition: "middle",
                legendOffset: 40,
                tickValues:
                  aggregationType === "week"
                    ? getQuarterlyTickValues(barData)
                    : getMonthlyTickValues(barData),
                format: (value) =>
                  aggregationType === "week"
                    ? getQuarterFromWeekKey(value as string)
                    : formatMonthKey(value as string),
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: "",
                legendPosition: "middle",
                legendOffset: -50,
                format: (value) => (value === 0 ? "0" : d3Format(".2s")(value)),
              }}
              enableLabel={false}
              legends={[]}
              tooltip={({ id, value, indexValue, color }) => (
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
                      className="w-3 h-3 mr-2 flex-shrink-0"
                      style={{
                        backgroundColor: color,
                      }}
                    ></span>
                    <p className="text-xs font-sans text-white truncate">
                      {prettifyModelName(id as string)}
                    </p>
                  </div>
                  <div className="flex flex-col mt-1 w-full text-left">
                    <p className="text-2xs font-sans text-white">
                      <span className="text-violet-300/70">
                        {selectedMetric === "cost"
                          ? "Cost"
                          : prettifyMetricName(selectedMetric)}
                        :
                      </span>{" "}
                      {formatLabel(value)}
                    </p>
                    <p className="text-2xs font-sans text-white">
                      <span className="text-violet-300/70">
                        {aggregationType === "week" ? "Week" : "Month"}:
                      </span>{" "}
                      {aggregationType === "week"
                        ? `${getWeekNumber(
                            indexValue as string
                          )} (${getYearFromWeekKey(indexValue as string)})`
                        : `${getMonthFromKey(
                            indexValue as string
                          )} (${getYearFromMonthKey(indexValue as string)})`}
                    </p>
                  </div>
                </div>
              )}
              theme={theme}
              animate={true}
              motionConfig="gentle"
              role="application"
              ariaLabel={`Nivo bar chart showing model usage over time (${aggregationType}ly)`}
            />
            <div className="custom-legend-container">
              <CustomLegend />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No data available to display.
          </div>
        )}
      </div>
    </div>
  );
}
