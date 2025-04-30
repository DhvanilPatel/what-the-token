"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Minus } from "lucide-react";

import { cn } from "@/lib/utils";
import { MODEL_CATEGORIES, compareCategories } from "@/lib/model-utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface MultiSelectOption {
  value: string;
  label: string;
  group?: string; // Optional group property for categorization
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  selectAllText?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select models...",
  emptyText = "<no models found>",
  className,
  selectAllText = "Select All",
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");

  const handleSelect = React.useCallback(
    (value: string) => {
      const updatedSelected = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value];
      onChange(updatedSelected);
    },
    [selected, onChange]
  );

  const handleSelectAll = React.useCallback(() => {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map((option) => option.value));
    }
  }, [selected.length, options, onChange]);

  const selectedLabels = React.useMemo(
    () =>
      selected
        .map((value) => options.find((option) => option.value === value)?.label)
        .filter(Boolean)
        .join(", "),
    [selected, options]
  );

  const isAllSelected =
    options.length > 0 && selected.length === options.length;
  const isIndeterminate =
    selected.length > 0 && selected.length < options.length;

  // Group options by their group property
  const groupedOptions = React.useMemo(() => {
    const groups: Record<string, MultiSelectOption[]> = {};

    // First pass: collect all groups
    options.forEach((option) => {
      // Only include options that match the search query
      if (
        searchValue === "" ||
        option.label.toLowerCase().includes(searchValue.toLowerCase())
      ) {
        const group = option.group || "Other";
        if (!groups[group]) {
          groups[group] = [];
        }
        groups[group].push(option);
      }
    });

    // Remove empty groups
    Object.keys(groups).forEach((key) => {
      if (groups[key].length === 0) {
        delete groups[key];
      }
    });

    return groups;
  }, [options, searchValue]);

  // Get group names in order from MODEL_CATEGORIES
  const groupNames = React.useMemo(() => {
    // Get all groups that have options
    const names = Object.keys(groupedOptions);
    // Sort them according to MODEL_CATEGORIES order
    return names.sort((a, b) => compareCategories(a as any, b as any));
  }, [groupedOptions]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-violet-600/20 text-violet-200 border border-violet-500/30 !pl-2 !pr-1 !py-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 rounded-none font-sans !text-xs !h-7 hover:bg-violet-600/40 focus:border-violet-500/50 font-medium !hover:cursor-pointer",
            className
          )}
        >
          <span className="truncate !text-violet-200">
            {selected.length > 0 ? selectedLabels : placeholder}
          </span>
          <ChevronsUpDown className="ml-1 !h-3 !w-3 shrink-0 opacity-50 text-violet-200" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 popover-content-width-full bg-zinc-900 border border-violet-500/30">
        <Command className="bg-zinc-900">
          <CommandInput
            placeholder="Search options..."
            className="h-7 bg-zinc-900 !text-violet-200 font-sans text-xs"
            onValueChange={setSearchValue}
          />
          <CommandList className="bg-zinc-900 text-violet-200 font-sans max-h-[180px]">
            <CommandEmpty className="!text-violet-200 font-sans text-xs py-2 flex justify-center">
              {emptyText}
            </CommandEmpty>
            <CommandGroup className="bg-zinc-900 font-sans">
              <CommandItem
                key="select-all"
                onSelect={handleSelectAll}
                className="cursor-pointer flex items-center pl-2 py-1 h-6 rounded-none"
              >
                <div
                  className={`flex items-center justify-center w-3 h-3 border border-violet-500/50 flex-shrink-0 relative overflow-hidden ${
                    isAllSelected || isIndeterminate ? "bg-violet-600/30" : ""
                  }`}
                >
                  {isAllSelected ? (
                    <Check className="!h-3 !w-3 text-violet-300 filter drop-shadow-[0_0_2px_rgba(139,92,246,0.8)]" />
                  ) : isIndeterminate ? (
                    <Minus className="!h-3 !w-3 text-violet-300 filter drop-shadow-[0_0_2px_rgba(139,92,246,0.8)]" />
                  ) : null}
                </div>
                <span className="ml-0.5 text-violet-200 text-xs font-sans truncate">
                  {selectAllText}
                </span>
              </CommandItem>
              <CommandSeparator className="border-t border-zinc-800 my-0.5" />

              {/* Render only groups that have items */}
              {groupNames.map((groupName) => (
                <React.Fragment key={groupName}>
                  {/* Only render group if it has options after filtering */}
                  {groupedOptions[groupName] &&
                    groupedOptions[groupName].length > 0 && (
                      <>
                        {/* Group heading */}
                        <div className="px-2 py-1 text-5xs text-violet-400 font-normal uppercase font-mono tracking-wider">
                          {groupName}
                        </div>

                        {/* Options in this group */}
                        {groupedOptions[groupName].map((option) => {
                          const isSelected = selected.includes(option.value);
                          return (
                            <CommandItem
                              key={option.value}
                              value={option.value}
                              onSelect={() => handleSelect(option.value)}
                              className="cursor-pointer flex items-center bg-zinc-900 text-violet-200 hover:bg-violet-600/30 font-sans pl-2 py-1 h-6 text-xs"
                            >
                              <div
                                className={`flex items-center justify-center w-3 h-3 border border-violet-500/50 flex-shrink-0 relative overflow-hidden ${
                                  isSelected ? "bg-violet-600/30" : ""
                                }`}
                              >
                                {isSelected && (
                                  <Check className="!h-3 !w-3 text-violet-300 filter drop-shadow-[0_0_2px_rgba(139,92,246,0.8)]" />
                                )}
                              </div>
                              <span className="ml-0.5 font-sans truncate w-full">
                                {option.label}
                              </span>
                            </CommandItem>
                          );
                        })}

                        {/* Add separator between groups */}
                        {groupName !== groupNames[groupNames.length - 1] && (
                          <CommandSeparator className="border-t !border-zinc-800 my-0.5" />
                        )}
                      </>
                    )}
                </React.Fragment>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
