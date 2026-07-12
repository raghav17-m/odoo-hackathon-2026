import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Truck, Navigation, CheckCircle2, AlertTriangle, Users, BarChart3, Filter } from 'lucide-react';
import TelemetryMap from './TelemetryMap';

export default function Dashboard({ user }) {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trips, setTrips] = useState([]);
  
  // Simulation State
  const [simSpeed, setSimSpeed] = useState(10); // Default to 10x for visual movements

  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterRegion, setFilterRegion] = useState('');

  const loadData = async () => {
    try {
      const vList = await api.vehicles.list();
      const dList = await api.drivers.list();
      const tList = await api.trips.list();
      setVehicles(vList);
      setDrivers(dList);
      setTrips(tList);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  const handleCompleteTripSimulated = async (tripId, plannedDistance) => {
    try {
      // Mock average mileage of 5 km per Liter
      const fuelConsumed = Number((plannedDistance / 5).toFixed(1));
      await api.trips.complete(tripId, {
        actual_distance: plannedDistance,
        fuel_consumed: fuelConsumed
      });
      loadData();
    } catch (err) {
      console.error('Failed to auto-complete trip during simulation:', err);
    }
  };

  useEffect(() => {
    loadData();
    // Set up a listener for storage events to reload if data changes elsewhere
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  // Filter vehicles based on selected filter values
  const filteredVehicles = vehicles.filter(v => {
    const matchType = filterType ? v.type.toLowerCase() === filterType.toLowerCase() : true;
    const matchRegion = filterRegion ? v.region.toLowerCase() === filterRegion.toLowerCase() : true;
    return matchType && matchRegion;
  });

  // Calculate KPIs based on filtered vehicles
  const totalVehiclesCount = filteredVehicles.length;
  const activeVehiclesCount = filteredVehicles.filter(v => v.status === 'OnTrip').length;
  const availableVehiclesCount = filteredVehicles.filter(v => v.status === 'Available').length;
  const maintenanceVehiclesCount = filteredVehicles.filter(v => v.status === 'InShop').length;
  
  // Trips are filtered based on the filtered vehicles
  const filteredVehicleIds = new Set(filteredVehicles.map(v => v.id));
  const filteredTrips = trips.filter(t => filteredVehicleIds.has(t.vehicle_id));

  const activeTripsCount = filteredTrips.filter(t => t.status === 'Dispatched').length;
  const pendingTripsCount = filteredTrips.filter(t => t.status === 'Draft').length;

  // Drivers on duty (Available or OnTrip)
  // Let's filter drivers by region if needed (we can map driver to their active vehicle region or just list total)
  const driversOnDutyCount = drivers.filter(d => ['Available', 'OnTrip'].includes(d.status)).length;

  // Fleet utilization %
  const fleetUtilization = totalVehiclesCount > 0 
    ? Math.round((activeVehiclesCount / totalVehiclesCount) * 100) 
    : 0;

  // Extract unique types and regions for filters
  const uniqueTypes = [...new Set(vehicles.map(v => v.type))].filter(Boolean);
  const uniqueRegions = [...new Set(vehicles.map(v => v.region))].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Title & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-hive-black tracking-tight">Dashboard</h1>
          <p className="text-text-secondary text-sm">Welcome back, {user.name} ({user.role})</p>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-honey-beige shadow-premium">
          <div className="flex items-center gap-1.5 text-xs font-bold text-text-secondary uppercase">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs bg-bg-warm border border-honey-beige rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-honey-gold"
          >
            <option value="">All Vehicle Types</option>
            {uniqueTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
            className="text-xs bg-bg-warm border border-honey-beige rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-honey-gold"
          >
            <option value="">All Regions</option>
            {uniqueRegions.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {(filterType || filterRegion) && (
            <button
              onClick={() => { setFilterType(''); setFilterRegion(''); }}
              className="text-[10px] font-bold text-danger-red hover:underline cursor-pointer"
            >
              Clear
            </button>
          )}

          {/* Simulation Speed Control */}
          <div className="flex items-center gap-1.5 border-l border-honey-beige/60 pl-3">
            <span className="text-[10px] font-bold text-text-secondary uppercase">Sim Speed:</span>
            <select
              value={simSpeed}
              onChange={(e) => setSimSpeed(Number(e.target.value))}
              className="text-xs bg-bg-warm border border-honey-beige rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-honey-gold font-bold text-honey-dark"
            >
              <option value="1">1x (Real-time)</option>
              <option value="10">10x Speed</option>
              <option value="50">50x Speed</option>
              <option value="150">150x Speed</option>
              <option value="500">500x Speed</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Fleet Utilization */}
        <div className="bg-white p-6 rounded-2xl border border-honey-beige shadow-premium flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Fleet Utilization</span>
            <div className="w-9 h-9 rounded-xl bg-honey-gold/10 flex items-center justify-center text-honey-dark">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-hive-black">{fleetUtilization}%</span>
            <span className="block text-[10px] text-text-secondary mt-1">Active vs total vehicles</span>
          </div>
        </div>

        {/* Active Vehicles / Trips */}
        <div className="bg-white p-6 rounded-2xl border border-honey-beige shadow-premium flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Active Operations</span>
            <div className="w-9 h-9 rounded-xl bg-honey-dark/10 flex items-center justify-center text-honey-dark">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-hive-black">{activeVehiclesCount}</span>
            <span className="block text-[10px] text-text-secondary mt-1">Vehicles currently on trip</span>
          </div>
        </div>

        {/* Maintenance Vehicles */}
        <div className="bg-white p-6 rounded-2xl border border-honey-beige shadow-premium flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">In the Shop</span>
            <div className="w-9 h-9 rounded-xl bg-warning-orange/10 flex items-center justify-center text-warning-orange">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-hive-black">{maintenanceVehiclesCount}</span>
            <span className="block text-[10px] text-text-secondary mt-1">Vehicles under maintenance</span>
          </div>
        </div>

        {/* Drivers Available */}
        <div className="bg-white p-6 rounded-2xl border border-honey-beige shadow-premium flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Drivers on Duty</span>
            <div className="w-9 h-9 rounded-xl bg-success-green/10 flex items-center justify-center text-success-green">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-hive-black">{driversOnDutyCount}</span>
            <span className="block text-[10px] text-text-secondary mt-1">Active and ready drivers</span>
          </div>
        </div>
      </div>

      {/* Detail Counters Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-xl border border-honey-beige shadow-premium flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-success-green/10 flex items-center justify-center text-success-green">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider">Available Fleet</span>
            <span className="text-xl font-extrabold text-hive-black">{availableVehiclesCount} Vehicles</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-honey-beige shadow-premium flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-honey-gold/15 flex items-center justify-center text-honey-dark">
            <Navigation className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider">Active Shipments</span>
            <span className="text-xl font-extrabold text-hive-black">{activeTripsCount} Dispatched</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-honey-beige shadow-premium flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-hive-black/10 flex items-center justify-center text-hive-black">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider">Pending Orders</span>
            <span className="text-xl font-extrabold text-hive-black">{pendingTripsCount} Draft Trips</span>
          </div>
        </div>
      </div>

      {/* Interactive Telemetry Map */}
      {vehicles.length > 0 && (
        <TelemetryMap
          activeTrips={trips.filter(t => t.status === 'Dispatched')}
          onCompleteTrip={handleCompleteTripSimulated}
          simSpeed={simSpeed}
        />
      )}

      {/* Empty State Banner if no Vehicles are loaded */}
      {vehicles.length === 0 && (
        <div className="bg-white rounded-2xl border border-honey-beige p-12 text-center shadow-premium space-y-3">
          <Truck className="w-12 h-12 text-honey-gold mx-auto stroke-1" />
          <h3 className="text-lg font-bold text-hive-black">No Fleet Assets Registered</h3>
          <p className="text-text-secondary text-sm max-w-md mx-auto">
            Ego Fleat is currently empty. Switch to a <strong>Fleet Manager</strong> role to start registering vehicles and drivers.
          </p>
        </div>
      )}
    </div>
  );
}
