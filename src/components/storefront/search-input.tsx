"use client";

import { useState, type ChangeEvent } from "react";
import { cn } from "@/lib/utils";

export interface SearchInputProps {
  /** Placeholder text shown inside the input. */
  placeholder?: string;
  /** Callback fired on every keystroke with the current value. */
  onChange?: (value: string) => void;
  /** Additional class names for the wrapper. */
  className?: string;
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <circle cx="9" cy="9" r="6.5" />
      <path d="M14 14l4 4" />
    </svg>
  );
}

export function SearchInput({
  placeholder = "Search Services",
  onChange,
  className,
}: SearchInputProps) {
  const [value, setValue] = useState("");

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value);
    onChange?.(e.target.value);
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-transparent bg-mist px-3 py-2.5 transition-colors focus-within:border-burnt/50 focus-within:ring-2 focus-within:ring-burnt/20",
        className
      )}
    >
      <SearchIcon className="size-5 shrink-0 text-muted" />
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
      />
    </div>
  );
}
