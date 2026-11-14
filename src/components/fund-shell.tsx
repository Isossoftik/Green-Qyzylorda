import Link from "next/link";
import { SectionHeading } from "./section";
import { fund } from "@/lib/green";
export function FundHeading({
  title,
  desc,
  active,
}: {
  title: string;
  desc: string;
  active: string;
}) {
  return (
    <>
      <SectionHeading title={title} description={desc} />
      <nav className="filter-tabs fund-tabs">
        {[
          ["trees", "Деревья", fund],
          ["zones", "Территории", fund + "/zones"],
          ["calendar", "Календарь ухода", fund + "/calendar"],
          ["schedules", "Графики", fund + "/schedules"],
        ].map(([key, label, url]) => (
          <Link
            href={url}
            aria-current={active === key ? "page" : undefined}
            key={key}
          >
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
