"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { Trees, MessageSquare, Droplets } from "lucide-react";
import type { GreenPin } from "@/lib/green";
const noPins: GreenPin[] = [];
import { labels, type Row } from "@/lib/workflow";
const empty: Row[] = [];
import bounds from "../../public/map-bounds.json";
export default function CityMap({
  full = false,
  rows = empty,
  pins = noPins,
  onPick,
  onSelect,
  focus,
}: {
  full?: boolean;
  onSelect?: (p: {
    name: string;
    href: string;
    detail: string;
    lat: number;
    lng: number;
  }) => void;
  focus?: string;
  rows?: Row[];
  pins?: GreenPin[];
  onPick?: (lat: number, lng: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const limits = L.latLngBounds(
      bounds[0] as [number, number],
      bounds[1] as [number, number],
    );
    const map = L.map(ref.current, {
      zoomControl: false,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
      scrollWheelZoom: full,
      minZoom: 13,
      maxZoom: 16,
      zoomSnap: 0.25,
      maxBounds: limits,
      maxBoundsViscosity: 1,
      attributionControl: false,
    });
    map.setView([44.844, 65.496], full ? 14 : 13.5);
    L.imageOverlay("/qyzylorda.webp", limits).addTo(map);
    L.control
      .zoom({
        position: "topright",
        zoomInTitle: "Приблизить",
        zoomOutTitle: "Отдалить",
      })
      .addTo(map);
    L.control
      .attribution({ prefix: false })
      .addAttribution(
        '<a href="https://openstreetmap.org/copyright">© OpenStreetMap</a> · <a href="https://openfreemap.org">OpenFreeMap</a> · <a href="https://openmaptiles.org">OpenMapTiles</a>',
      )
      .addTo(map);
    if (onPick) {
      let marker: L.CircleMarker | undefined;
      map.on("click", (e) => {
        if (!limits.contains(e.latlng)) return;
        marker?.remove();
        marker = L.circleMarker(e.latlng, {
          radius: 8,
          color: "#fff",
          fillColor: "#22c55e",
          fillOpacity: 1,
        }).addTo(map);
        onPick(e.latlng.lat, e.latlng.lng);
      });
    }
    const points = onPick
      ? []
      : [
          ...pins,
          ...rows.map((row) => ({
            name: row.title,
            lat: row.lat,
            lng: row.lng,
            kind: "report",
            detail: row.category + " · " + labels[row.status],
            href: "/reports/" + row.id,
          })),
        ];
    if (full && points.length)
      map.fitBounds(
        L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])),
        { padding: [32, 32], maxZoom: 15, animate: false },
      );
    if (!onPick)
      L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);
    points.forEach((p) => {
      const Icon =
        p.kind === "green" || p.kind === "tree"
          ? Trees
          : p.kind === "task"
            ? Droplets
            : MessageSquare;
      const html = renderToStaticMarkup(
        <span className={"pin " + p.kind}>
          <Icon size={14} strokeWidth={2.3} />
        </span>,
      );
      const popup = document.createElement("div");
      popup.textContent = p.name;
      {
        const detail = document.createElement("p");
        detail.textContent = p.detail;
        popup.append(detail);
        const a = document.createElement("a");
        a.href = p.href;
        a.textContent =
          p.kind === "report" ? "Открыть обращение →" : "Открыть карточку →";
        popup.append(a);
      }
      const marker = L.marker([p.lat, p.lng], {
        title: p.name,
        alt: p.name,
        icon: L.divIcon({
          className: "custom-pin",
          html,
          iconSize: [27, 27],
          iconAnchor: p.kind === "task" ? [-8, 24] : [13, 13],
        }),
      })
        .bindPopup(popup)
        .on("click", () => onSelect?.(p))
        .addTo(map);
      if (p.href === focus) {
        map.setView([p.lat, p.lng], 15);
        marker.openPopup();
        onSelect?.(p);
      }
    });
    const label = (lat: number, lng: number, name: string, cls: string) =>
      L.marker([lat, lng], {
        interactive: false,
        keyboard: false,
        icon: L.divIcon({
          className: "map-label " + cls,
          html: name,
          iconSize: [110, 18],
          iconAnchor: [55, 9],
        }),
      }).addTo(map);
    label(44.846, 65.5, "Кызылорда", "city-label");
    label(44.825, 65.478, "АРАЙ", "");
    label(44.861, 65.527, "АКМЕШИТ", "");
    label(44.834, 65.461, "Сырдарья", "river-label");
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      map.remove();
    };
  }, [full, rows, onPick, pins, onSelect, focus]);
  return (
    <div
      ref={ref}
      className={"city-map " + (full ? "full-map" : "")}
      aria-label="Карта демонстрационных объектов Кызылорды"
    />
  );
}
