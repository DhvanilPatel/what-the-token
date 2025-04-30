import React, { useState, useRef, useCallback } from "react";
import {
  Loader2,
  UploadCloud,
  AlertTriangle,
  CheckCircle,
  Lock,
  Database,
} from "lucide-react";
import GlitchText from "../GlitchText";

type FileUploadProps = {
  onFileSelect: (files: FileList) => void;
  isProcessing: boolean;
  status: string;
  errorMsg: string;
};

export default function FileUpload({
  onFileSelect,
  isProcessing,
  status,
  errorMsg,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract progress percentage from status string if available
  const progressMatch = status.match(/\((\d+)%\)/);
  const progressPercentage = progressMatch ? parseInt(progressMatch[1], 10) : 0;

  // Extract filename from status if available
  const filenameMatch = status.match(/Reading file: (.*?) \(/);
  const filename = filenameMatch ? filenameMatch[1] : "";

  // Determine the current stage of processing
  const isReading = status.includes("Reading");
  const isParsing = status.includes("Parsing");
  const isTokenizing = status.includes("Tokenizing");
  const isDone = status.includes("Done");

  // Get processed filename from "Done! Processed: filename" format
  const processedFilename =
    isDone && status.includes("Processed:")
      ? status.split("Processed:")[1].trim()
      : "";

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFileSelect(e.dataTransfer.files);
      }
    },
    [onFileSelect]
  );

  const handleClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onFileSelect(e.target.files);
      }
    },
    [onFileSelect]
  );

  return (
    <div className="space-y-4 sm:max-w-7/12 w-full">
      <div
        className={`group relative px-6 pt-8 pb-12 transition-colors backdrop-blur-xs ${
          isDragging
            ? "bg-violet-700/10 border border-violet-500/40 cursor-pointer"
            : isProcessing
            ? "bg-black/30 border border-gray-800/40"
            : "bg-black/30 border border-violet-900/60 hover:bg-black/40 cursor-pointer"
        }`}
        onDragOver={!isProcessing ? handleDragOver : undefined}
        onDragLeave={!isProcessing ? handleDragLeave : undefined}
        onDrop={!isProcessing ? handleDrop : undefined}
        onClick={!isProcessing ? handleClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleChange}
          className="hidden"
          disabled={isProcessing}
        />

        {!isProcessing ? (
          /* Initial upload prompt */
          <div className="flex flex-col text-left space-y-2 w-full">
            <div className="flex items-start space-x-3 w-full">
              <Database className="w-5 h-5 mt-1 text-violet-300/40" />
              <div className="w-full">
                <h3 className="text-base !font-mono text-violet-100 flex flex-col sm:flex-row sm:items-center items-start space-x-2 w-full justify-between">
                  <GlitchText
                    text="select file"
                    className="whitespace-nowrap inline-block"
                  />
                  <p className="text-2xs bg-amber-900/60 px-2 rounded-xs text-amber-100 flex flex-row items-center space-x-2 font-sans h-5 sm:my-0 my-2">
                    <Lock className="w-2.5 h-2.5 mr-1 text-amber-300" /> 100%
                    on‑device processing
                  </p>
                </h3>

                <p className="text-xs mt-2 font-sans text-[#B08AFF]/70">
                  click to select or drag and drop{" "}
                  <code className="text-[#E6DBFF] text-2xs bg-[#B08AFF]/20 px-1 rounded-xs !font-mono">
                    conversations.json
                  </code>{" "}
                  file.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Processing state with progress bars */
          <div className="flex flex-col text-left space-y-5">
            <div className="flex sm:items-center items-start space-x-3 w-full">
              <Loader2 className="w-5 h-5 text-violet-800/80 animate-spin" />
              <div className="w-full flex flex-row justify-between items-center">
                <h3 className="text-base !font-mono text-violet-100 flex flex-col sm:flex-row sm:items-center items-start space-x-2 w-full justify-between">
                  <GlitchText text="Processing" />
                  <p className="text-2xs bg-amber-900/60 px-2 rounded-xs text-amber-100 flex flex-row items-center space-x-2 font-sans h-5 sm:my-0 my-2">
                    <Lock className="w-2.5 h-2.5 mr-1 text-amber-300" /> 100%
                    on‑device processing
                  </p>
                </h3>
              </div>
            </div>

            {/* Multi-stage progress bars */}
            <div className="w-full space-y-1 pl-9">
              {/* File Reading Stage */}
              <div className="flex items-center">
                <div className="text-2xs mt-px !font-mono text-[#B08AFF] opacity-70 mr-0.5">
                  reading file
                </div>
                <div className="flex-1 h-0.5 bg-violet-800/20 rounded-full overflow-hidden ml-2 max-w-[80px]">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isReading
                        ? "bg-violet-600"
                        : isParsing || isTokenizing || isDone
                        ? "bg-violet-600"
                        : "bg-gray-700/50"
                    }`}
                    style={{
                      width: isReading
                        ? `${progressPercentage}%`
                        : isParsing || isTokenizing || isDone
                        ? "100%"
                        : "0%",
                    }}
                  ></div>
                </div>
              </div>

              {/* JSON Parsing Stage */}
              <div className="flex items-center">
                <div className="text-2xs mt-px !font-mono text-[#B08AFF] opacity-70 mr-0.5">
                  json parsing
                </div>
                <div className="flex-1 h-0.5 bg-violet-800/20 rounded-full overflow-hidden ml-2 max-w-[80px]">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isParsing
                        ? "bg-violet-600"
                        : isTokenizing || isDone
                        ? "bg-violet-600"
                        : "bg-gray-700/50"
                    }`}
                    style={{
                      width: isParsing
                        ? "60%"
                        : isTokenizing || isDone
                        ? "100%"
                        : "0%",
                    }}
                  ></div>
                </div>
              </div>

              {/* Tokenizing Stage */}
              <div className="flex items-center">
                <div className="text-2xs mt-px !font-mono text-[#B08AFF] opacity-70 mr-0.5">
                  tokenizing&nbsp;&nbsp;
                </div>
                <div className="flex-1 h-0.5 bg-violet-800/20 rounded-full overflow-hidden ml-2 max-w-[80px]">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isTokenizing
                        ? "bg-violet-600"
                        : isDone
                        ? "bg-violet-600"
                        : "bg-gray-700/50"
                    }`}
                    style={{
                      width: isTokenizing ? "70%" : isDone ? "100%" : "0%",
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error message display */}
      {errorMsg && (
        <div className="mt-2 bg-red-900/20 border border-red-800/40 text-red-400 p-3 rounded-xs text-sm">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Error</p>
              <p>{errorMsg}</p>
              <p className="mt-1 text-xs text-[#B08AFF] opacity-50">
                Try a different file or check if your JSON export file is valid.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
