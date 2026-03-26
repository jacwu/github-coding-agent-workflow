import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { parseListParams, isValidationError } from "@/lib/destinations";
import { getDestinations } from "@/lib/destination-service";
import DestinationCard from "@/components/DestinationCard";
import DestinationFilters from "@/components/DestinationFilters";
import { Button } from "@/components/ui/Button";

export default async function DestinationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;

  // Convert Record to URLSearchParams (take first element if array)
  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(rawParams)) {
    const v = Array.isArray(value) ? value[0] : value;
    if (v !== undefined) {
      urlParams.set(key, v);
    }
  }

  const params = parseListParams(urlParams);
  const hasError = isValidationError(params);

  const result = hasError
    ? { data: [], total: 0, page: 1, limit: 12 }
    : getDestinations(params);

  const totalPages = Math.ceil(result.total / result.limit);
  const currentPage = result.page;

  // Build pagination URL helper
  function pageUrl(page: number): string {
    const p = new URLSearchParams(urlParams.toString());
    if (page > 1) {
      p.set("page", String(page));
    } else {
      p.delete("page");
    }
    const query = p.toString();
    return query ? `/destinations?${query}` : "/destinations";
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Explore Destinations
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Discover breathtaking places around the world
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <Suspense fallback={null}>
            <DestinationFilters />
          </Suspense>
        </div>

        {/* Error hint */}
        {hasError && (
          <div className="mb-6 rounded-2xl bg-destructive/10 p-4 text-center text-sm text-destructive">
            Invalid filter parameters. Please adjust your filters and try again.
          </div>
        )}

        {/* Results summary */}
        {!hasError && (
          <p className="mb-6 text-sm text-muted-foreground">
            {result.total} destination{result.total !== 1 ? "s" : ""} found
          </p>
        )}

        {/* Card grid */}
        {result.data.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.data.map((destination) => (
              <DestinationCard key={destination.id} destination={destination} />
            ))}
          </div>
        ) : (
          !hasError && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-lg font-medium text-muted-foreground">
                No destinations match your filters
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try adjusting your search or clearing the filters
              </p>
              <Button variant="outline" className="mt-6" asChild>
                <Link href="/destinations">Clear all filters</Link>
              </Button>
            </div>
          )
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav className="mt-12 flex items-center justify-center gap-4">
            {currentPage > 1 ? (
              <Button variant="outline" asChild>
                <Link href={pageUrl(currentPage - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Link>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
            )}

            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>

            {currentPage < totalPages ? (
              <Button variant="outline" asChild>
                <Link href={pageUrl(currentPage + 1)}>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </nav>
        )}
      </div>
    </main>
  );
}
