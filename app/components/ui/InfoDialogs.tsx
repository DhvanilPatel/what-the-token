"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Link from "next/link";
import GlitchText from "../GlitchText";
import { cn } from "@/lib/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";

// Custom styled dialog content to match Widget styling
function CustomDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      className={cn(
        "bg-black/100 backdrop-blur-xs rounded-xs border border-gray-800/40 shadow-md",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 p-6 duration-200 sm:max-w-lg",
        className
      )}
      {...props}
    >
      {children}
    </DialogContent>
  );
}

// Custom styled dialog header with Widget styling
function CustomDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <DialogHeader
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

// Custom styled dialog title with Widget styling and GlitchText
function CustomDialogTitle({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  return (
    <DialogTitle
      className={cn("text-lg !font-mono text-gray-200", className)}
      {...props}
    >
      {typeof children === "string" ? (
        <GlitchText
          text={children}
          className="whitespace-nowrap inline-block"
        />
      ) : (
        children
      )}
    </DialogTitle>
  );
}

// Custom styled dialog description with Widget styling
function CustomDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  return (
    <DialogDescription
      className={cn("text-xs font-sans text-[#B08AFF] opacity-70", className)}
      {...props}
    />
  );
}

export function GitHubLink() {
  return (
    <Link
      href="https://github.com/dhvanil-crestdata/what-the-token"
      target="_blank"
      rel="noopener noreferrer"
      className="!text-xs !tracking-wide text-[#B08AFF] hover:text-[#B08AFF] transition !font-mono border-b border-[#730FFF] border-opacity-20 rounded-xs py-0.5 hover:cursor-pointer"
    >
      github
    </Link>
  );
}

export function ViewTestPageButton() {
  return (
    <Link
      href="/test"
      className="!text-xs !tracking-wide text-[#B08AFF] hover:text-[#B08AFF] transition !font-mono border-b border-[#730FFF] border-opacity-20 rounded-xs py-0.5 hover:cursor-pointer"
    >
      example
    </Link>
  );
}

export function ViewHomePageButton() {
  return (
    <Link
      href="/"
      className="!text-xs !tracking-wide text-[#B08AFF] hover:text-[#B08AFF] transition !font-mono border-b border-[#730FFF] border-opacity-20 rounded-xs py-0.5 hover:cursor-pointer"
    >
      ← back
    </Link>
  );
}

export function HowItWorksDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="!text-xs !tracking-wide text-[#B08AFF] hover:text-[#B08AFF] transition !font-mono border-b border-[#730FFF] border-opacity-20 rounded-xs py-0.5 hover:cursor-pointer">
          how it works?
        </button>
      </DialogTrigger>
      <CustomDialogContent className="p-0 overflow-hidden">
        <div
          className="max-h-[80vh] overflow-y-auto px-6 py-6
          [&::-webkit-scrollbar]:w-1.5 
          [&::-webkit-scrollbar-track]:bg-black/30 
          [&::-webkit-scrollbar-track]:rounded-full
          [&::-webkit-scrollbar-thumb]:rounded-full 
          [&::-webkit-scrollbar-thumb]:bg-[#730FFF]/60
          [&::-webkit-scrollbar-thumb]:border-[2px] 
          [&::-webkit-scrollbar-thumb]:border-transparent
          [&::-webkit-scrollbar-thumb]:bg-clip-padding
          [&::-webkit-scrollbar-thumb]:shadow-[0_0_8px_3px_rgba(115,15,255,0.4)]
          [&::-webkit-scrollbar-thumb:hover]:bg-[#B08AFF]/70
          scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#730FFF]/60
          hover:scrollbar-thumb-[#B08AFF]/70"
        >
          <CustomDialogHeader>
            <CustomDialogTitle className="font-mono font-medium">
              tech rundown
            </CustomDialogTitle>
            <CustomDialogDescription className="!text-xs -mt-1">
              for the curious: line‑item audit of what happens where.
            </CustomDialogDescription>
          </CustomDialogHeader>

          {/* Deep Dive Section */}
          <div className="mt-6 pt-4 pr-2">
            <div className="space-y-7 text-xs font-sans text-gray-400 pb-2 leading-normal">
              <div>
                <h3 className="font-semibold text-gray-300 mb-2">
                  <GlitchText
                    text="how secure is my data?"
                    className="whitespace-nowrap !font-mono font-medium"
                  />
                </h3>
                <div className="list-disc text-violet-100/90 space-y-1.5 font-sans font-light text-2xs">
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>your data is processed entirely in your browser.</p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      it's never saved permanently or stored anywhere long-term.
                      all processing happens in volatile memory.
                    </p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      once you close the browser tab, all traces of your data
                      are gone from system memory.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-300 mb-2">
                  <GlitchText
                    text="are you sure?"
                    className="whitespace-nowrap !font-mono font-medium"
                  />
                </h3>
                <div className="list-disc text-violet-100/90 space-y-1.5 font-sans font-light text-2xs">
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      the entire source code is public on{" "}
                      <Link
                        href="https://github.com/dhvanil-crestdata/what-the-token"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-400 hover:text-violet-300 transition  border-b border-[#730FFF]/50 rounded-xs hover:cursor-pointer"
                      >
                        github
                      </Link>
                      .
                    </p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      no cookies, tracking scripts, or analytics are used. the
                      app's dependencies are pinned via{" "}
                      <Link
                        href="https://github.com/dhvanil-crestdata/what-the-token"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-400 hover:text-violet-300 transition  border-b border-[#730FFF]/50 rounded-xs hover:cursor-pointer"
                      >
                        lockfile
                      </Link>
                      .
                    </p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      verify it yourself: open browser devtools (f12) and check
                      the network tab. observe zero data transmission after the
                      initial page load.
                    </p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      for maximum assurance: clone the repo, run it locally
                      (using{" "}
                      <code className="text-violet-100/90 text-3xs bg-[#B08AFF]/20 px-1 rounded-xs !font-mono mx-0.5">
                        pnpm i && pnpm dev
                      </code>
                      ), and disconnect your network connection. the app remains
                      fully functional.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-300 mb-2">
                  <GlitchText
                    text="where does the site live?"
                    className="whitespace-nowrap !font-mono font-medium"
                  />
                </h3>
                <div className="list-disc text-violet-100/90 space-y-1.5 font-sans font-light text-2xs">
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      the application is a static{" "}
                      <code className="text-violet-100/90 text-3xs bg-[#B08AFF]/20 px-1 rounded-xs !font-mono mx-0.5">
                        next.js 15.2.4
                      </code>{" "}
                      bundle, compiled using the{" "}
                      <code className="text-violet-100/90 text-3xs bg-[#B08AFF]/20 px-1 rounded-xs !font-mono mx-0.5">
                        opennext
                      </code>{" "}
                      adapter for cloudflare compatibility.
                    </p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>it's deployed as a single cloudflare worker.</p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      assets are served directly from cloudflare's edge cache,
                      minimizing latency.
                    </p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>there's no backend or database involved.</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-300 mb-2">
                  <GlitchText
                    text="how is the json handled?"
                    className="whitespace-nowrap !font-mono font-medium"
                  />
                </h3>
                <div className="list-disc text-violet-100/90 space-y-1.5 font-sans font-light text-2xs">
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      your{" "}
                      <code className="text-violet-100/90 text-3xs bg-[#B08AFF]/20 px-1 rounded-xs !font-mono mx-0.5">
                        conversations.json
                      </code>{" "}
                      file is read directly into the browser's memory using the
                      standard file api.
                    </p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      large files are processed in 2mb chunks via readable
                      streams to avoid blocking the main ui thread and manage
                      memory usage.
                    </p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      no file data is ever uploaded or transmitted off your
                      device.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-300 mb-2">
                  <GlitchText
                    text="how are tokens calculated?"
                    className="whitespace-nowrap !font-mono font-medium"
                  />
                </h3>
                <div className="list-disc text-violet-100/90 space-y-1.5 font-sans font-light text-2xs">
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      a dedicated web worker handles tokenization using a
                      wasm-compiled version of{" "}
                      <code className="text-violet-100/90 text-3xs bg-[#B08AFF]/20 px-1 rounded-xs !font-mono mx-0.5">
                        js-tiktoken
                      </code>
                      .
                    </p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      token counts are calculated off the main thread and sent
                      back asynchronously via{" "}
                      <code className="text-violet-100/90 text-3xs bg-[#B08AFF]/20 px-1 rounded-xs !font-mono mx-0.5">
                        postmessage
                      </code>{" "}
                      to keep the ui responsive.
                    </p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      a simple heuristic (
                      <code className="text-violet-100/90 text-3xs bg-[#B08AFF]/20 px-1 rounded-xs !font-mono mx-0.5">
                        text.length / 4
                      </code>
                      ) serves as a fallback if wasm initialization fails.
                    </p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      input tokens for each assistant message are calculated
                      based on the cumulative context of prior messages in that
                      conversation turn.
                    </p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      the complete token counting algorithm can be found in the{" "}
                      <Link
                        href="https://github.com/dhvanil-crestdata/what-the-token/blob/main/lib/calculator.ts"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-400 hover:text-violet-300 transition border-b border-[#730FFF]/50 rounded-xs hover:cursor-pointer"
                      >
                        calculator.ts
                      </Link>{" "}
                      file.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-300 mb-2">
                  <GlitchText
                    text="how are image tokens estimated?"
                    className="whitespace-nowrap !font-mono font-medium"
                  />
                </h3>
                <div className="list-disc text-violet-100/90 space-y-1.5 font-sans font-light text-2xs">
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      image token counts follow openai's documented formula: a
                      base cost of 85 tokens per image.
                    </p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      for high-resolution images, an additional 170 tokens are
                      added for each 512x512 tile required to represent the
                      image.
                    </p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      images exceeding 2048 pixels in either dimension are
                      treated as scaled down to fit within that limit before
                      tile calculation, per the model's handling.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-300 mb-2">
                  <GlitchText
                    text="how is cost calculated?"
                    className="whitespace-nowrap !font-mono font-medium"
                  />
                </h3>
                <div className="list-disc text-violet-100/90 space-y-1.5 font-sans font-light text-2xs">
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      costs are derived from a static mapping (
                      <code className="text-violet-100/90 text-3xs bg-[#B08AFF]/20 px-1 rounded-xs !font-mono mx-0.5">
                        model_costs
                      </code>
                      ) containing known usd per million token rates for both
                      input and output.
                    </p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      the calculation does not currently factor in potential
                      discounts for cached tokens, as this information isn't
                      available in the export.
                    </p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      model slugs encountered in the data but not present in the
                      cost table are assigned a zero cost to prevent errors,
                      though their token counts are still tracked.
                    </p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      the complete cost calculation implementation can be found
                      in the{" "}
                      <Link
                        href="https://github.com/dhvanil-crestdata/what-the-token/blob/main/lib/calculator.ts"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-400 hover:text-violet-300 transition border-b border-[#730FFF]/50 rounded-xs hover:cursor-pointer"
                      >
                        calculator.ts
                      </Link>{" "}
                      file.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-300 mb-2">
                  <GlitchText
                    text="what data isn't captured?"
                    className="whitespace-nowrap !font-mono font-medium"
                  />
                </h3>
                <div className="list-disc text-violet-100/90 space-y-1.5 font-sans font-light text-2xs">
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      internal chain-of-thought or reasoning steps are not
                      present in the exported data, so they cannot be counted.
                      only explicitly visible message parts are included.
                    </p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      system prompts, function/tool calls, and other server-side
                      context injections are sometimes absent from the standard
                      chat export format.
                    </p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      non-textual assets like pdf, csv uploads, etc. are skipped
                      during analysis.
                    </p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      deep research calculations are significantly
                      underestimated, as the export don't include reasoning
                      tokens.{" "}
                      <code className="text-violet-100/90 text-3xs bg-[#B08AFF]/20 px-1 rounded-xs !font-mono mx-0.5">
                        o3-mini-high
                      </code>{" "}
                      is used for the price calculations for deep research.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-300 mb-2">
                  <GlitchText
                    text="what powers the ui?"
                    className="whitespace-nowrap !font-mono font-medium"
                  />
                </h3>
                <div className="list-disc text-violet-100/90 space-y-1.5 font-sans font-light text-2xs">
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      charts are rendered using the{" "}
                      <Link
                        href="https://nivo.rocks/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-400 hover:text-violet-300 transition border-b border-[#730FFF]/50 rounded-xs hover:cursor-pointer"
                      >
                        nivo library
                      </Link>
                      .
                    </p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      the glitch animation is inspired by{" "}
                      <Link
                        href="https://ykob.github.io/sketch-threejs/sketch/glitch.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-400 hover:text-violet-300 transition border-b border-[#730FFF]/50 rounded-xs hover:cursor-pointer"
                      >
                        ykob's three.js sketch
                      </Link>
                      .
                    </p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>styling is handled by tailwind css.</p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      the "export png" feature uses the{" "}
                      <code className="text-violet-100/90 text-3xs bg-[#B08AFF]/20 px-1 rounded-xs !font-mono mx-0.5">
                        html-to-image
                      </code>{" "}
                      library for client-side rendering; no data leaves the
                      browser during export.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-300 mb-2">
                  <GlitchText
                    text="what's the performance like?"
                    className="whitespace-nowrap !font-mono font-medium"
                  />
                </h3>
                <div className="list-disc text-violet-100/90 space-y-1.5 font-sans font-light text-2xs">
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      cloudflare worker cold starts are typically negligible
                      (sub 50ms).
                    </p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      tokenizing a 100mb export file generally completes within
                      a few seconds on modern hardware (e.g., apple silicon
                      macs).
                    </p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      the main ui thread remains interactive during processing
                      due to the use of web workers and chunked streaming.
                    </p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      the initial tokenization run might incur a brief delay (up
                      to ~20s) while the browser downloads and initializes the
                      wasm module for the first time.
                    </p>
                  </div>
                </div>
              </div>

              {/* Disclaimer Section */}
              <div>
                <h3 className="font-semibold text-gray-300 mb-2">
                  <GlitchText
                    text="final notes..."
                    className="whitespace-nowrap !font-mono font-medium"
                  />
                </h3>
                <div className="list-disc text-violet-100/90 space-y-1.5 font-sans font-light text-2xs">
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      token counts and cost estimates are best-effort based on
                      available data.
                    </p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      consider these figures as useful approximations for
                      understanding usage patterns rather than exact numbers.
                    </p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      made by{" "}
                      <Link
                        href="https://dhvanil.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-400 hover:text-violet-300 transition border-b border-[#730FFF]/50 rounded-xs hover:cursor-pointer"
                      >
                        dhvanil
                      </Link>
                      .
                    </p>
                  </div>
                  <div className="flex flex-row items-start space-x-1">
                    <p className="text-violet-600/60 mt-px font-light font-mono text-3xs">
                      →
                    </p>
                    <p>
                      for any feedback, questions, bugs, or suggestions — please
                      add an issue on{" "}
                      <Link
                        href="https://github.com/dhvanil-crestdata/what-the-token/issues"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-400 hover:text-violet-300 transition border-b border-[#730FFF]/50 rounded-xs hover:cursor-pointer"
                      >
                        github
                      </Link>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CustomDialogContent>
    </Dialog>
  );
}
