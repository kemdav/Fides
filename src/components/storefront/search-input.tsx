"use client";

import { useState, type ChangeEvent } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/admin/icon";

export interface SearchInputProps {
  /** Placeholder text shown inside the input. */
  placeholder?: string;
  /** Callback fired on every keystroke with the current value. */
  onChange?: (value: string) => void;
  /** Additional class names for the wrapper. */
  className?: string;
}

function SearchIcon({ className }: { className?: string }) {
  return <Icon name="search" className={className} />;
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
        "flex items-center gap-3 rounded-lg border border-transparent bg-mist px-4 py-3 transition-colors focus-within:border-burnt/50 focus-within:ring-2 focus-within:ring-burnt/20",
        className
      )}
    >
      <SearchIcon className="size-5 shrink-0 text-muted" />
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full bg-transparent text-base text-ink placeholder:text-muted focus:outline-none"
      />
    </div>
  );
}
