import Image from "next/image";
import Link from "next/link";

import { formatPriceLevel } from "@/lib/format-utils";

interface DestinationCardProps {
  id: number;
  name: string;
  country: string;
  category: string;
  price_level: number;
  rating: number;
  image: string;
}

export default function DestinationCard({
  id,
  name,
  country,
  category,
  price_level,
  rating,
  image,
}: DestinationCardProps) {
  return (
    <Link
      href={`/destinations/${id}`}
      className="group block rounded-3xl bg-card shadow-sm overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300 focus-visible:outline-2 focus-visible:outline-ring"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <Image
          src={image}
          alt={`${name}, ${country}`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span className="absolute top-3 left-3 glass rounded-full px-3 py-1 text-xs font-medium capitalize">
          {category}
        </span>
      </div>
      <div className="p-5">
        <h3 className="text-lg font-semibold text-foreground">{name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{country}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm font-medium text-primary">
            ★ {rating.toFixed(1)}
          </span>
          <span className="text-sm text-muted-foreground">
            {formatPriceLevel(price_level)}
          </span>
        </div>
      </div>
    </Link>
  );
}
