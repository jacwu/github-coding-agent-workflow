"use client";

import { useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const REGIONS = ["Asia", "Europe", "North America", "South America", "Africa", "Oceania"] as const;
const CATEGORIES = ["beach", "mountain", "city", "countryside"] as const;
const SORT_OPTIONS = [
  { value: "rating", label: "Rating" },
  { value: "price", label: "Price" },
  { value: "popularity", label: "Popularity" },
] as const;
const PRICE_LEVELS = [1, 2, 3, 4, 5] as const;

export default function DestinationFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentQ = searchParams.get("q") ?? "";
  const currentRegion = searchParams.get("region") ?? "";
  const currentCategory = searchParams.get("category") ?? "";
  const currentPriceMin = searchParams.get("price_min") ?? "";
  const currentPriceMax = searchParams.get("price_max") ?? "";
  const currentSort = searchParams.get("sort") ?? "";

  const buildUrl = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());

      // Apply updates
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }

      // Reset page to 1 when filters change (unless page itself is being changed)
      if (!("page" in updates)) {
        params.delete("page");
      }

      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [searchParams, pathname],
  );

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const q = (formData.get("q") as string) ?? "";
    router.push(buildUrl({ q }));
  };

  const handleSelectChange = (key: string, value: string) => {
    router.push(buildUrl({ [key]: value }));
  };

  const handlePriceChange = (key: "price_min" | "price_max", value: string) => {
    const updates: Record<string, string> = { [key]: value };

    if (value) {
      const newLevel = Number(value);
      if (key === "price_min" && currentPriceMax && newLevel > Number(currentPriceMax)) {
        updates["price_max"] = "";
      } else if (key === "price_max" && currentPriceMin && newLevel < Number(currentPriceMin)) {
        updates["price_min"] = "";
      }
    }

    router.push(buildUrl(updates));
  };

  const handleReset = () => {
    router.push("/destinations");
  };

  return (
    <div className="glass rounded-3xl p-6">
      <form onSubmit={handleSearchSubmit} className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label htmlFor="search-input" className="mb-2 inline-block">
            Search destinations
          </Label>
          <Input
            id="search-input"
            name="q"
            type="search"
            placeholder="Search destinations..."
            defaultValue={currentQ}
            className="rounded-xl"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="region-select">Region</Label>
          <select
            id="region-select"
            value={currentRegion}
            onChange={(e) => handleSelectChange("region", e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">All Regions</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="category-select">Category</Label>
          <select
            id="category-select"
            value={currentCategory}
            onChange={(e) => handleSelectChange("category", e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm capitalize"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="price-min-select">Min Price</Label>
          <select
            id="price-min-select"
            value={currentPriceMin}
            onChange={(e) => handlePriceChange("price_min", e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Any</option>
            {PRICE_LEVELS.map((p) => (
              <option key={p} value={String(p)}>
                {"$".repeat(p)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="price-max-select">Max Price</Label>
          <select
            id="price-max-select"
            value={currentPriceMax}
            onChange={(e) => handlePriceChange("price_max", e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Any</option>
            {PRICE_LEVELS.map((p) => (
              <option key={p} value={String(p)}>
                {"$".repeat(p)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="sort-select">Sort by</Label>
          <select
            id="sort-select"
            value={currentSort}
            onChange={(e) => handleSelectChange("sort", e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Default</option>
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={handleReset}
            className="h-8 rounded-lg px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
