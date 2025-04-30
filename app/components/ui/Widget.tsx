import React from "react";
import GlitchText from "../GlitchText";

interface WidgetProps {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string; // Optional additional class names
}

export default function Widget({
  title,
  description,
  children,
  className,
}: WidgetProps) {
  return (
    <div
      className={`bg-black/30 backdrop-blur-xs p-4 rounded-xs border border-gray-800/40 shadow-md ${
        className || ""
      }`}
    >
      <h3 className="relative text-lg !font-mono mb-1 text-gray-200">
        <GlitchText text={title} className="whitespace-nowrap inline-block" />
      </h3>
      <p className="text-xs font-sans text-[#B08AFF] opacity-70">
        {description}
      </p>
      <div className="widget-content sm:-mt-12 mt-4">{children}</div>
    </div>
  );
}
