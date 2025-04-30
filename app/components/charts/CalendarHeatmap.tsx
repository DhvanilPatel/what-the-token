"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  ResponsiveCalendar,
  CalendarDatum,
  CalendarTooltipProps,
} from "@nivo/calendar";
import { Aggregator } from "@/lib/calculator";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select"; // Corrected import path
import { getModelCategory, prettifyModelName } from "@/lib/model-utils";
import * as htmlToImage from "html-to-image"; // Import html-to-image
import { Button } from "@/components/ui/button"; // Import Button component
import { Download, ChevronsUpDown } from "lucide-react"; // Import Download and ChevronsUpDown icons
// import Widget from "../ui/Widget"; // Don't import Widget here, it will wrap this component

type Metric =
  | "input_tokens"
  | "output_tokens"
  | "cost"
  | "message_count"
  | "conversation_count";

interface CalendarHeatmapProps {
  aggregator: Aggregator;
  // REMOVED props related to model selection state
  // selectedModels: string[];
  // modelOptions: MultiSelectOption[];
  // onSelectedModelsChange: (models: string[]) => void;
}

// Helper to transform data for Nivo Calendar, now considers selected model
const transformDataForCalendar = (
  aggregator: Aggregator,
  metric: Metric,
  selectedModels: string[] // Change selectedModel to selectedModels
): CalendarDatum[] => {
  return Object.entries(aggregator.usageByDay).map(([dayKey, dayBucket]) => {
    let value = 0;
    if (selectedModels.length > 0) {
      // Use data for the specific models if selected
      selectedModels.forEach((model) => {
        if (dayBucket.models[model]) {
          value += dayBucket.models[model][metric] || 0;
        }
      });
    } else {
      // Use total daily usage if no models are selected
      value = dayBucket.total[metric] || 0;
    }

    // Ensure zero values are consistent - set to exactly 0
    return {
      day: dayKey,
      value: value === 0 ? 0 : value, // Ensure exact zero for empty days
    };
  });
};

// New helper function to calculate appropriate domain values for the calendar
const calculateDomain = (
  data: CalendarDatum[],
  metric: Metric
): [number, number] => {
  if (!data || data.length === 0) return [0, 10];

  // Sort values to find distribution - only consider positive values
  const sortedValues = [...data]
    .filter((d) => d.value > 0) // Only include positive values
    .map((d) => d.value as number)
    .sort((a, b) => a - b);

  if (sortedValues.length === 0) return [0, 10];

  // Get the max value for upper bound
  const maxValue = sortedValues[sortedValues.length - 1];

  // For the lower bound, use a small positive value to ensure 0 is treated as empty
  const minValue = 0.001; // Small positive number to ensure 0 is treated as empty

  // For different metrics, we might want different scaling approaches
  if (metric === "cost") {
    // For cost, we might want to use the 90th percentile to avoid outliers
    const p90Index = Math.floor(sortedValues.length * 0.9);
    const p90Value = sortedValues[p90Index];
    return [minValue, Math.max(p90Value * 1.2, maxValue / 5)]; // Cap at 20% above 90th percentile or 1/5 of max
  } else if (metric === "input_tokens" || metric === "output_tokens") {
    // For tokens, use 80th percentile to avoid outliers
    const p80Index = Math.floor(sortedValues.length * 0.8);
    const p80Value = sortedValues[p80Index];
    return [minValue, Math.max(p80Value * 1.5, maxValue / 10)]; // Cap at 50% above 80th percentile or 1/10 of max
  } else {
    // For message and conversation counts, use more granular distribution
    // Use 75th percentile as upper bound to make common values more visible
    const p75Index = Math.floor(sortedValues.length * 0.75);
    const p75Value = sortedValues[p75Index];
    return [minValue, Math.max(p75Value * 2, maxValue / 20)]; // Double 75th percentile or 1/20 of max
  }
};

// Helper to get unit label for each metric
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

// Format the value based on the metric
const formatMetricValue = (value: number, metric: Metric): string => {
  if (metric === "cost") {
    return `$${value.toFixed(2)}`;
  }
  return value.toLocaleString();
};

// Custom Tooltip
interface EnhancedTooltipProps extends CalendarTooltipProps {
  metric: Metric;
}

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

// Extract date parts from day string (YYYY-MM-DD)
const extractDateParts = (day: string) => {
  if (!day) return { year: "", month: "", date: "" };

  const [year, month, date] = day.split("-");
  return { year, month, date };
};

const CustomTooltip = ({ day, value, color, metric }: EnhancedTooltipProps) => {
  if (value === undefined) return null;

  // Convert value to number if it's a string
  const numericValue = typeof value === "string" ? parseFloat(value) : value;

  // Extract date parts
  const { year, month, date } = extractDateParts(day);

  // Month names for display
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
  const monthName = month ? monthNames[parseInt(month, 10) - 1] : "";

  return (
    <div
      // Match Treemap tooltip style: dark background, border, padding
      className="bg-black p-0.5 border border-black flex flex-col items-start"
      style={{
        color: "#ffffff",
        padding: "6px 10px",
        boxShadow: "0 2px 5px rgba(0,0,0,0.2)", // Keep shadow for visibility
        fontSize: "10px",
        fontFamily: "var(--font-geist-mono)",
      }}
    >
      {/* First line: Color square + Date (Month Day) */}
      <div className="flex flex-row items-center justify-start w-full">
        <span
          className="w-3 h-3 mr-2 flex-shrink-0" // Added flex-shrink-0
          style={{
            backgroundColor: color,
          }}
        ></span>
        <p className="text-xs font-sans text-white">
          {monthName} {date} {year} {/* Show full date on first line */}
        </p>
      </div>
      {/* Second section: Metric and Value */}
      <div className="flex flex-col mt-1 w-full text-left">
        <p className="text-2xs font-sans text-white">
          {/* Use violet text for label */}
          <span className="text-violet-300/70">
            {metric === "cost" ? "Cost" : prettifyMetricName(metric)}:
          </span>{" "}
          {formatMetricValue(numericValue, metric)}
        </p>
        {/* Removed redundant Day/Month/Year breakdown */}
      </div>
    </div>
  );
};

export default function CalendarHeatmap({ aggregator }: CalendarHeatmapProps) {
  const [selectedMetric, setSelectedMetric] = useState<Metric>("message_count");
  const [selectedModels, setSelectedModels] = useState<string[]>([]); // State moved back here
  const chartContainerRef = useRef<HTMLDivElement>(null); // Ref for the chart container

  // Create model options from the aggregator data
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

  // Reset selected models when aggregator data changes
  React.useEffect(() => {
    setSelectedModels([]); // Clear selection on new aggregator data
  }, [aggregator]);

  if (
    !aggregator ||
    !aggregator.usageByDay ||
    Object.keys(aggregator.usageByDay).length === 0
  ) {
    return <div>Loading calendar data or no data available...</div>;
  }

  // --- MODIFICATION START: Hardcode 3-year span ---
  const latestDateStr =
    aggregator.endDate || Object.keys(aggregator.usageByDay).sort().pop();
  if (!latestDateStr) {
    return <div>Could not determine date range.</div>;
  }
  const latestDate = new Date(latestDateStr);
  const endYear = latestDate.getFullYear();
  const startYear = endYear - 2; // Go back 2 years for a 3-year total span

  const fromDate = `${startYear}-01-01`; // Start of the calculated start year
  const toDate = `${endYear}-12-31`; // End of the latest year in data

  // Filter the raw data to only include days within our fixed 3-year range
  const filteredUsageByDay = Object.entries(aggregator.usageByDay)
    .filter(([dayKey]) => {
      const dayDate = new Date(dayKey);
      return dayDate >= new Date(fromDate) && dayDate <= new Date(toDate);
    })
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {} as typeof aggregator.usageByDay);

  // Use the filtered data for Nivo
  const calendarData = transformDataForCalendar(
    { ...aggregator, usageByDay: filteredUsageByDay }, // Pass modified data
    selectedMetric,
    selectedModels
  );

  // Calculate domain based on the filtered data and selected metric
  const [minValue, maxValue] = calculateDomain(calendarData, selectedMetric);

  // --- MODIFICATION: Use Fixed Height for 3 years ---
  const fixedChartHeight = 580; // Fixed height suitable for 3 years + margins/legend

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
          return true; // Include everything else (including Nivo legend)
        },
      })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = `calendar-heatmap-${selectedMetric}-${
          selectedModels.length > 0 ? selectedModels.join("-") : "all-models"
        }.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error("Oops, something went wrong!", err);
      });
  }, [selectedMetric, selectedModels]); // Dependencies

  return (
    <div className="relative w-full">
      {/* Filter Controls Container - Positioned Top Right - Added class name */}
      <div className="absolute top-0 right-0 z-10 p-2 flex items-center gap-2 chart-controls-container">
        {/* Metric Selector */}
        <div className="flex items-center">
          <span className="mr-2 text-xs text-slate-600 font-sans sm:block hidden">
            show
          </span>
          <div className="relative flex items-center">
            <select
              id="calendar-metric-select"
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as Metric)}
              className="bg-violet-600/20 text-violet-200 p-1 pl-2 pr-5 text-xs border border-violet-500/30 focus:outline-none focus:border-violet-500/30 hover:bg-violet-600/30 appearance-none font-sans md:min-w-[120px] min-w-[120px]"
            >
              <option value="message_count">messages</option>
              <option value="conversation_count">conversations</option>
              <option value="input_tokens">input tokens</option>
              <option value="output_tokens">output tokens</option>
              <option value="cost">cost</option>
            </select>
            <ChevronsUpDown className="absolute right-1.5 top-1/2 transform -translate-y-1/2 h-3 w-3 shrink-0 opacity-50 text-violet-200 pointer-events-none" />
          </div>
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
          />
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

      {/* Use calculated height - Added padding-top to prevent overlap and ref */}
      <div
        // --- MODIFICATION: Use fixed height ---
        style={{ height: `${fixedChartHeight}px`, paddingTop: "60px" }}
        className="w-full"
        ref={chartContainerRef} // Attach ref here
      >
        <ResponsiveCalendar
          data={calendarData}
          // --- MODIFICATION: Use fixed dates ---
          from={fromDate}
          to={toDate}
          emptyColor="rgba(106, 0, 255, 0.05)" // Even lighter for empty
          colors={[
            // More saturated pink color scheme with 5 steps
            "rgba(255, 1, 200, 0.25)", // Increased from 0.1 to 0.25
            "rgba(255, 1, 200, 0.45)", // Increased from 0.35 to 0.45
            "rgba(255, 1, 200, 0.65)", // Increased from 0.5 to 0.65
            "rgba(255, 1, 200, 0.85)", // Increased from 0.7 to 0.85
            "rgba(255, 1, 200, 1)", // Keep max at 1
          ]}
          minValue={minValue}
          maxValue={maxValue}
          valueFormat=".0f" // Format value as integer without decimals
          margin={{ top: 40, right: 5, bottom: 40, left: 20 }}
          yearSpacing={45}
          monthBorderWidth={0}
          monthBorderColor="rgba(255, 1, 200, 0.2)" // Gray border for months
          dayBorderWidth={2}
          dayBorderColor="transparent" // Darker background color for day borders
          daySpacing={-1} // Add a little space between days
          theme={{
            labels: {
              text: {
                opacity: 0.8,
                fill: "#B08AFF", // Lighter gray for labels
                fontSize: 10,
                textTransform: "lowercase",
                fontFamily:
                  "Geist Mono, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
              },
            },
            tooltip: {
              container: {
                // Basic styles, CustomTooltip handles the look
                background: "transparent",
                padding: 0,
                borderRadius: 0,
                boxShadow: "none",
              },
            },
            axis: {
              ticks: {
                line: {
                  strokeWidth: 0,
                },
                text: {
                  fill: "#9ca3af", // Month name color
                  fontSize: 10,
                  textTransform: "lowercase",
                  fontFamily:
                    "Geist Mono, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
                },
              },
            },
          }}
          tooltip={(props) => (
            <CustomTooltip {...props} metric={selectedMetric} />
          )} // Pass metric to tooltip
          legends={[
            {
              anchor: "bottom-left", // Move legend
              direction: "row",
              translateY: 40,
              itemCount: 5, // Show all 5 colors
              itemWidth: 35,
              itemHeight: 20,
              itemsSpacing: 10,
              itemDirection: "left-to-right",
              itemTextColor: "#9ca3af",
              symbolShape: "square", // Use square like GitHub
              symbolSize: 12, // Adjust size
            },
          ]}
          yearLegendPosition="before"
          yearLegendOffset={10}
        />
      </div>
    </div>
  );
}
