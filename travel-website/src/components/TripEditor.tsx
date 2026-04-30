"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StopDestination {
  id: number;
  name: string;
  country: string;
  category: string;
  image: string;
}

interface TripStop {
  id: number;
  destination_id: number;
  sort_order: number;
  arrival_date: string | null;
  departure_date: string | null;
  notes: string | null;
  destination: StopDestination;
}

interface TripDetail {
  id: number;
  title: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  stops: TripStop[];
}

interface DestinationOption {
  id: number;
  name: string;
  country: string;
  category?: string;
}

interface TripEditorProps {
  initialTrip: TripDetail;
  destinationOptions: DestinationOption[];
}

const STATUS_OPTIONS = ["draft", "planned", "completed"] as const;

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  planned: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
};

export default function TripEditor({
  initialTrip,
  destinationOptions,
}: TripEditorProps) {
  const router = useRouter();
  const [trip, setTrip] = useState<TripDetail>(initialTrip);

  // Trip edit fields
  const [editTitle, setEditTitle] = useState(trip.title);
  const [editStartDate, setEditStartDate] = useState(trip.start_date ?? "");
  const [editEndDate, setEditEndDate] = useState(trip.end_date ?? "");
  const [editStatus, setEditStatus] = useState(trip.status);
  const [tripError, setTripError] = useState("");
  const [tripSaving, setTripSaving] = useState(false);

  // Add stop fields
  const [addDestId, setAddDestId] = useState("");
  const [addArrival, setAddArrival] = useState("");
  const [addDeparture, setAddDeparture] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [addError, setAddError] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  // Stop editing
  const [editingStopId, setEditingStopId] = useState<number | null>(null);
  const [editStopArrival, setEditStopArrival] = useState("");
  const [editStopDeparture, setEditStopDeparture] = useState("");
  const [editStopNotes, setEditStopNotes] = useState("");
  const [stopError, setStopError] = useState("");
  const [stopSaving, setStopSaving] = useState(false);

  // Reorder / delete state
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  // ---------- Trip update ----------
  async function handleTripUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTripError("");
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      setTripError("Title is required");
      return;
    }
    if (editStartDate && editEndDate && editStartDate > editEndDate) {
      setTripError("Start date must not be after end date");
      return;
    }
    setTripSaving(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          start_date: editStartDate || null,
          end_date: editEndDate || null,
          status: editStatus,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setTripError(data?.error ?? "Failed to update trip");
        return;
      }
      const updated = await res.json();
      setTrip(updated);
      router.refresh();
    } catch {
      setTripError("Something went wrong. Please try again.");
    } finally {
      setTripSaving(false);
    }
  }

  // ---------- Add stop ----------
  async function handleAddStop(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddError("");
    const destId = Number(addDestId);
    if (!destId || destId < 1) {
      setAddError("Please select a destination");
      return;
    }
    if (addArrival && addDeparture && addArrival > addDeparture) {
      setAddError("Arrival date must not be after departure date");
      return;
    }
    setAddSaving(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}/stops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination_id: destId,
          arrival_date: addArrival || null,
          departure_date: addDeparture || null,
          notes: addNotes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setAddError(data?.error ?? "Failed to add stop");
        return;
      }
      const updated = await res.json();
      setTrip(updated);
      setAddDestId("");
      setAddArrival("");
      setAddDeparture("");
      setAddNotes("");
      router.refresh();
    } catch {
      setAddError("Something went wrong. Please try again.");
    } finally {
      setAddSaving(false);
    }
  }

  // ---------- Reorder ----------
  async function handleMove(stopId: number, direction: "up" | "down") {
    setActionError("");
    const stops = [...trip.stops];
    const idx = stops.findIndex((s) => s.id === stopId);
    if (idx === -1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= stops.length) return;

    [stops[idx], stops[swapIdx]] = [stops[swapIdx], stops[idx]];
    const reorderPayload = stops.map((s, i) => ({
      id: s.id,
      sort_order: i + 1,
    }));

    setActionLoading(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}/stops`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stops: reorderPayload }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setActionError(data?.error ?? "Failed to reorder stops");
        return;
      }
      const updated = await res.json();
      setTrip(updated);
      router.refresh();
    } catch {
      setActionError("Something went wrong. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  // ---------- Delete stop ----------
  async function handleDeleteStop(stopId: number) {
    setActionError("");
    setActionLoading(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}/stops/${stopId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setActionError(data?.error ?? "Failed to delete stop");
        return;
      }
      const updated = await res.json();
      setTrip(updated);
      if (editingStopId === stopId) {
        setEditingStopId(null);
      }
      router.refresh();
    } catch {
      setActionError("Something went wrong. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  // ---------- Edit stop ----------
  function startEditStop(stop: TripStop) {
    setEditingStopId(stop.id);
    setEditStopArrival(stop.arrival_date ?? "");
    setEditStopDeparture(stop.departure_date ?? "");
    setEditStopNotes(stop.notes ?? "");
    setStopError("");
  }

  async function handleStopUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (editingStopId === null) return;
    setStopError("");

    if (editStopArrival && editStopDeparture && editStopArrival > editStopDeparture) {
      setStopError("Arrival date must not be after departure date");
      return;
    }

    setStopSaving(true);
    try {
      const res = await fetch(
        `/api/trips/${trip.id}/stops/${editingStopId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            arrival_date: editStopArrival || null,
            departure_date: editStopDeparture || null,
            notes: editStopNotes || null,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setStopError(data?.error ?? "Failed to update stop");
        return;
      }
      const updated = await res.json();
      setTrip(updated);
      setEditingStopId(null);
      router.refresh();
    } catch {
      setStopError("Something went wrong. Please try again.");
    } finally {
      setStopSaving(false);
    }
  }

  const statusClass =
    STATUS_STYLES[trip.status] ?? "bg-gray-100 text-gray-800";

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Link
          href="/trips"
          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          ← Back to My Trips
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {trip.title}
          </h1>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusClass}`}
          >
            {trip.status}
          </span>
        </div>
        {(trip.start_date || trip.end_date) && (
          <p className="text-sm text-muted-foreground">
            {trip.start_date ?? "—"} → {trip.end_date ?? "—"}
          </p>
        )}
      </div>

      {/* Trip details form */}
      <form
        onSubmit={handleTripUpdate}
        className="rounded-2xl bg-card shadow-sm p-6 flex flex-col gap-4"
      >
        <h2 className="text-lg font-semibold text-foreground">Trip Details</h2>

        {tripError && (
          <p className="text-sm text-destructive" role="alert">
            {tripError}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-title">Title</Label>
          <Input
            id="edit-title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            disabled={tripSaving}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-start-date">Start date</Label>
            <Input
              id="edit-start-date"
              type="date"
              value={editStartDate}
              onChange={(e) => setEditStartDate(e.target.value)}
              disabled={tripSaving}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-end-date">End date</Label>
            <Input
              id="edit-end-date"
              type="date"
              value={editEndDate}
              onChange={(e) => setEditEndDate(e.target.value)}
              disabled={tripSaving}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-status">Status</Label>
            <select
              id="edit-status"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              disabled={tripSaving}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button type="submit" disabled={tripSaving} className="self-start">
          {tripSaving ? "Saving…" : "Save Changes"}
        </Button>
      </form>

      {/* Add stop form */}
      <form
        onSubmit={handleAddStop}
        className="rounded-2xl bg-card shadow-sm p-6 flex flex-col gap-4"
      >
        <h2 className="text-lg font-semibold text-foreground">Add a Stop</h2>

        {addError && (
          <p className="text-sm text-destructive" role="alert">
            {addError}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="add-destination">Destination</Label>
          <select
            id="add-destination"
            value={addDestId}
            onChange={(e) => setAddDestId(e.target.value)}
            disabled={addSaving}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none"
          >
            <option value="">Select a destination…</option>
            {destinationOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — {d.country}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="add-arrival">Arrival date</Label>
            <Input
              id="add-arrival"
              type="date"
              value={addArrival}
              onChange={(e) => setAddArrival(e.target.value)}
              disabled={addSaving}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="add-departure">Departure date</Label>
            <Input
              id="add-departure"
              type="date"
              value={addDeparture}
              onChange={(e) => setAddDeparture(e.target.value)}
              disabled={addSaving}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="add-notes">Notes</Label>
          <Input
            id="add-notes"
            value={addNotes}
            onChange={(e) => setAddNotes(e.target.value)}
            placeholder="Optional notes for this stop"
            disabled={addSaving}
          />
        </div>

        <Button type="submit" disabled={addSaving} className="self-start">
          {addSaving ? "Adding…" : "Add Stop"}
        </Button>
      </form>

      {/* Stop list */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-foreground">
          Itinerary ({trip.stops.length}{" "}
          {trip.stops.length === 1 ? "stop" : "stops"})
        </h2>

        {actionError && (
          <p className="text-sm text-destructive" role="alert">
            {actionError}
          </p>
        )}

        {trip.stops.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No stops yet. Add your first destination above!
          </p>
        ) : (
          <ol className="flex flex-col gap-4">
            {trip.stops.map((stop, index) => (
              <li
                key={stop.id}
                className="rounded-2xl bg-card shadow-sm overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Destination image */}
                  <div className="relative h-32 w-full sm:h-auto sm:w-40 shrink-0">
                    <Image
                      src={stop.destination.image}
                      alt={`${stop.destination.name}, ${stop.destination.country}`}
                      fill
                      sizes="(max-width: 640px) 100vw, 160px"
                      className="object-cover"
                    />
                  </div>

                  {/* Stop content */}
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">
                          Stop {stop.sort_order}
                        </span>
                        <h3 className="text-base font-semibold text-foreground">
                          {stop.destination.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {stop.destination.country} ·{" "}
                          <span className="capitalize">
                            {stop.destination.category}
                          </span>
                        </p>
                      </div>

                      {/* Move buttons */}
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleMove(stop.id, "up")}
                          disabled={index === 0 || actionLoading}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
                          aria-label={`Move ${stop.destination.name} up`}
                        >
                          ↑ Up
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(stop.id, "down")}
                          disabled={
                            index === trip.stops.length - 1 || actionLoading
                          }
                          className="rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
                          aria-label={`Move ${stop.destination.name} down`}
                        >
                          ↓ Down
                        </button>
                      </div>
                    </div>

                    {(stop.arrival_date || stop.departure_date) && (
                      <p className="text-sm text-muted-foreground">
                        {stop.arrival_date ?? "—"} →{" "}
                        {stop.departure_date ?? "—"}
                      </p>
                    )}

                    {stop.notes && (
                      <p className="text-sm text-muted-foreground italic">
                        {stop.notes}
                      </p>
                    )}

                    {/* Stop edit form (inline) */}
                    {editingStopId === stop.id ? (
                      <form
                        onSubmit={handleStopUpdate}
                        className="mt-2 flex flex-col gap-3 rounded-xl bg-muted/50 p-3"
                      >
                        {stopError && (
                          <p
                            className="text-sm text-destructive"
                            role="alert"
                          >
                            {stopError}
                          </p>
                        )}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="flex flex-col gap-1">
                            <Label htmlFor={`stop-arrival-${stop.id}`}>
                              Arrival
                            </Label>
                            <Input
                              id={`stop-arrival-${stop.id}`}
                              type="date"
                              value={editStopArrival}
                              onChange={(e) =>
                                setEditStopArrival(e.target.value)
                              }
                              disabled={stopSaving}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label htmlFor={`stop-departure-${stop.id}`}>
                              Departure
                            </Label>
                            <Input
                              id={`stop-departure-${stop.id}`}
                              type="date"
                              value={editStopDeparture}
                              onChange={(e) =>
                                setEditStopDeparture(e.target.value)
                              }
                              disabled={stopSaving}
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label htmlFor={`stop-notes-${stop.id}`}>
                            Notes
                          </Label>
                          <Input
                            id={`stop-notes-${stop.id}`}
                            value={editStopNotes}
                            onChange={(e) => setEditStopNotes(e.target.value)}
                            placeholder="Notes"
                            disabled={stopSaving}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="submit"
                            size="sm"
                            disabled={stopSaving}
                          >
                            {stopSaving ? "Saving…" : "Save"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingStopId(null)}
                            disabled={stopSaving}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="mt-1 flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEditStop(stop)}
                          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                        >
                          Edit dates & notes
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStop(stop.id)}
                          disabled={actionLoading}
                          className="text-xs font-medium text-destructive hover:text-destructive/80 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
