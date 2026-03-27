"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function CreateTripForm() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setPending(true);

    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          start_date: startDate || null,
          end_date: endDate || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Failed to create trip");
        setPending(false);
        return;
      }

      const trip = await response.json();
      router.push(`/trips/${trip.id}`);
    } catch {
      setError("An unexpected error occurred");
      setPending(false);
    }
  }

  if (!isOpen) {
    return (
      <div className="flex justify-center">
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="h-4 w-4" />
          Create New Trip
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg rounded-2xl bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-card-foreground">
        Create a New Trip
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="trip-title" className="mb-1 block text-sm font-medium text-foreground">
            Trip Title <span className="text-destructive">*</span>
          </label>
          <Input
            id="trip-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Southeast Asia 2026"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="trip-start-date" className="mb-1 block text-sm font-medium text-foreground">
              Start Date
            </label>
            <Input
              id="trip-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="trip-end-date" className="mb-1 block text-sm font-medium text-foreground">
              End Date
            </label>
            <Input
              id="trip-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create Trip"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setIsOpen(false);
              setTitle("");
              setStartDate("");
              setEndDate("");
              setError(null);
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
