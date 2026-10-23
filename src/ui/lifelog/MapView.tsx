import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import type { PlaceVisits } from '../../engine'

/**
 * Everywhere you've been: one pin per place, bigger for more visits. Map
 * images come from OpenStreetMap's free tile servers.
 */
export default function MapView({ visits, onPick }: { visits: PlaceVisits[]; onPick: (placeId: string) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const pick = useRef(onPick)
  pick.current = onPick

  useEffect(() => {
    if (!box.current) return
    const m = L.map(box.current, { zoomControl: true, attributionControl: true, worldCopyJump: true }).setView([20, 0], 2)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m)
    map.current = m
    layer.current = L.layerGroup().addTo(m)
    return () => {
      m.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    const m = map.current
    const group = layer.current
    if (!m || !group) return
    group.clearLayers()
    const most = Math.max(1, ...visits.map(v => v.visits))
    for (const v of visits) {
      L.circleMarker([v.place.lat, v.place.lon], {
        radius: 6 + 10 * Math.sqrt(v.visits / most),
        className: 'map-pin',
        weight: 2,
      })
        .bindTooltip(`${v.place.name} · ${v.visits} memor${v.visits === 1 ? 'y' : 'ies'}`)
        .on('click', () => pick.current(v.place.id))
        .addTo(group)
    }
    if (visits.length === 1) m.setView([visits[0].place.lat, visits[0].place.lon], 14)
    else if (visits.length > 1) m.fitBounds(L.latLngBounds(visits.map(v => [v.place.lat, v.place.lon] as [number, number])), { padding: [30, 30], maxZoom: 15 })
  }, [visits])

  return <div ref={box} className="map-box" role="region" aria-label="Map of places you've been" />
}
