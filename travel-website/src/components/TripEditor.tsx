"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  Save,
  Pencil,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { TripDetail, TripStopDetail } from "@/lib/trips";
import type { DestinationOption } from "@/lib/destination-service";

interface TripEditorProps {
  trip: TripDetail;
  destinationOptions: DestinationOption[];
}

export default function TripEditor({ trip, destinationOptions }: TripEditorProps) {
  const router = useRouter();

  // ── Trip metadata state ──────────────────────────────────────────────
  const [title, setTitle] = useState(trip.title);
  const [startDate, setStartDate] = useState(trip.start_date ?? "");
  const [endDate, setEndDate] = useState(trip.end_date ?? "");
  const [status, setStatus] = useState(trip.status);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [metaPending, setMetaPending] = useState(false);

  // ── Delete state ─────────────────────────────────────────────────────
  const [deletePending, setDeletePending] = useState(false);

  // ── Add stop state ───────────────────────────────────────────────────
  const [showAddStop, setShowAddStop] = useState(false);
  const [addDestinationId, setAddDestinationId] = useState("");
  const [addArrivalDate, setAddArrivalDate] = useState("");
  const [addDepartureDate, setAddDepartureDate] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [addStopError, setAddStopError] = useState<string | null>(null);
  const [addStopPending, setAddStopPending] = useState(false);

  // ── Stop editing state ───────────────────────────────────────────────
  const [editingStopId, setEditingStopId] = useState<number | null>(null);
  const [editArrivalDate, setEditArrivalDate] = useState("");
  const [editDepartureDate, setEditDepartureDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editStopError, setEditStopError] = useState<string | null>(null);
  const [editStopPending, setEditStopPending] = useState(false);

  // ── Reorder / delete stop state ──────────────────────────────────────
  const [stopActionPending, setStopActionPending] = useState(false);
  const [stopActionError, setStopActionError] = useState<string | null>(null);

  // ── Handlers ─────────────────────────────────────────────────────────

  async function handleMetaSave(e: React.FormEvent) {
    e.preventDefault();
    setMetaError(null);

    if (!title.trim()) {
      setMetaError("Title is required");
      return;
    }

    setMetaPending(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          start_date: startDate || null,
          end_date: endDate || null,
          status,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setMetaError(data.error ?? "Failed to update trip");
        return;
      }

      router.refresh();
    } catch {
      setMetaError("An unexpected error occurred");
    } finally {
      setMetaPending(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this trip?")) return;

    setDeletePending(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        router.push("/trips");
        return;
      }
      const data = await res.json();
      setMetaError(data.error ?? "Failed to delete trip");
    } catch {
      setMetaError("An unexpected error occurred");
    } finally {
      setDeletePending(false);
    }
  }

  async function handleAddStop(e: React.FormEvent) {
    e.preventDefault();
    setAddStopError(null);

    if (!addDestinationId) {
      setAddStopError("Please select a destination");
      return;
    }

    setAddStopPending(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}/stops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination_id: Number(addDestinationId),
          arrival_date: addArrivalDate || null,
          departure_date: addDepartureDate || null,
          notes: addNotes.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setAddStopError(data.error ?? "Failed to add stop");
        return;
      }

      // Reset form
      setAddDestinationId("");
      setAddArrivalDate("");
      setAddDepartureDate("");
      setAddNotes("");
      setShowAddStop(false);
      router.refresh();
    } catch {
      setAddStopError("An unexpected error occurred");
    } finally {
      setAddStopPending(false);
    }
  }

  function startEditStop(stop: TripStopDetail) {
    setEditingStopId(stop.id);
    setEditArrivalDate(stop.arrival_date ?? "");
    setEditDepartureDate(stop.departure_date ?? "");
    setEditNotes(stop.notes ?? "");
    setEditStopError(null);
  }

  async function handleUpdateStop(stopId: number) {
    setEditStopError(null);
    setEditStopPending(true);

    try {
      const res = await fetch(`/api/trips/${trip.id}/stops/${stopId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          arrival_date: editArrivalDate || null,
          departure_date: editDepartureDate || null,
          notes: editNotes.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setEditStopError(data.error ?? "Failed to update stop");
        return;
      }

      setEditingStopId(null);
      router.refresh();
    } catch {
      setEditStopError("An unexpected error occurred");
    } finally {
      setEditStopPending(false);
    }
  }

  async function handleMoveStopById(stopId: number, direction: "up" | "down") {
    const stops = [...trip.stops].sort((a, b) => a.sort_order - b.sort_order);
    const idx = stops.findIndex((s) => s.id === stopId);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === stops.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;

    // Build the full reordered list
    const reordered = stops.map((s, i) => {
      if (i === idx) return { id: s.id, sort_order: stops[swapIdx].sort_order };
      if (i === swapIdx) return { id: s.id, sort_order: stops[idx].sort_order };
      return { id: s.id, sort_order: s.sort_order };
    });

    setStopActionError(null);
    setStopActionPending(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}/stops`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stops: reordered }),
      });

      if (!res.ok) {
        const data = await res.json();
        setStopActionError(data.error ?? "Failed to reorder stops");
        return;
      }
      router.refresh();
    } catch {
      setStopActionError("An unexpected error occurred");
    } finally {
      setStopActionPending(false);
    }
  }

  async function handleDeleteStop(stopId: number) {
    setStopActionError(null);
    setStopActionPending(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}/stops/${stopId}`, {
        method: "DELETE",
      });
      if (res.ok || res.status === 204) {
        router.refresh();
        return;
      }
      const data = await res.json();
      setStopActionError(data.error ?? "Failed to remove stop");
    } catch {
      setStopActionError("An unexpected error occurred");
    } finally {
      setStopActionPending(false);
    }
  }

  const sortedStops = [...trip.stops].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/trips"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Trips
      </Link>

      {/* Trip metadata form */}
      <div className="rounded-2xl bg-card p-6 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold text-card-foreground">
          Edit Trip
        </h1>

        <form onSubmit={handleMetaSave} className="space-y-4">
          <div>
            <label htmlFor="edit-title" className="mb-1 block text-sm font-medium text-foreground">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="edit-start-date" className="mb-1 block text-sm font-medium text-foreground">
                Start Date
              </label>
              <Input
                id="edit-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="edit-end-date" className="mb-1 block text-sm font-medium text-foreground">
                End Date
              </label>
              <Input
                id="edit-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="edit-status" className="mb-1 block text-sm font-medium text-foreground">
                Status
              </label>
              <select
                id="edit-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="draft">Draft</option>
                <option value="planned">Planned</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {metaError && (
            <p className="text-sm text-destructive">{metaError}</p>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={metaPending}>
              <Save className="h-4 w-4" />
              {metaPending ? "Saving…" : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletePending}
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
              {deletePending ? "Deleting…" : "Delete Trip"}
            </Button>
          </div>
        </form>
      </div>

      {/* Itinerary section */}
      <div className="rounded-2xl bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-card-foreground">
            Itinerary
          </h2>
          {!showAddStop && (
            <Button size="sm" onClick={() => setShowAddStop(true)}>
              <Plus className="h-4 w-4" />
              Add Stop
            </Button>
          )}
        </div>

        {/* Add stop form */}
        {showAddStop && (
          <div className="mb-6 rounded-xl border border-input p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Add a New Stop
            </h3>
            <form onSubmit={handleAddStop} className="space-y-3">
              <div>
                <label htmlFor="add-destination" className="mb-1 block text-sm font-medium text-foreground">
                  Destination <span className="text-destructive">*</span>
                </label>
                <select
                  id="add-destination"
                  value={addDestinationId}
                  onChange={(e) => setAddDestinationId(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select a destination…</option>
                  {destinationOptions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}, {d.country}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="add-arrival" className="mb-1 block text-sm font-medium text-foreground">
                    Arrival
                  </label>
                  <Input
                    id="add-arrival"
                    type="date"
                    value={addArrivalDate}
                    onChange={(e) => setAddArrivalDate(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="add-departure" className="mb-1 block text-sm font-medium text-foreground">
                    Departure
                  </label>
                  <Input
                    id="add-departure"
                    type="date"
                    value={addDepartureDate}
                    onChange={(e) => setAddDepartureDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="add-notes" className="mb-1 block text-sm font-medium text-foreground">
                  Notes
                </label>
                <Input
                  id="add-notes"
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  placeholder="Optional notes…"
                />
              </div>

              {addStopError && (
                <p className="text-sm text-destructive">{addStopError}</p>
              )}

              <div className="flex items-center gap-3">
                <Button type="submit" size="sm" disabled={addStopPending}>
                  {addStopPending ? "Adding…" : "Add Stop"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowAddStop(false);
                    setAddStopError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {stopActionError && (
          <p className="mb-4 text-sm text-destructive">{stopActionError}</p>
        )}

        {/* Stop list */}
        {sortedStops.length > 0 ? (
          <div className="space-y-4">
            {sortedStops.map((stop, index) => (
              <div
                key={stop.id}
                className="rounded-xl border border-input p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {stop.sort_order}
                      </span>
                      <h3 className="font-semibold text-card-foreground">
                        {stop.destination_name}
                      </h3>
                      <span className="text-sm text-muted-foreground">
                        {stop.destination_country}
                      </span>
                    </div>

                    {editingStopId === stop.id ? (
                      <div className="mt-3 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                              Arrival
                            </label>
                            <Input
                              type="date"
                              value={editArrivalDate}
                              onChange={(e) => setEditArrivalDate(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                              Departure
                            </label>
                            <Input
                              type="date"
                              value={editDepartureDate}
                              onChange={(e) => setEditDepartureDate(e.target.value)}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-muted-foreground">
                            Notes
                          </label>
                          <Input
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            placeholder="Optional notes…"
                          />
                        </div>
                        {editStopError && (
                          <p className="text-sm text-destructive">{editStopError}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            disabled={editStopPending}
                            onClick={() => handleUpdateStop(stop.id)}
                          >
                            {editStopPending ? "Saving…" : "Save"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingStopId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {(stop.arrival_date || stop.departure_date) && (
                          <p>
                            {stop.arrival_date && stop.departure_date
                              ? `${stop.arrival_date} → ${stop.departure_date}`
                              : stop.arrival_date
                                ? `Arrives ${stop.arrival_date}`
                                : `Departs ${stop.departure_date}`}
                          </p>
                        )}
                        {stop.notes && <p>{stop.notes}</p>}
                      </div>
                    )}
                  </div>

                  {/* Stop actions */}
                  <div className="flex items-center gap-1">
                    {editingStopId !== stop.id && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEditStop(stop)}
                        title="Edit stop"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={index === 0 || stopActionPending}
                      onClick={() => handleMoveStopById(stop.id, "up")}
                      title="Move up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={
                        index === sortedStops.length - 1 || stopActionPending
                      }
                      onClick={() => handleMoveStopById(stop.id, "down")}
                      title="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={stopActionPending}
                      onClick={() => handleDeleteStop(stop.id)}
                      title="Remove stop"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">
              No stops yet. Add your first destination to start building your itinerary.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
