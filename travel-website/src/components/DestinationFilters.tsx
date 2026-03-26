"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const REGIONS = [
  "Asia",
  "Europe",
  "North America",
  "South America",
  "Africa",
  "Oceania",
] as const;

const CATEGORIES = ["beach", "mountain", "city", "countryside"] as const;

const SORT_OPTIONS = [
  { value: "", label: "Default" },
  { value: "rating", label: "Rating (High → Low)" },
  { value: "price_asc", label: "Price (Low → High)" },
  { value: "price_desc", label: "Price (High → Low)" },
  { value: "popularity", label: "Popularity" },
] as const;

const PRICE_LEVELS = [1, 2, 3, 4, 5] as const;

export default function DestinationFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentQ = useMemo(() => searchParams.get("q") ?? "", [searchParams]);
  const [keyword, setKeyword] = useState(currentQ);

  useEffect(() => {
    setKeyword(currentQ);
  }, [currentQ]);

  const updateParams = useCallback(
    (updates: Record<string, string>, usePush = false) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }

      // Reset page to 1 when filters change (unless it's a pagination change)
      if (!("page" in updates)) {
        params.delete("page");
      }

      const query = params.toString();
      const url = query ? `${pathname}?${query}` : pathname;

      if (usePush) {
        router.push(url);
      } else {
        router.replace(url);
      }
    },
    [router, pathname, searchParams],
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ q: keyword.trim() });
  };

  const hasActiveFilters =
    searchParams.has("q") ||
    searchParams.has("region") ||
    searchParams.has("category") ||
    searchParams.has("sort") ||
    searchParams.has("price_min") ||
    searchParams.has("price_max");

  const clearFilters = () => {
    setKeyword("");
    router.replace(pathname);
  };

  const selectClasses =
    "h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <div className="rounded-2xl bg-card p-5 shadow-sm space-y-4">
      {/* Keyword search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search destinations..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit" size="default">
          Search
        </Button>
      </form>

      {/* Filter row */}
      <div className="flex flex-wrap gap-3">
        <select
          value={searchParams.get("region") ?? ""}
          onChange={(e) => updateParams({ region: e.target.value })}
          className={selectClasses}
          aria-label="Region"
        >
          <option value="">All Regions</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <select
          value={searchParams.get("category") ?? ""}
          onChange={(e) => updateParams({ category: e.target.value })}
          className={selectClasses}
          aria-label="Category"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c} className="capitalize">
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>

        <select
          value={searchParams.get("sort") ?? ""}
          onChange={(e) => updateParams({ sort: e.target.value })}
          className={selectClasses}
          aria-label="Sort by"
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          value={searchParams.get("price_min") ?? ""}
          onChange={(e) => updateParams({ price_min: e.target.value })}
          className={selectClasses}
          aria-label="Min price"
        >
          <option value="">Min Price</option>
          {PRICE_LEVELS.map((p) => (
            <option key={p} value={String(p)}>
              {"$".repeat(p)}
            </option>
          ))}
        </select>

        <select
          value={searchParams.get("price_max") ?? ""}
          onChange={(e) => updateParams({ price_max: e.target.value })}
          className={selectClasses}
          aria-label="Max price"
        >
          <option value="">Max Price</option>
          {PRICE_LEVELS.map((p) => (
            <option key={p} value={String(p)}>
              {"$".repeat(p)}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <Button variant="ghost" size="default" onClick={clearFilters}>
            <X className="h-4 w-4" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
