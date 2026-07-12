import React, { useRef, useEffect, useState } from 'react';
import { Truck, MapPin } from 'lucide-react';

const HUBS = {
  delhi: { name: 'Delhi Hub', x: 220, y: 80 },
  mumbai: { name: 'Mumbai Logistics', x: 130, y: 260 },
  pune: { name: 'Pune Depot', x: 150, y: 290 },
  kolkata: { name: 'Kolkata Port', x: 380, y: 190 },
  bangalore: { name: 'Bangalore Hub', x: 200, y: 400 },
  chennai: { name: 'Chennai Port', x: 240, y: 420 },
};

function getHubCoordinate(name) {
  const norm = (name || '').toLowerCase();
  if (norm.includes('mumbai')) return HUBS.mumbai;
  if (norm.includes('pune')) return HUBS.pune;
  if (norm.includes('delhi')) return HUBS.delhi;
  if (norm.includes('kolkata') || norm.includes('calcutta')) return HUBS.kolkata;
  if (norm.includes('bangalore') || norm.includes('bengaluru')) return HUBS.bangalore;
  if (norm.includes('chennai') || norm.includes('madras')) return HUBS.chennai;

  // Stable hash fallback coordinates within Indian map box
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = norm.charCodeAt(i) + ((hash << 5) - hash);
  }
  const x = 120 + Math.abs((hash % 200));
  const y = 100 + Math.abs(((hash >> 3) % 250));
  return { name: name, x, y };
}

export default function TelemetryMap({ activeTrips, onCompleteTrip, simSpeed }) {
  const canvasRef = useRef(null);
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

          // Simulation calculation:
          // Distance delta = speed (km/h) * time delta (seconds) * simSpeed multiplier
          // Speed is mocked around 75 km/h. Convert to km per second: 75 / 3600.
          const kmsPerSec = 75 / 3600;
          const deltaDistance = kmsPerSec * 1.0 * simSpeed;
          const deltaProgress = (deltaDistance / trip.planned_distance) * 100;

          let newProgress = current + deltaProgress;
          if (newProgress >= 100) {
            newProgress = 100;
            // Auto complete trip in background
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

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let pulseScale = 0;

    const draw = () => {
      pulseScale = (pulseScale + 0.05) % (Math.PI * 2);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background grid lines
      ctx.strokeStyle = 'rgba(230, 218, 203, 0.06)';
      ctx.lineWidth = 1;
      const gridSize = 30;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw route pathways (inactive nodes connection)
      ctx.strokeStyle = 'rgba(107, 98, 89, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      const hubList = Object.values(HUBS);
      for (let i = 0; i < hubList.length; i++) {
        for (let j = i + 1; j < hubList.length; j++) {
          ctx.beginPath();
          ctx.moveTo(hubList[i].x, hubList[i].y);
          ctx.lineTo(hubList[j].x, hubList[j].y);
          ctx.stroke();
        }
      }
      ctx.setLineDash([]); // Reset line dash

      // Draw Hubs (Nodes)
      hubList.forEach(hub => {
        // Glowing halo
        ctx.fillStyle = 'rgba(245, 166, 35, 0.05)';
        ctx.beginPath();
        ctx.arc(hub.x, hub.y, 14, 0, Math.PI * 2);
        ctx.fill();

        // Node center
        ctx.fillStyle = '#C97A1A';
        ctx.beginPath();
        ctx.arc(hub.x, hub.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.fillStyle = 'rgba(31, 27, 22, 0.6)';
        ctx.font = 'bold 8px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(hub.name, hub.x, hub.y - 8);
      });

      // Draw Dispatched Trips Routes and Moving Vehicles
      activeTrips.forEach(trip => {
        const start = getHubCoordinate(trip.source);
        const end = getHubCoordinate(trip.destination);
        const progress = progresses[trip.id] || 0;

        // Draw active glowing path line
        ctx.strokeStyle = '#F5A623';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        // Calculate moving truck coordinate
        const pct = progress / 100;
        const tx = start.x + (end.x - start.x) * pct;
        const ty = start.y + (end.y - start.y) * pct;

        // Pulsing radar ring
        const radRadius = 8 + Math.sin(pulseScale) * 8;
        ctx.strokeStyle = `rgba(245, 166, 35, ${0.4 - Math.sin(pulseScale) * 0.3})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(tx, ty, radRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Truck center circle
        ctx.fillStyle = '#F5A623';
        ctx.beginPath();
        ctx.arc(tx, ty, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw label with destination name and progress pct
        ctx.fillStyle = '#1F1B16';
        ctx.font = 'bold 7.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(progress)}%`, tx, ty - 9);
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationFrameId);
  }, [activeTrips, progresses]);

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Detect if we clicked close to any vehicle
    let found = null;
    activeTrips.forEach(trip => {
      const start = getHubCoordinate(trip.source);
      const end = getHubCoordinate(trip.destination);
      const progress = progresses[trip.id] || 0;
      const pct = progress / 100;
      const tx = start.x + (end.x - start.x) * pct;
      const ty = start.y + (end.y - start.y) * pct;

      const dist = Math.sqrt((clickX - tx) ** 2 + (clickY - ty) ** 2);
      if (dist < 12) {
        found = {
          ...trip,
          progress: Math.round(progress),
          currentX: tx,
          currentY: ty
        };
      }
    });

    setSelectedVehicle(found);
  };

  return (
    <div className="relative bg-bg-warm border border-honey-beige rounded-2xl overflow-hidden shadow-premium flex flex-col md:flex-row min-h-[350px]">
      {/* Live Map Panel */}
      <div className="flex-1 relative bg-white border-r border-honey-beige/40 flex items-center justify-center p-4">
        <div className="absolute top-4 left-4 bg-hive-black/10 border border-honey-beige px-3 py-1.5 rounded-xl flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-success-green animate-ping" />
          <span className="text-[10px] font-extrabold text-hive-black tracking-wider uppercase">Live GPS Radar</span>
        </div>

        <canvas
          ref={canvasRef}
          width={500}
          height={480}
          onClick={handleCanvasClick}
          className="max-w-full aspect-[500/480] bg-white cursor-pointer"
        />

        {/* Selected Vehicle Floating Info Card */}
        {selectedVehicle && (
          <div 
            className="absolute bg-hive-black text-white p-3.5 rounded-xl shadow-xl z-20 text-[10px] space-y-2 border border-honey-gold/30 w-52 max-w-full animate-fade-in"
            style={{
              left: `${Math.min(selectedVehicle.currentX, 280)}px`,
              top: `${Math.min(selectedVehicle.currentY + 20, 360)}px`
            }}
          >
            <div className="flex justify-between items-center border-b border-honey-beige/10 pb-1.5">
              <span className="font-extrabold uppercase text-honey-gold">Telemetry Stats</span>
              <button onClick={() => setSelectedVehicle(null)} className="text-honey-beige hover:text-white cursor-pointer text-xs font-bold">×</button>
            </div>
            <div className="space-y-1">
              <span className="block font-bold">Route: {selectedVehicle.source} ➔ {selectedVehicle.destination}</span>
              <span className="block text-honey-beige/80">Distance: {selectedVehicle.planned_distance} km</span>
              <span className="block text-honey-beige/80">Cargo Payload: {selectedVehicle.cargo_weight} kg</span>
              <span className="block text-honey-beige/80">Est. Speed: 75 km/h</span>
              <span className="block text-honey-beige/80">Completion: {selectedVehicle.progress}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Telemetry Stream Sidebar */}
      <div className="w-full md:w-64 bg-bg-warm/30 p-5 flex flex-col justify-between shrink-0">
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-honey-beige pb-2">
            <Truck className="text-honey-dark w-4 h-4" />
            <span className="font-extrabold text-[11px] text-hive-black uppercase tracking-wider">Active Fleet Stream</span>
          </div>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {activeTrips.length === 0 ? (
              <p className="text-[10px] text-text-secondary text-center py-8">
                No active dispatched trips. Go to the <strong className="text-hive-black">Trips</strong> tab to dispatch a drafted route.
              </p>
            ) : (
              activeTrips.map(trip => {
                const prog = Math.round(progresses[trip.id] || 0);
                return (
                  <div key={trip.id} className="p-3 bg-white border border-honey-beige rounded-xl space-y-1.5 shadow-xs hover:border-honey-gold/40 transition-all">
                    <div className="flex justify-between items-center text-[10px] font-bold text-hive-black">
                      <span className="truncate max-w-[100px]">{trip.source} ➔ {trip.destination}</span>
                      <span className="text-honey-dark">{prog}%</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-honey-beige/30 rounded-full overflow-hidden">
                      <div className="h-full bg-honey-gold rounded-full transition-all duration-300" style={{ width: `${prog}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] text-text-secondary">
                      <span>Dist: {trip.planned_distance}km</span>
                      <span>Weight: {trip.cargo_weight}kg</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sim Options Info */}
        <div className="bg-white border border-honey-beige p-3 rounded-xl text-[9px] text-text-secondary space-y-1 mt-4">
          <span className="block font-bold text-hive-black">Simulator Guide:</span>
          <span className="block">Active trucks travel at ~75 km/h. Increase simulation multiplier to speed up route completion and witness database status synchronizations!</span>
        </div>
      </div>
    </div>
  );
}
