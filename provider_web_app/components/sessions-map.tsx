"use client"

import { useEffect, useRef } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"

interface SessionsMapProps {
  sessions: any[]
  lots?: Array<{ id: string; name: string; latitude?: number | null; longitude?: number | null }>
  selectedSession: number | null
  onSelectSession: (id: number) => void
}

export function SessionsMap({ sessions, lots = [], selectedSession, onSelectSession }: SessionsMapProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const selectedMarkerRef = useRef<mapboxgl.Marker | null>(null)

  const ensureLotClusters = () => {
    const map = mapRef.current
    if (!map) return
    const sourceId = "lotsSource"
    const clusterLayerId = "lots-clusters"
    const clusterCountId = "lots-cluster-count"
    const unclusterId = "lots-unclustered"
    const lotFeatures: any = {
      type: "FeatureCollection",
      features: lots
        .filter(l => typeof l.longitude === "number" && typeof l.latitude === "number")
        .map(l => ({ type: "Feature", geometry: { type: "Point", coordinates: [l.longitude as number, l.latitude as number] }, properties: { name: l.name } })),
    }
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: "geojson",
        data: lotFeatures,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 40,
      } as any)
      map.addLayer({
        id: clusterLayerId,
        type: "circle",
        source: sourceId,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#3B82F6",
          "circle-radius": ["step", ["get", "point_count"], 12, 10, 16, 25, 20],
          "circle-opacity": 0.6,
        },
      })
      map.addLayer({
        id: clusterCountId,
        type: "symbol",
        source: sourceId,
        filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12 },
        paint: { "text-color": "#0F172A" },
      })
      map.addLayer({
        id: unclusterId,
        type: "circle",
        source: sourceId,
        filter: ["!", ["has", "point_count"]],
        paint: { "circle-color": "#3B82F6", "circle-radius": 5, "circle-opacity": 0.7 },
      })
      // cluster click to zoom in
      map.on('click', clusterLayerId, (e: any) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [clusterLayerId] }) as any[]
        if (!features?.length) return
        const f0 = features[0]
        const clusterId = f0?.properties?.cluster_id
        const source: any = map.getSource(sourceId)
        if (!source || clusterId == null) return
        source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
          if (err) return
          const coords = (f0.geometry as any).coordinates as [number, number]
          if (!coords) return
          map.easeTo({ center: coords, zoom })
        })
      })
      map.on('mouseenter', clusterLayerId, () => map.getCanvas().style.cursor = 'pointer')
      map.on('mouseleave', clusterLayerId, () => map.getCanvas().style.cursor = '')
    } else {
      (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(lotFeatures)
    }
  }

  const renderSessionMarkers = () => {
    const map = mapRef.current
    if (!map) return
    ;(map as any).__sessionMarkers?.forEach((m: mapboxgl.Marker) => m.remove())
    const markers: mapboxgl.Marker[] = []
    sessions.forEach(s => {
      if (typeof s.lng === "number" && typeof s.lat === "number") {
        const el = document.createElement("div")
        el.className = `rounded-full w-3 h-3 ${s.status === "warning" ? "bg-red-500" : "bg-emerald-500"}`
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([s.lng, s.lat])
          .addTo(map)
        el.addEventListener("click", () => onSelectSession(s.id))
        markers.push(marker)
      }
    })
    ;(map as any).__sessionMarkers = markers
  }

  // Highlight selected session with larger ring marker
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    selectedMarkerRef.current?.remove()
    const sel = sessions.find(s => s.id === selectedSession)
    if (!sel || typeof sel.lng !== "number" || typeof sel.lat !== "number") return
    const el = document.createElement("div")
    el.className = "w-6 h-6 rounded-full border-2 border-white shadow ring-2 ring-emerald-500"
    selectedMarkerRef.current = new mapboxgl.Marker({ element: el }).setLngLat([sel.lng, sel.lat]).addTo(map)
  }, [selectedSession, sessions])

  const fitToData = () => {
    const map = mapRef.current
    if (!map) return
    const sessionCoords = sessions.filter(s => typeof s.lng === "number" && typeof s.lat === "number").map(s => [s.lng, s.lat])
    const lotCoords = lots.filter(l => typeof l.longitude === "number" && typeof l.latitude === "number").map(l => [l.longitude as number, l.latitude as number])
    const coords = [...sessionCoords, ...lotCoords]
    if (coords.length > 1) {
      const bounds = new mapboxgl.LngLatBounds()
      coords.forEach(c => bounds.extend(c as [number, number]))
      map.fitBounds(bounds, { padding: 80, animate: true })
    } else if (coords.length === 1) {
      map.setCenter(coords[0] as [number, number])
      map.setZoom(13)
    }
  }

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string | undefined
    if (!token || !mapContainer.current) return
    if (!mapRef.current) {
      mapboxgl.accessToken = token
      mapRef.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [73.82, 18.55],
        zoom: 9.2,
      })
      mapRef.current.once("load", () => {
        ensureLotClusters()
        renderSessionMarkers()
        fitToData()
      })
    } else {
      if (mapRef.current.isStyleLoaded()) {
        ensureLotClusters()
      } else {
        mapRef.current.once("load", ensureLotClusters)
      }
      renderSessionMarkers()
      fitToData()
    }
  }, [sessions, lots, onSelectSession])

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string | undefined
  if (!token) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 h-96 flex items-center justify-center text-center">
        <div>
          <p className="text-muted-foreground mb-2">Map view requires a Mapbox token.</p>
          <p className="text-xs text-muted-foreground">Set NEXT_PUBLIC_MAPBOX_TOKEN in your .env.local</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div ref={mapContainer} className="bg-card rounded-lg border border-border h-96" />
      <div className="absolute top-3 right-3 z-10 bg-card border border-border rounded px-2 py-1 text-xs text-foreground/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-blue-500" /> Lots ({lots?.length || 0})</div>
          <div className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500" /> Sessions ({sessions?.length || 0})</div>
          <div className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-red-500" /> Warnings</div>
        </div>
      </div>
    </div>
  )
}
