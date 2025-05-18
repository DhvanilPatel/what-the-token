"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const root = document.documentElement;
    const newTheme = root.classList.contains("dark") ? "light" : "dark";
    root.classList.remove("light", "dark");
    root.classList.add(newTheme);
    try {
      localStorage.setItem("theme", newTheme);
    } catch (e) {}
    setIsDark(newTheme === "dark");
  }

  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      className="!text-xs !tracking-wide text-[#B08AFF] hover:text-[#B08AFF] transition !font-mono border-b border-[#730FFF] border-opacity-20 rounded-xs py-0.5 hover:cursor-pointer"
    >
      {isDark ? "light mode" : "dark mode"}
    </button>
  );
}
