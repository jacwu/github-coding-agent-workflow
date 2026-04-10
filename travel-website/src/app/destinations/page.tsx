import { Suspense } from "react";
import Link from "next/link";

import { listDestinations } from "@/lib/destination-service";
import { parseDestinationSearchParams } from "@/lib/destination-query-params";
import DestinationCard from "@/components/DestinationCard";
import DestinationFilters from "@/components/DestinationFilters";

interface DestinationsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DestinationsPage({
  searchParams,
}: DestinationsPageProps) {
  const resolvedSearchParams = await searchParams;
  const { params } = parseDestinationSearchParams(resolvedSearchParams);
  const result = await listDestinations(params);

  const totalPages = Math.max(1, Math.ceil(result.total / result.limit));
  const currentPage = result.page;

  function buildPageUrl(page: number): string {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.region) sp.set("region", params.region);
    if (params.category) sp.set("category", params.category);
    if (params.priceMin !== undefined) sp.set("price_min", String(params.priceMin));
    if (params.priceMax !== undefined) sp.set("price_max", String(params.priceMax));
    if (params.sort) sp.set("sort", params.sort);
    if (page > 1) sp.set("page", String(page));
    const qs = sp.toString();
    return qs ? `/destinations?${qs}` : "/destinations";
  }

  return (
    <main className="flex-1">
      {/* Hero / intro band */}
      <section className="bg-muted/50 px-4 py-16 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Discover Destinations
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Explore breathtaking places around the world. Find your next
            adventure from our curated collection of {result.total}{" "}
            {result.total === 1 ? "destination" : "destinations"}.
          </p>
        </div>
      </section>

      {/* Filter surface */}
      <section className="mx-auto max-w-7xl px-4 -mt-8">
        <Suspense fallback={null}>
          <DestinationFilters />
        </Suspense>
      </section>

      {/* Result grid */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        {result.data.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {result.data.map((destination) => (
                <DestinationCard key={destination.id} {...destination} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <nav
                className="mt-12 flex items-center justify-center gap-4"
                aria-label="Pagination"
              >
                {currentPage > 1 ? (
                  <Link
                    href={buildPageUrl(currentPage - 1)}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    ← Previous
                  </Link>
                ) : (
                  <span className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground cursor-not-allowed">
                    ← Previous
                  </span>
                )}

                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>

                {currentPage < totalPages ? (
                  <Link
                    href={buildPageUrl(currentPage + 1)}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Next →
                  </Link>
                ) : (
                  <span className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground cursor-not-allowed">
                    Next →
                  </span>
                )}
              </nav>
            )}
          </>
        ) : (
          <div className="py-16 text-center">
            <p className="text-lg text-muted-foreground">
              No destinations found matching your criteria.
            </p>
            <Link
              href="/destinations"
              className="mt-4 inline-block rounded-xl bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Reset Filters
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
