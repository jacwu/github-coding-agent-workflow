import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About | Travel Website",
  description:
    "Learn about our mission to make travel discovery and trip planning simple, inspiring, and organized.",
};

export default function AboutPage() {
  return (
    <main className="flex-1">
      {/* Hero / Introduction */}
      <section className="bg-muted/50 py-20 px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            About Travel Website
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Inspiring journeys, one destination at a time.
          </p>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground">
            Travel Website is a platform built to help you discover amazing
            destinations around the world and plan your trips with confidence.
            Whether you&apos;re dreaming of tropical beaches, towering
            mountains, vibrant cities, or peaceful countryside retreats, we
            bring it all together in one place.
          </p>
        </div>
      </section>

      {/* Brand Story */}
      <section className="py-16 px-4">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-semibold text-foreground">Our Story</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            We started Travel Website because we believe travel planning should
            feel exciting — not overwhelming. Too often, discovering new places
            and organizing trips means juggling dozens of tabs, scattered notes,
            and endless research. We set out to change that by building a single
            platform where inspiration meets organization.
          </p>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Our mission is to make travel discovery and planning approachable
            for everyone. From curated destination guides to flexible trip
            itineraries, every feature is designed to help you travel with
            clarity and confidence.
          </p>
        </div>
      </section>

      {/* Platform Value Pillars */}
      <section className="bg-muted/50 py-16 px-4">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-semibold text-foreground text-center">
            What We Offer
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl bg-background p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-foreground">
                Discover Destinations
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Browse curated destinations across beaches, mountains, cities,
                and countryside. Filter by region, category, price, and season
                to find the perfect spot for your next adventure.
              </p>
            </div>
            <div className="rounded-2xl bg-background p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-foreground">
                Plan Your Trips
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Create structured trip itineraries by selecting destinations,
                setting dates, and organizing stops. Keep all your travel plans
                in one convenient place.
              </p>
            </div>
            <div className="rounded-2xl bg-background p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-foreground">
                Travel with Confidence
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                With ratings, seasonal recommendations, and detailed destination
                information, you can make informed decisions and enjoy every
                journey with peace of mind.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-semibold text-foreground">
            Ready to Explore?
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Start browsing destinations and plan your next trip today.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/destinations"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Browse Destinations
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-xl border border-input px-6 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Create an Account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
