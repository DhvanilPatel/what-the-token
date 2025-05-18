"use client";

import React, { useState, useCallback } from "react";
import { processConversations, Aggregator } from "@/lib/calculator";
import { readFileWithProgress, validateOpenAIExport } from "@/lib/fileUtils";
import GlitchBackground from "./components/GlitchBackground";
import GlitchText from "./components/GlitchText";
import CalendarHeatmap from "./components/charts/CalendarHeatmap";
import StreamChart from "./components/charts/StreamChart";
import ModelUsageBarChart from "./components/charts/ModelUsageBarChart";
import DayOfWeekDistribution from "./components/charts/DayOfWeekDistribution";
import Widget from "./components/ui/Widget";
import CumulativeTreemap from "./components/charts/CumulativeTreemap";

import AggregatorSummaryTable from "./components/charts/AggregatorTable";
// Import the ShaderGradient components
import { ShaderGradientCanvas, ShaderGradient } from "@shadergradient/react";
import SummaryStats from "./components/ui/SummaryStats";
import FileUpload from "./components/ui/FileUpload";
import Link from "next/link";
import {
  GitHubLink,
  HowItWorksDialog,
  ViewTestPageButton,
} from "./components/ui/InfoDialogs";
import ThemeToggle from "./components/ui/ThemeToggle";
import { AlertTriangle } from "lucide-react";

// Mark this page as client-side only rendering
export const dynamic = "force-dynamic";

// File size limit in MB
const FILE_SIZE_LIMIT = 200;

export default function HomePage() {
  const [status, setStatus] = useState<string>("");
  const [results, setResults] = useState<Aggregator | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [readProgress, setReadProgress] = useState<number>(0);

  async function handleFile(files: FileList) {
    // Reset state
    setErrorMsg("");
    setResults(null);
    setReadProgress(0);

    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file type
    if (!file.name.endsWith(".json")) {
      setErrorMsg("Please upload a JSON file. Only .json files are supported.");
      return;
    }

    // Validate file size
    if (file.size > FILE_SIZE_LIMIT * 1024 * 1024) {
      setErrorMsg(`File is too large. Maximum size is ${FILE_SIZE_LIMIT}MB.`);
      return;
    }

    setIsProcessing(true);
    setStatus(`Reading file: ${file.name} (0%)`);

    try {
      // Use our utility function to read the file with progress tracking
      const text = await readFileWithProgress(file, (progress) => {
        setReadProgress(progress);
        setStatus(`Reading file: ${file.name} (${progress}%)`);
      });

      // Validate JSON format
      try {
        setStatus("Parsing JSON...");
        const data = JSON.parse(text); // big in-memory parse

        // Validate OpenAI export format
        const validationError = validateOpenAIExport(data);
        if (validationError) {
          throw new Error(validationError);
        }

        setStatus("Tokenizing & aggregating usage...");
        // Process data using the new function, which returns the Aggregator
        const usageAggregator = await processConversations(data);

        setResults(usageAggregator);
        setStatus(`Done! Processed: ${file.name}`);
      } catch (parseError: any) {
        throw new Error(`Invalid JSON format: ${parseError.message}`);
      }
    } catch (err: any) {
      console.error("Error parsing or processing file:", err);
      setErrorMsg(
        err.message || "Unknown error occurred while processing file"
      );
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="overflow-x-hidden w-full">
      <GlitchBackground imageUrls={["/images/bg-1.png", "/images/bg-2.png"]} />
      <div className="text-white p-4 md:p-8 relative z-10">
        {/* Flex container for title and gradient */}
        <div className="flex items-center gap-4 mb-4">
          {/* Add whitespace-nowrap to prevent title wrapping */}
          <h1 className="sm:text-5xl text-2xl !font-mono font-normal tracking-wide flex-shrink-0 whitespace-nowrap">
            <GlitchText
              text="what—the—t0ken"
              targetChar="0"
              replacementChars={["o", "*", "#"]}
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
          <ThemeToggle />
          <ViewTestPageButton />
          <GitHubLink />
          <HowItWorksDialog />
        </div>

        <div className="font-sans font-light pl-2 text-xs flex flex-col space-y-1 mb-6 hidden sm:block">
          <p className="flex flex-row items-center space-x-2">
            <span className="text-3xs bg-violet-900/40 px-1 rounded-xs text-violet-400/60 !font-mono mr-1.5">
              1
            </span>{" "}
            add{" "}
            <code className="text-[#E6DBFF] text-2xs bg-[#B08AFF]/20 px-1 rounded-xs !font-mono mx-1">
              conversations.json
            </code>{" "}
            file — find at{" "}
            <code className="text-[#E6DBFF] text-2xs bg-[#B08AFF]/20 px-1 rounded-xs !font-mono mx-1">
              chatgpt → settings → data controls → export
            </code>
          </p>
          <p className="flex flex-row items-center space-x-2">
            <span className="text-3xs bg-violet-900/40 px-1 rounded-xs text-violet-400/60 !font-mono mr-1.5">
              2
            </span>{" "}
            instant, local data crunching — no data leaves your browser
          </p>
          <p className="flex flex-row items-center space-x-2">
            <span className="text-3xs bg-violet-900/40 px-1 rounded-xs text-violet-400/60 !font-mono mr-1.5">
              3
            </span>{" "}
            explore your dashboard — heat‑maps, stream graphs, cost breakdowns
          </p>
        </div>

        <div className="font-sans font-light pl-2 text-xs flex flex-col space-y-2 mb-6 block sm:hidden">
          <p className="flex flex-row items-center space-x-2">
            <span className="text-3xs bg-violet-900/40 px-1 rounded-xs text-violet-400/60 !font-mono mr-1.5">
              1
            </span>{" "}
            add{" "}
            <code className="text-[#E6DBFF] text-2xs bg-[#B08AFF]/20 px-1 rounded-xs !font-mono mx-1">
              conversations.json
            </code>{" "}
            file from ChatGPT
          </p>
          <p className="flex flex-row items-center space-x-2">
            <span className="text-3xs bg-violet-900/40 px-1 rounded-xs text-violet-400/60 !font-mono mr-1.5">
              2
            </span>{" "}
            instant, local browser-only data crunching
          </p>
          <p className="flex flex-row items-center space-x-2">
            <span className="text-3xs bg-violet-900/40 px-1 rounded-xs text-violet-400/60 !font-mono mr-1.5">
              3
            </span>{" "}
            explore your dashboard!
          </p>
        </div>

        {/* Replace basic input with new FileUpload component */}
        {!results && !errorMsg && (
          <FileUpload
            onFileSelect={handleFile}
            isProcessing={isProcessing}
            status={status}
            errorMsg={errorMsg}
          />
        )}

        {/* Display error message *outside* the FileUpload component if processing fails */}
        {errorMsg && !isProcessing && (
          <div className="mt-4 bg-red-900/20 border border-red-800/40 text-red-400 p-3 rounded-xs text-sm max-w-7/12">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Error processing file:</p>
                <p>{errorMsg}</p>
                <button
                  onClick={() => {
                    setErrorMsg(""); // Clear the error to potentially allow re-upload
                    setResults(null);
                    setStatus("");
                  }}
                  className="mt-2 text-xs text-blue-400 hover:underline"
                >
                  Try uploading again?
                </button>
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
