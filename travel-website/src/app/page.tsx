import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background px-6 py-24">
      <div className="w-full max-w-lg rounded-3xl bg-card p-10 shadow-md transition-shadow hover:shadow-xl">
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-primary">
          Travel Website
        </h1>
        <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
          Discover breathtaking destinations, plan unforgettable trips, and
          explore the world — all in one place.
        </p>
        <Button size="lg">Get Started</Button>
      </div>
    </div>
  );
}
