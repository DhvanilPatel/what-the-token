"use client";

import React, { useState, useEffect } from "react";
import { Aggregator } from "@/lib/calculator";
import GlitchBackground from "@/app/components/GlitchBackground";
import GlitchText from "@/app/components/GlitchText";
import CalendarHeatmap from "@/app/components/charts/CalendarHeatmap";
import StreamChart from "@/app/components/charts/StreamChart";
import ModelUsageBarChart from "@/app/components/charts/ModelUsageBarChart";
import DayOfWeekDistribution from "@/app/components/charts/DayOfWeekDistribution";
import Widget from "@/app/components/ui/Widget";
import CumulativeTreemap from "@/app/components/charts/CumulativeTreemap";
import AggregatorSummaryTable from "@/app/components/charts/AggregatorTable";
import SummaryStats from "@/app/components/ui/SummaryStats";
import { ShaderGradientCanvas, ShaderGradient } from "@shadergradient/react";
import Link from "next/link";
import {
  GitHubLink,
  HowItWorksDialog,
  ViewHomePageButton,
} from "@/app/components/ui/InfoDialogs";
import { AlertTriangle } from "lucide-react";

// Mark this page as client-side only rendering
export const dynamic = "force-dynamic";

export default function TestPage() {
  const [status, setStatus] = useState<string>("");
  const [results, setResults] = useState<Aggregator | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Load data from public/aggregate.json if it exists (for development)
  useEffect(() => {
    const loadDevData = async () => {
      try {
        const response = await fetch("/aggregate.json");
        if (response.ok) {
          const loadedData: Aggregator = await response.json();

          // Recalculate missing summary fields
          const dayKeys = Object.keys(loadedData.usageByDay);
          if (dayKeys.length > 0) {
            dayKeys.sort(); // Ensure chronological order
            loadedData.startDate = dayKeys[0];
            loadedData.endDate = dayKeys[dayKeys.length - 1];

            let totalCost = 0;
            const modelSlugs = new Set<string>();
            Object.values(loadedData.usageByDay).forEach((dayBucket) => {
              totalCost += dayBucket.total.cost;
              Object.keys(dayBucket.models).forEach((slug) =>
                modelSlugs.add(slug)
              );
            });
            loadedData.totalCostAllModels = totalCost;
            // Convert Set back to something JSON-serializable if needed, but fine for state
            // For the state, we need a real Set for the AggregatorSummary component
            loadedData.allModelSlugs = modelSlugs;
          } else {
            // Handle case where usageByDay is empty
            loadedData.startDate = undefined;
            loadedData.endDate = undefined;
            loadedData.totalCostAllModels = 0;
            loadedData.allModelSlugs = new Set<string>();
          }

          setResults(loadedData); // Set the enhanced data
          setStatus("Loaded data from public/aggregate.json (test mode)");
          console.log("Loaded and enhanced test data:", loadedData);
        } else {
          setErrorMsg("/aggregate.json not found or fetch failed");
          console.log("/aggregate.json not found or fetch failed");
        }
      } catch (error) {
        console.error("Error fetching /aggregate.json:", error);
        setErrorMsg("Error fetching test data");
      }
    };

    loadDevData();
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <div className="overflow-x-hidden w-full">
      <GlitchBackground imageUrls={["/images/bg-1.png", "/images/bg-2.png"]} />
      <div className="text-white p-4 md:p-8 relative z-10">
        {/* Flex container for title and gradient */}
        <div className="flex items-center gap-4 mb-4">
          {/* Add whitespace-nowrap to prevent title wrapping */}
          <h1 className="sm:text-5xl text-2xl !font-mono font-normal tracking-wide flex-shrink-0 whitespace-nowrap">
            <GlitchText
              text="{sample_data}"
              targetChar="t"
              replacementChars={["+", "t", "_"]}
            />
          </h1>

          {/* Shader Gradient Canvas */}
          <div className="relative w-20 h-16 sm:w-[120px] sm:h-24 rounded overflow-hidden">
            {/* Transparent overlay to block interactions */}
            <div className="absolute inset-0 z-10 cursor-default"></div>

            <ShaderGradientCanvas
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                zIndex: 0,
              }}
            >
              <ShaderGradient
                control="props"
                cDistance={20}
                cPolarAngle={150}
                cameraZoom={1}
                color1="#0077ff" // Electric Blue
                color2="#00f0ff" // Bright Cyan
                color3="#7b68ee" // Medium Slate Blue
                type="plane"
                uDensity={1.3}
                uFrequency={5.5}
                uSpeed={0.8}
              />
            </ShaderGradientCanvas>
          </div>
        </div>

        {/* Dialog buttons */}
        <div className="flex space-x-6 mb-6 pl-2 -mt-2">
          <ViewHomePageButton />
          <GitHubLink />
          <HowItWorksDialog />
        </div>

        {/* <div className="font-sans font-light pl-2 text-xs flex flex-col space-y-1 mb-6 hidden sm:block">
          <p className="flex flex-row items-center space-x-2">
            <span className="text-[#E6DBFF] text-2xs bg-[#B08AFF]/20 px-1 rounded-xs !font-mono mx-1">
              Example page
            </span>{" "}
            - Automatically loading sample data from /aggregate.json
          </p>
        </div> */}

        {/* Display error message if present */}
        {errorMsg && (
          <div className="mt-4 bg-red-900/20 border border-red-800/40 text-red-400 p-3 rounded-xs text-sm max-w-7/12">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Error loading test data:</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {results && Object.keys(results.usageByDay).length > 0 && (
          <div className="mt-8 space-y-6">
            {/* Grid for Charts - Single Vertical Column */}
            <div className="space-y-6 flex flex-col">
              {/* Wrap SummaryStats in a Widget */}
              <div className="w-full md:w-8/12">
                <Widget
                  title="usage vitals"
                  description="quick numbers — cost, tokens, models"
                >
                  <SummaryStats data={results} />
                </Widget>
              </div>

              {/* Overall Summary Widget */}
              <div className="w-full md:w-8/12">
                <Widget
                  title="token ledger"
                  description="tabular summary — tokens, costs, interactions"
                >
                  <AggregatorSummaryTable aggregator={results} />
                </Widget>
              </div>

              {/* Calendar Heatmap */}
              <div className="w-full md:w-8/12">
                <Widget
                  title="calendar glowmap"
                  description="heatmap — daily usage intensity"
                >
                  <CalendarHeatmap aggregator={results} />
                </Widget>
              </div>

              {/* Stream Chart (Monthly) */}
              <div className="w-full md:w-8/12">
                <Widget
                  title="timeline stream"
                  description="stacked timeline — interactions over weeks"
                >
                  <StreamChart aggregator={results} />
                </Widget>
              </div>

              {/* Cumulative Treemap */}
              <div className="w-full md:w-8/12">
                <Widget
                  title="model footprint"
                  description="treemap — cumulative token distribution"
                >
                  <CumulativeTreemap aggregator={results} />
                </Widget>
              </div>

              {/* New Bar Chart (Monthly) */}
              <div className="w-full md:w-8/12">
                <Widget
                  title="usage strata"
                  description="stacked bar chart — weekly model comparison"
                >
                  <ModelUsageBarChart aggregator={results} />
                </Widget>
              </div>

              {/* Day of Week Avg Activity (Ridgeline) */}
              <div className="w-full md:w-8/12">
                <Widget
                  title="circadian ridge"
                  description="hourly ridgeline chart — peak usage times"
                >
                  <DayOfWeekDistribution aggregator={results} />
                </Widget>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
