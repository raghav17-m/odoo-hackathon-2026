import React, { useRef, useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Truck, MapPin } from 'lucide-react';

const HUBS = {
  delhi: { name: 'Delhi Hub', lat: 28.6139, lng: 77.2090 },
  mumbai: { name: 'Mumbai Logistics', lat: 19.0760, lng: 72.8777 },
  pune: { name: 'Pune Depot', lat: 18.5204, lng: 73.8567 },
  kolkata: { name: 'Kolkata Port', lat: 22.5726, lng: 88.3639 },
  bangalore: { name: 'Bangalore Hub', lat: 12.9716, lng: 77.5946 },
  chennai: { name: 'Chennai Port', lat: 13.0827, lng: 80.2707 },
};

function getHubCoordinate(name) {
  const norm = (name || '').toLowerCase();
  if (norm.includes('mumbai')) return HUBS.mumbai;
  if (norm.includes('pune')) return HUBS.pune;
  if (norm.includes('delhi')) return HUBS.delhi;
  if (norm.includes('kolkata') || norm.includes('calcutta')) return HUBS.kolkata;
  if (norm.includes('bangalore') || norm.includes('bengaluru')) return HUBS.bangalore;
  if (norm.includes('chennai') || norm.includes('madras')) return HUBS.chennai;

  // Fallback hash mapping to ensure stable Indian sub-continent coordinates
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = norm.charCodeAt(i) + ((hash << 5) - hash);
  }
  const lat = 15.0 + Math.abs((hash % 12));
  const lng = 73.0 + Math.abs(((hash >> 3) % 12));
  return { name: name, lat, lng };
}

export default function TelemetryMap({ activeTrips, onCompleteTrip, simSpeed }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  
  // Stored references for markers and route polylines to modify them on the fly
  const truckMarkersRef = useRef({});
  const routeLinesRef = useRef({});

  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [progresses, setProgresses] = useState({});

  // Dynamic progresses update simulation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setProgresses(prev => {
        const next = { ...prev };
        let changed = false;

        activeTrips.forEach(trip => {
          const current = prev[trip.id] || 0;
          if (current >= 100) return;

          // mock speed 75 km/h. Convert to km per second: 75 / 3600.
          const kmsPerSec = 75 / 3600;
          const deltaDistance = kmsPerSec * 1.0 * simSpeed;
          const deltaProgress = (deltaDistance / trip.planned_distance) * 100;

          let newProgress = current + deltaProgress;
          if (newProgress >= 100) {
            newProgress = 100;
            // Trigger auto complete callback
            onCompleteTrip(trip.id, trip.planned_distance);
          }
          next[trip.id] = newProgress;
          changed = true;
        });

        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTrips, simSpeed, onCompleteTrip]);

  // Leaflet Map Initialization
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Centered at Nagpur/Central India with zoom 5
    const mapInstance = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([20.5937, 78.9629], 5);

    // Premium light map tiles from CartoDB
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 18,
    }).addTo(mapInstance);

    // Render Hub markers
    const hubIcon = L.divIcon({
      html: `<div class="w-3.5 h-3.5 rounded-full bg-honey-gold border-2 border-hive-black shadow-md flex items-center justify-center"><div class="w-1.5 h-1.5 rounded-full bg-hive-black"></div></div>`,
      className: 'custom-hub-marker',
      iconSize: [14, 14],
    });

    Object.values(HUBS).forEach(hub => {
      L.marker([hub.lat, hub.lng], { icon: hubIcon })
        .bindPopup(`<strong class="text-hive-black font-bold">${hub.name}</strong>`)
        .addTo(mapInstance);
    });

    mapRef.current = mapInstance;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Truck Positions & Paths
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Set of active trip IDs for cleanup
    const activeIds = new Set(activeTrips.map(t => t.id));

    // Cleanup ended trips
    Object.keys(truckMarkersRef.current).forEach(id => {
      if (!activeIds.has(id)) {
        if (truckMarkersRef.current[id]) {
          map.removeLayer(truckMarkersRef.current[id]);
          delete truckMarkersRef.current[id];
        }
        if (routeLinesRef.current[id]) {
          map.removeLayer(routeLinesRef.current[id]);
          delete routeLinesRef.current[id];
        }
      }
    });

    // Render/update active routes
    activeTrips.forEach(trip => {
      const sourceHub = getHubCoordinate(trip.source);
      const destHub = getHubCoordinate(trip.destination);
      const progress = progresses[trip.id] || 0;

      // Current geographical coordinates
      const currentLat = sourceHub.lat + (destHub.lat - sourceHub.lat) * (progress / 100);
      const currentLng = sourceHub.lng + (destHub.lng - sourceHub.lng) * (progress / 100);

      // Create Route Polyline if not already created
      if (!routeLinesRef.current[trip.id]) {
        routeLinesRef.current[trip.id] = L.polyline(
          [[sourceHub.lat, sourceHub.lng], [destHub.lat, destHub.lng]],
          { color: '#C97A1A', weight: 2.5, dashArray: '6, 6', opacity: 0.7 }
        ).addTo(map);
      }

      // Create or update truck marker icon
      const truckHtml = `
        <div class="relative group cursor-pointer">
          <div class="w-6 h-6 rounded-full bg-hive-black border border-honey-gold flex items-center justify-center shadow-lg hover:scale-110 transition-all">
            <svg class="w-3.5 h-3.5 text-honey-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M20 16h-7M20 16v-5a1 1 0 00-1-1h-3v6" />
            </svg>
          </div>
          <div class="absolute left-1/2 -translate-x-1/2 bottom-7 bg-hive-black text-white text-[9px] font-bold px-2 py-0.5 rounded shadow opacity-90 pointer-events-none whitespace-nowrap">
            ${progress.toFixed(0)}%
          </div>
        </div>
      `;

      const truckIcon = L.divIcon({
        html: truckHtml,
        className: 'custom-truck-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      if (!truckMarkersRef.current[trip.id]) {
        const marker = L.marker([currentLat, currentLng], { icon: truckIcon })
          .bindPopup(`
            <div class="text-xs space-y-1">
              <strong class="block text-hive-black text-sm">${trip.source} ➔ ${trip.destination}</strong>
              <span class="block text-text-secondary">Progress: <strong>${progress.toFixed(1)}%</strong></span>
              <span class="block text-text-secondary">Load Payload: <strong>${trip.cargo_weight} kg</strong></span>
              <span class="block text-text-secondary">Distance Remaining: <strong>${((1 - progress / 100) * trip.planned_distance).toFixed(0)} km</strong></span>
            </div>
          `)
          .addTo(map);

        marker.on('click', () => {
          setSelectedVehicle({
            id: trip.id,
            source: trip.source,
            destination: trip.destination,
            progress: progress,
            planned_distance: trip.planned_distance,
            cargo_weight: trip.cargo_weight,
          });
        });

        truckMarkersRef.current[trip.id] = marker;
      } else {
        truckMarkersRef.current[trip.id].setLatLng([currentLat, currentLng]);
        truckMarkersRef.current[trip.id].setIcon(truckIcon);
        
        // Update popup content dynamically if open
        const popup = truckMarkersRef.current[trip.id].getPopup();
        if (popup && popup.isOpen()) {
          popup.setContent(`
            <div class="text-xs space-y-1">
              <strong class="block text-hive-black text-sm">${trip.source} ➔ ${trip.destination}</strong>
              <span class="block text-text-secondary">Progress: <strong>${progress.toFixed(1)}%</strong></span>
              <span class="block text-text-secondary">Load Payload: <strong>${trip.cargo_weight} kg</strong></span>
              <span class="block text-text-secondary">Distance Remaining: <strong>${((1 - progress / 100) * trip.planned_distance).toFixed(0)} km</strong></span>
            </div>
          `);
        }
      }
    });

  }, [activeTrips, progresses]);

  return (
    <div className="bg-white rounded-2xl border border-honey-beige p-5 shadow-premium space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-honey-dark" />
          <h2 className="text-sm font-extrabold text-hive-black uppercase tracking-wider">Live Route Map & GPS Simulation</h2>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-text-secondary font-semibold bg-bg-warm px-3 py-1 rounded-full border border-honey-beige">
          <span className="w-1.5 h-1.5 rounded-full bg-honey-gold animate-ping"></span>
          <span>{activeTrips.length} Active Shipments</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Leaflet Map Area */}
        <div className="lg:col-span-3 h-[420px] rounded-xl overflow-hidden border border-honey-beige shadow-inner relative z-10">
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>

        {/* Selected vehicle sidebar */}
        <div className="bg-bg-warm/50 border border-honey-beige p-4 rounded-xl space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-[10px] font-extrabold text-honey-dark uppercase tracking-wider mb-3">Live Telemetry Feed</h3>
            
            {selectedVehicle ? (
              <div className="space-y-3 text-xs">
                <div className="p-2.5 bg-white border border-honey-beige rounded-lg">
                  <span className="block text-[9px] font-extrabold text-text-secondary uppercase">Active Route</span>
                  <span className="font-bold text-hive-black">{selectedVehicle.source} ➔ {selectedVehicle.destination}</span>
                </div>

                <div className="p-2.5 bg-white border border-honey-beige rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Progress</span>
                    <span className="font-bold text-hive-black">
                      {(progresses[selectedVehicle.id] || selectedVehicle.progress).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-honey-beige/30 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-honey-gold h-full rounded-full transition-all" 
                      style={{ width: `${progresses[selectedVehicle.id] || selectedVehicle.progress}%` }}
                    />
                  </div>
                </div>

                <div className="p-2.5 bg-white border border-honey-beige rounded-lg grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="block text-[8px] font-extrabold text-text-secondary uppercase">Payload</span>
                    <span className="font-bold text-hive-black">{selectedVehicle.cargo_weight} kg</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-extrabold text-text-secondary uppercase">Total Dist</span>
                    <span className="font-bold text-hive-black">{selectedVehicle.planned_distance} km</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-text-secondary">
                <MapPin className="w-8 h-8 text-honey-beige mx-auto mb-2" />
                <p className="text-[11px] font-medium leading-relaxed">Click any active truck marker on the map to audit real-time telemetry.</p>
              </div>
            )}
          </div>

          <div className="text-[9px] text-text-secondary italic text-center pt-3 border-t border-honey-beige/60">
            Speed multiplier is currently synchronized to <strong className="text-hive-black">{simSpeed}x</strong>.
          </div>
        </div>
      </div>
    </div>
  );
}
