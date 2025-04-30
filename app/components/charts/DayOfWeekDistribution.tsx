"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  ResponsiveLine,
  Serie,
  PointTooltipProps,
  CustomLayerProps,
} from "@nivo/line";
import { area, curveMonotoneX, curveBasis } from "d3-shape";
import { Aggregator } from "@/lib/calculator";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { getModelCategory, prettifyModelName } from "@/lib/model-utils";
import * as htmlToImage from "html-to-image";
import { Button } from "@/components/ui/button";
import { Download, ChevronsUpDown } from "lucide-react";

type Metric = "cost" | "message_count" | "input_tokens" | "output_tokens";

interface DayOfWeekDistributionProps {
  aggregator: Aggregator;
}

interface AvgData {
  sum: number;
  count: number;
}

type WeeklyHourData = AvgData[][];

// Our data points store both the top (y) and baseline (baseY) so we can do a proper ridgeline fill
interface ExtendedDataPoint {
  x: number; // hour
  y: number; // offset + normalized average
  originalAvg?: number;
  baseY: number; // offset baseline for that day
}

// Day-of-week lookups
const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const DAY_ABBR = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// Helper: get day of week (0=Sun, 6=Sat) from YYYY-MM-DD
function getDayOfWeek(dayKey: string): number {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCDay();
}

// Helper function to generate controlled random value
function jitter(baseValue: number, range: number): number {
  return baseValue + (Math.random() * 2 - 1) * range;
}

// Helper to get a deterministic but varied time offset for a given day/hour
// This ensures consistent offsets while breaking the vertical alignment
function getTimeOffset(dayOfWeek: number, hour: number): number {
  // Use a simple hash function based on day and hour to get a deterministic value
  const hash = (dayOfWeek * 24 + hour) % 17; // Using prime number 17 to get varied distribution

  // Convert to a time offset between -0.4 and 0.4 (±24 minutes)
  return (hash / 17) * 0.8 - 0.4;
}

// Summarize aggregator data (for chosen models & metric) into a 7×24 grid
function calculateWeeklyHourlyAverages(
  aggregator: Aggregator,
  metric: Metric,
  selectedModels: string[]
): WeeklyHourData | null {
  // Initialize 7x24 with { sum: 0, count: 0 }
  const weeklyData: WeeklyHourData = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => ({ sum: 0, count: 0 }))
  );

  let totalEntries = 0;

  Object.entries(aggregator.usageByDay).forEach(([dayKey, dayBucket]) => {
    const dayOfWeek = getDayOfWeek(dayKey);

    // If models are selected, combine only those
    if (selectedModels.length > 0) {
      for (let hour = 0; hour < 24; hour++) {
        let hourSum = 0;
        let contributed = false;

        selectedModels.forEach((model) => {
          const hourVal = dayBucket.models[model]?.hours?.[hour]?.[metric] ?? 0;
          hourSum += hourVal;
          if (hourVal > 0) contributed = true;
        });

        weeklyData[dayOfWeek][hour].sum += hourSum;
        if (contributed) {
          weeklyData[dayOfWeek][hour].count += 1;
          totalEntries++;
        }
      }
    } else {
      // If no models selected, use dayBucket.total
      const totalHourBuckets = dayBucket.total.hours;
      if (totalHourBuckets) {
        for (let hour = 0; hour < 24; hour++) {
          const val = totalHourBuckets[hour]?.[metric] ?? 0;
          weeklyData[dayOfWeek][hour].sum += val;
          if (val > 0) {
            weeklyData[dayOfWeek][hour].count += 1;
            totalEntries++;
          }
        }
      }
    }
  });

  return totalEntries === 0 ? null : weeklyData;
}

// Transform that 7×24 grid into Nivo `Serie[]` with each day offset
function transformAverageDataForLine(weeklyData: WeeklyHourData): Serie[] {
  const series: Serie[] = [];
  let globalMaxAvg = 0;

  // First, find max average across all day/hour for normalization
  weeklyData.forEach((dayData) => {
    dayData.forEach((hourData) => {
      const avg = hourData.count > 0 ? hourData.sum / hourData.count : 0;
      if (avg > globalMaxAvg) globalMaxAvg = avg;
    });
  });
  if (globalMaxAvg === 0) globalMaxAvg = 1; // Avoid divide-by-zero

  // We'll shift each day by an integer offset. Sunday=0, Monday=1, ... Sat=6
  // But we want the last day (Sat) at the *top*, so we go in reverse.
  const offsetFactor = 0.5; // Smaller factor = more overlap
  const yScaleFactor = 2.5; // Increased for more dramatic effect
  const significanceThreshold = 0.1; // Only show peaks that are at least 10% of global max

  for (let dayOfWeek = 6; dayOfWeek >= 0; dayOfWeek--) {
    const dayData = weeklyData[dayOfWeek];

    // Create higher resolution data with points that ensure spikes with flat valleys
    const highResData: ExtendedDataPoint[] = [];
    const yOffset = (6 - dayOfWeek) * offsetFactor;

    // Add padding point before hour 0 with zero value for better visual closure
    highResData.push({
      x: -0.5,
      y: yOffset, // Just the baseline
      baseY: yOffset,
      originalAvg: 0,
    });

    // Filter hours to only include significant values
    const significantHours = Array.from({ length: 24 }, (_, i) => i).filter(
      (hour) => {
        const hourData = dayData[hour];
        const avg = hourData.count > 0 ? hourData.sum / hourData.count : 0;
        return avg / globalMaxAvg >= significanceThreshold;
      }
    );

    // For each significant hour, create a steep spike
    for (let hour = 0; hour < 24; hour++) {
      const hourData = dayData[hour];
      const avg = hourData.count > 0 ? hourData.sum / hourData.count : 0;
      const normalizedY = avg / globalMaxAvg;

      // Skip insignificant hours - they'll just be a flat line at the baseline
      if (normalizedY < significanceThreshold) {
        // Add a single flat point at the baseline for continuity
        if (hour % 2 === 0) {
          // Add points every 2 hours for flat segments
          highResData.push({
            x: hour,
            y: yOffset + 0.005, // Very slightly above baseline
            baseY: yOffset,
            originalAvg: avg,
          });
        }
        continue;
      }

      // Apply a wider time shift for more significant values
      // This creates greater horizontal variety
      const timeShift = getTimeOffset(dayOfWeek, hour);
      const adjustedTimeShift = timeShift * (1 + normalizedY); // Bigger values get bigger shifts
      const shiftedHour = hour + adjustedTimeShift;

      // Approach point with randomized distance
      const approachDist = jitter(0.2, 0.05);
      highResData.push({
        x: shiftedHour - approachDist,
        y: yOffset + 0.01, // Very tiny height at approach
        baseY: yOffset,
        originalAvg: 0,
      });

      // Peak point with time shift applied
      highResData.push({
        x: shiftedHour,
        y: normalizedY * yScaleFactor + yOffset,
        baseY: yOffset,
        originalAvg: avg,
      });

      // Retreat point with randomized distance
      const retreatDist = jitter(0.2, 0.05);
      highResData.push({
        x: shiftedHour,
        y: yOffset, // Very tiny height at retreat
        baseY: yOffset,
        originalAvg: 0,
      });
    }

    // Add padding point after hour 23 with zero value
    highResData.push({
      x: 24.5,
      y: yOffset, // Just the baseline
      baseY: yOffset,
      originalAvg: 0,
    });

    series.push({
      id: DAY_NAMES[dayOfWeek],
      data: highResData,
    });
  }

  return series;
}

// Custom layer to draw the "ridgeline" fill from baseY up to y (instead of from y down to 0)
function RidgelineAreaLayer({ series, xScale, yScale }: CustomLayerProps) {
  // We'll use d3-shape's area generator with a basis curve for smoothing
  const areaGen = area<ExtendedDataPoint>()
    // Explicitly cast scales to numeric functions for d3-shape
    .x((d) => (xScale as (value: number) => number)(d.x))
    .y0((d) => (yScale as (value: number) => number)(d.baseY)) // fill starts at the baseline offset
    .y1((d) => (yScale as (value: number) => number)(d.y)) // fill extends up to the top line
    .curve(curveBasis);

  return (
    <g>
      {series.map((serie) => {
        // Nivo's data points are nested slightly differently
        // Ensure data points conform to ExtendedDataPoint structure expected by areaGen
        const dataForArea = serie.data.map(
          (d) => d.data
        ) as ExtendedDataPoint[];
        const pathData = areaGen(dataForArea);
        return (
          <path
            key={serie.id}
            d={pathData || ""} // Use empty string if pathData is null
            fill="#01FFFF"
            fillOpacity={0.8}
            stroke="none"
          />
        );
      })}
    </g>
  );
}

export default function DayOfWeekDistribution({
  aggregator,
}: DayOfWeekDistributionProps) {
  const [selectedMetric, setSelectedMetric] = useState<Metric>("message_count");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Build model options for the MultiSelect
  const modelOptions: MultiSelectOption[] = useMemo(() => {
    if (!aggregator?.allModelSlugs) return [];
    return Array.from(aggregator.allModelSlugs)
      .sort()
      .map((slug) => ({
        value: slug,
        label: prettifyModelName(slug),
        group: getModelCategory(slug),
      }));
  }, [aggregator]);

  // On aggregator change, reset selected models
  React.useEffect(() => {
    setSelectedModels([]);
  }, [aggregator]);

  // Build chart data
  const chartData = useMemo(() => {
    const weeklyData = calculateWeeklyHourlyAverages(
      aggregator,
      selectedMetric,
      selectedModels
    );
    if (!weeklyData) return null;
    return transformAverageDataForLine(weeklyData);
  }, [aggregator, selectedMetric, selectedModels]);

  // Handle PNG Export
  const handleExport = useCallback(() => {
    if (chartContainerRef.current === null) {
      return;
    }

    htmlToImage
      .toPng(chartContainerRef.current, {
        backgroundColor: "#1e1b4b",
        filter: (node) => {
          // Exclude the controls container
          if (
            node instanceof HTMLElement &&
            node.classList.contains("chart-controls-container")
          ) {
            return false;
          }
          return true;
        },
      })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = `day-of-week-${selectedMetric}-${
          selectedModels.length > 0 ? selectedModels.join("-") : "all-models"
        }.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error("Oops, something went wrong!", err);
      });
  }, [selectedMetric, selectedModels]);

  // If no data is available yet
  if (
    !aggregator ||
    !aggregator.usageByDay ||
    Object.keys(aggregator.usageByDay).length === 0 ||
    !chartData ||
    chartData.length === 0
  ) {
    return <div>Loading distribution data or no data available...</div>;
  }

  // Nivo theming
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

  // For tooltip labeling
  function formatMetricValue(value: number) {
    if (selectedMetric === "cost") return `$${value.toFixed(3)}`;
    return value % 1 === 0 ? value.toLocaleString() : value.toFixed(1);
  }

  // Basic type guard
  interface TooltipDataPoint {
    x: number;
    y: number;
    originalAvg?: number;
  }
  function isTooltipDataPoint(d: unknown): d is TooltipDataPoint {
    return typeof d === "object" && d !== null && "x" in d && "y" in d;
  }

  return (
    <div className="relative" ref={chartContainerRef}>
      {/* Controls (top-right) */}
      <div className="absolute top-0 right-0 z-10 p-2 flex items-center gap-2 chart-controls-container">
        {/* Metric Selector */}
        <div className="flex items-center">
          <span className="mr-2 text-xs text-slate-600 font-sans sm:block hidden">
            avg
          </span>
          <div className="relative flex items-center">
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as Metric)}
              className="bg-violet-600/20 text-violet-200 p-1 pl-2 pr-5 text-xs border border-violet-500/30 focus:outline-none focus:border-violet-500/30 hover:bg-violet-600/30 appearance-none font-sans md:min-w-[120px] min-w-[120px]"
            >
              <option value="message_count">messages</option>
              <option value="cost">cost ($)</option>
              <option value="input_tokens">input tokens</option>
              <option value="output_tokens">output tokens</option>
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
            selectAllText="Select All"
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

      {/* Chart */}
      <div style={{ height: "400px", paddingTop: "60px" }}>
        <ResponsiveLine
          data={chartData}
          theme={theme}
          margin={{ top: 20, right: 10, bottom: 50, left: 40 }}
          xScale={{
            type: "linear",
            min: -0.5,
            max: 24.5,
          }}
          yScale={{
            type: "linear",
            min: -0.1, // Small negative buffer so baseline isn't cut off
            max: 4.3, // Adjusted for new peak scaling
            stacked: false,
            reverse: false,
          }}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            legend: "",
            legendOffset: 36,
            legendPosition: "middle",
            tickValues: [0, 3, 6, 9, 12, 15, 18, 21],
            format: (v) => `${v}:00`,
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 10,
            tickValues: [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0],
            format: (value) => {
              // Convert y position directly to day index
              // Saturday is at 0.0, Friday at 0.5, ... Sunday at 3.0
              const dayIndex = 6 - value / 0.5;
              return DAY_ABBR[Math.round(dayIndex)] ?? "";
            },
          }}
          enableGridX={false}
          enableGridY={true}
          gridYValues={[0, 1, 2, 3, 4, 5, 6]} // horizontal lines between ridges
          colors={["rgba(1, 255, 255, 0.2"]} // Single color for lines
          lineWidth={1}
          curve="basis"
          // Turn off the default area fill; we will do a custom layer.
          enableArea={false}
          enablePoints={false}
          useMesh={true}
          enableCrosshair={false}
          // Hide tooltip by returning empty element
          tooltip={() => null}
          // Custom layers: add our ridgeline fill between the grid/crosshair and the lines
          layers={[
            "grid",
            "markers",
            "axes",
            RidgelineAreaLayer, // <-- custom ridgeline fill
            "lines",
            "points",
            "mesh",
            "legends",
          ]}
          animate={true}
          motionConfig="gentle"
          role="application"
          aria-label={`Ridgeline plot showing avg ${selectedMetric} by hour and day of week`}
        />
      </div>
    </div>
  );
}
