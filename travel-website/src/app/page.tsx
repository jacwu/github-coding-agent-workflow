import { Button } from "@/components/ui/Button";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center bg-background px-6 py-24">
      <div className="w-full max-w-lg rounded-3xl bg-card p-10 shadow-sm text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight text-primary">
          Travel Website
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Discover breathtaking destinations, plan your perfect trip, and
          explore the world with ease.
        </p>
        <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-center">
          <Button size="lg">Get Started</Button>
          <Button variant="outline" size="lg">
            Learn More
          </Button>
        </div>
      </div>
    </main>
  );
}
