"use client";

import { ChevronDown, Search } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type SearchableSelectOption<T = number | string> = {
  value: T;
  label: string;
  subtitle?: string;
  /** Optional text used for search when searchable (e.g. Arabic name). */
  searchText?: string;
};

type Props<T extends number | string> = {
  options: SearchableSelectOption<T>[];
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  placeholder?: string;
  label?: string;
  id?: string;
  "aria-label"?: string;
  renderOption?: (option: SearchableSelectOption<T>, selected: boolean) => ReactNode;
  /** When true, show a search input and filter options by query. */
  searchable?: boolean;
  searchPlaceholder?: string;
};

const baseInputClasses =
  "w-full rounded-2xl border border-white/10 bg-surface-muted/80 px-4 py-3 text-base text-foreground outline-none transition-[border-color,box-shadow] focus:border-brand focus:ring-2 focus:ring-brand/20";

function filterOptionsByQuery<T>(
  options: SearchableSelectOption<T>[],
  query: string,
): SearchableSelectOption<T>[] {
  if (!query.trim()) return options;
  const q = query.trim().toLowerCase();
  return options.filter((o) => {
    const main = `${o.label} ${o.subtitle ?? ""}`.toLowerCase();
    const extra = (o.searchText ?? "").toLowerCase();
    return main.includes(q) || extra.includes(q);
  });
}

export function SearchableSelect<T extends number | string>({
  options,
  value,
  onChange,
  placeholder = "Select…",
  label,
  id,
  "aria-label": ariaLabel,
  renderOption,
  searchable = false,
  searchPlaceholder = "Search…",
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState("");
  const [listPosition, setListPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = useMemo(
    () => (searchable ? filterOptionsByQuery(options, searchQuery) : options),
    [options, searchQuery, searchable],
  );

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  const close = useCallback(() => {
    setOpen(false);
    setHighlightIndex(-1);
    setSearchQuery("");
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inTrigger = containerRef.current?.contains(target);
      const inDropdown =
        dropdownContainerRef.current?.contains(target);
      if (!inTrigger && !inDropdown) close();
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape as unknown as EventListener);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape as unknown as EventListener);
    };
  }, [open, close]);

  // Position dropdown via portal so it isn't clipped by overflow
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      const id = requestAnimationFrame(() => setListPosition(null));
      return () => cancelAnimationFrame(id);
    }
    const rect = buttonRef.current.getBoundingClientRect();
    const gap = 8;
    const pos = {
      top: rect.bottom + gap,
      left: rect.left,
      width: rect.width,
    };
    const id = requestAnimationFrame(() => setListPosition(pos));
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Update position on scroll/resize while open
  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const update = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setListPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  // Focus search input only when search icon is clicked
  const handleSearchIconClick = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  // Keep highlightIndex in sync when filtered list or search changes
  useEffect(() => {
    if (!open) return;
    const currentValueIndex =
      value === undefined
        ? -1
        : filteredOptions.findIndex((o) => o.value === value);
    const next = currentValueIndex >= 0 ? currentValueIndex + 1 : 0;
    const id = requestAnimationFrame(() => setHighlightIndex(next));
    return () => cancelAnimationFrame(id);
  }, [open, searchQuery, value, filteredOptions]);

  useEffect(() => {
    if (!open || highlightIndex < 0) return;
    const el = listRef.current?.children[highlightIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [open, highlightIndex]);

  const itemCount = 1 + filteredOptions.length; // placeholder + options

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
        const idx =
          value === undefined
            ? 0
            : Math.max(0, filteredOptions.findIndex((o) => o.value === value) + 1);
        setHighlightIndex(idx >= 0 ? idx : 0);
      }
      return;
    }
    // Type-ahead search when searchable
    if (searchable && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (e.key === "Backspace") {
        e.preventDefault();
        setSearchQuery((q) => q.slice(0, -1));
        return;
      }
      if (e.key.length === 1 && e.key !== "Enter" && e.key !== "Escape" && e.key !== "Tab") {
        e.preventDefault();
        setSearchQuery((q) => q + e.key);
        return;
      }
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i < itemCount - 1 ? i + 1 : i));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i > 0 ? i - 1 : 0));
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      if (highlightIndex === 0) {
        onChange(undefined);
      } else if (filteredOptions[highlightIndex - 1]) {
        onChange(filteredOptions[highlightIndex - 1].value);
      }
      close();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label
          htmlFor={id}
          className="mb-2 block text-sm font-medium text-foreground-muted"
        >
          {label}
        </label>
      )}
      <button
        ref={buttonRef}
        type="button"
        id={id}
        aria-label={ariaLabel ?? label}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-labelledby={id}
        className={`${baseInputClasses} flex min-h-[3rem] items-center justify-between gap-2 text-left`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
      >
        <span className={value === undefined ? "text-foreground-muted" : ""}>
          {displayLabel}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-foreground-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open &&
        listPosition &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownContainerRef}
            className="fixed z-[9999] flex max-h-[min(20rem,70vh)] w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface-raised shadow-xl shadow-black/20 ring-1 ring-white/5"
            style={{
              top: listPosition.top,
              left: listPosition.left,
              width: listPosition.width,
              minWidth: listPosition.width,
            }}
          >
            {searchable && (
              <div className="shrink-0 border-b border-white/10 px-1 py-1">
                <div className="flex min-h-14 items-center gap-3 rounded-xl border border-brand/20 bg-surface-muted/80 px-3 py-2">
                  <Search 
                    className="h-6 w-6 shrink-0 cursor-pointer text-foreground-muted transition-colors hover:text-foreground" 
                    aria-hidden
                    onClick={handleSearchIconClick}
                    tabIndex={0}
                    role="button"
                    aria-label="Focus search input"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSearchIconClick();
                      }
                    }}
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setHighlightIndex((i) =>
                          i < itemCount - 1 ? i + 1 : i,
                        );
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setHighlightIndex((i) => (i > 0 ? i - 1 : 0));
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        if (highlightIndex === 0) {
                          onChange(undefined);
                        } else if (filteredOptions[highlightIndex - 1]) {
                          onChange(filteredOptions[highlightIndex - 1].value);
                        }
                        close();
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        close();
                      }
                    }}
                    placeholder={searchPlaceholder}
                    className="searchable-select-search-input min-h-[2.5rem] w-full flex-1 bg-transparent pl-2 text-base text-foreground outline-none placeholder:text-foreground-muted placeholder:text-xs sm:placeholder:text-base focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                    aria-label={searchPlaceholder}
                    autoComplete="off"
                  />
                </div>
              </div>
            )}
            <ul
              ref={listRef}
              role="listbox"
              aria-activedescendant={
                highlightIndex >= 0
                  ? `searchable-select-option-${highlightIndex}`
                  : undefined
              }
              className="min-h-0 overflow-auto py-2"
            >
              <li
                role="option"
                id="searchable-select-option-0"
                aria-selected={value === undefined}
                className={`cursor-pointer border-l-2 border-transparent px-4 py-3 text-sm transition-colors ${value === undefined ? "border-brand bg-brand/15 text-foreground" : "text-foreground hover:bg-surface-highlight/80"}`}
                onClick={() => {
                  onChange(undefined);
                  close();
                }}
                onMouseEnter={() => setHighlightIndex(0)}
              >
                {placeholder}
              </li>
              {filteredOptions.map((option, index) => {
                const selected = option.value === value;
                const isHighlighted = highlightIndex === index + 1;
                return (
                  <li
                    key={String(option.value)}
                    role="option"
                    id={`searchable-select-option-${index + 1}`}
                    aria-selected={selected}
                    className={`cursor-pointer border-l-2 px-4 py-3 text-sm transition-colors ${selected ? "border-brand bg-brand/15 text-foreground" : "border-transparent"} ${isHighlighted ? "bg-surface-highlight/80" : "hover:bg-surface-highlight/80"}`}
                    onClick={() => {
                      onChange(option.value);
                      close();
                    }}
                    onMouseEnter={() => setHighlightIndex(index + 1)}
                  >
                    {renderOption ? (
                      renderOption(option, selected)
                    ) : (
                      <span className="block">{option.label}</span>
                    )}
                    {option.subtitle && (
                      <span className="mt-0.5 block text-xs text-foreground-muted">
                        {option.subtitle}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            {searchable && filteredOptions.length === 0 && searchQuery.trim() && (
              <p className="shrink-0 px-4 py-3 text-center text-sm text-foreground-muted">
                No matches for &quot;{searchQuery.trim()}&quot;
              </p>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
