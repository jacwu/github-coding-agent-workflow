import Link from "next/link";
import Image from "next/image";
import { Star, DollarSign } from "lucide-react";

import type { DestinationListItem } from "@/lib/destinations";

interface DestinationCardProps {
  destination: DestinationListItem;
}

export default function DestinationCard({ destination }: DestinationCardProps) {
  return (
    <Link
      href={`/destinations/${destination.id}`}
      className="group block rounded-3xl bg-card overflow-hidden shadow-sm transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 outline-none"
    >
      <div className="relative w-full aspect-[4/3] overflow-hidden">
        <Image
          src={destination.image}
          alt={destination.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <span className="absolute bottom-3 left-3 rounded-full bg-background/80 backdrop-blur-sm px-3 py-1 text-xs font-medium text-foreground capitalize">
          {destination.category}
        </span>
      </div>

      <div className="p-5 space-y-2">
        <h3 className="text-lg font-semibold text-card-foreground leading-tight">
          {destination.name}
        </h3>
        <p className="text-sm text-muted-foreground">
          {destination.country}
          {destination.region ? ` · ${destination.region}` : ""}
        </p>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1 text-sm font-medium text-card-foreground">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            {destination.rating.toFixed(1)}
          </div>
          <div className="flex items-center gap-0.5 text-muted-foreground">
            {Array.from({ length: 5 }, (_, i) => (
              <DollarSign
                key={i}
                className={`h-3.5 w-3.5 ${
                  i < destination.price_level
                    ? "text-primary"
                    : "text-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
