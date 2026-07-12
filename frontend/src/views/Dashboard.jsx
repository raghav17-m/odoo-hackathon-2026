import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { 
  Truck, Navigation, CheckCircle2, AlertTriangle, Users, 
  BarChart3, Filter, ShieldAlert, BadgeDollarSign, UserCheck, 
  Clock, TrendingUp, Coins, Check, X 
} from 'lucide-react';
import TelemetryMap from './TelemetryMap';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export default function Dashboard({ user }) {
  // Global fleet lists
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [complianceAlerts, setComplianceAlerts] = useState({ license_alerts: [], maintenance_alerts: [], total_alerts: 0 });

  // Simulation State
  const [simSpeed, setSimSpeed] = useState(10); // Default to 10x for visual movements

  // Manager Filters
  const [filterType, setFilterType] = useState('');
  const [filterRegion, setFilterRegion] = useState('');

  const loadData = async () => {
    try {
      const [vList, dList, tList, eList, mList, fList, cData] = await Promise.all([
        api.vehicles.list(),
        api.drivers.list(),
        api.trips.list(),
        api.expenses.list(),
        api.maintenance.list(),
        api.fuel.list(),
        api.compliance.alerts()
      ]);

      setVehicles(vList);
      setDrivers(dList);
      setTrips(tList);
      setExpenses(eList);
      setMaintenance(mList);
      setFuelLogs(fList);
      setComplianceAlerts(cData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  const handleCompleteTripSimulated = async (tripId, plannedDistance) => {
    try {
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

  const handleAcceptTrip = async (tripId) => {
    if (!window.confirm('Accept this assigned shift and begin trip?')) return;
    try {
      await api.trips.accept(tripId);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeclineTrip = async (tripId) => {
    const reason = window.prompt('Enter reason for declining this trip:');
    if (reason === null) return;
    try {
      await api.trips.decline(tripId);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  // ==========================================
  // 1. DRIVER DASHBOARD VIEW
  // ==========================================
  if (user.role === 'Driver') {
    // Find active driver profile record
    const driverRecord = drivers.find(d => d.name.toLowerCase().includes(user.name.toLowerCase()));
    
    // Filter trips for this driver
    const driverTrips = driverRecord ? trips.filter(t => t.driver_id === driverRecord.id) : [];
    const activeTrip = driverTrips.find(t => t.status === 'Dispatched');
    const pendingTrip = driverTrips.find(t => t.status === 'Assigned');
    const completedTrips = driverTrips.filter(t => t.status === 'Completed');
    
    // Metrics
    const driverSafetyScore = driverRecord ? driverRecord.safety_score : 100;
    const driverStatus = driverRecord ? driverRecord.status : 'Available';
    const totalDistCompleted = completedTrips.reduce((acc, curr) => acc + (curr.actual_distance || 0), 0);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-hive-black tracking-tight">Driver Portal</h1>
          <p className="text-text-secondary text-sm">Welcome back, {user.name}. View shift assignments and active GPS routes below.</p>
        </div>

        {/* Driver KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-6 rounded-2xl border border-honey-beige shadow-premium">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">My Safety Score</span>
              <div className="w-9 h-9 rounded-xl bg-success-green/10 flex items-center justify-center text-success-green">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-hive-black">{driverSafetyScore} / 100</span>
              <span className="block text-[10px] text-text-secondary mt-1">Based on compliance & driving checks</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-honey-beige shadow-premium">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Shift Status</span>
              <div className="w-9 h-9 rounded-xl bg-honey-gold/10 flex items-center justify-center text-honey-dark">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-hive-black">{driverStatus}</span>
              <span className="block text-[10px] text-text-secondary mt-1">Current operational state</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-honey-beige shadow-premium">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Total Kilometers</span>
              <div className="w-9 h-9 rounded-xl bg-honey-dark/10 flex items-center justify-center text-honey-dark">
                <Navigation className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-hive-black">{totalDistCompleted.toLocaleString()} km</span>
              <span className="block text-[10px] text-text-secondary mt-1">Distance logged over completed trips</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-honey-beige shadow-premium">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Completed Shifts</span>
              <div className="w-9 h-9 rounded-xl bg-hive-black/10 flex items-center justify-center text-hive-black">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-hive-black">{completedTrips.length} Trips</span>
              <span className="block text-[10px] text-text-secondary mt-1">Successfully delivered loads</span>
            </div>
          </div>
        </div>

        {/* Action Panel for Pending Acceptance */}
        {pendingTrip && (
          <div className="bg-warning-orange/5 border border-warning-orange/30 p-6 rounded-2xl space-y-4 shadow-sm animate-pulse">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-warning-orange w-6 h-6 shrink-0" />
              <div>
                <h3 className="font-extrabold text-hive-black text-sm">New Trip Assigned</h3>
                <p className="text-text-secondary text-xs">A fleet coordinator has scheduled you for a new delivery route. Please review and accept to begin duty.</p>
              </div>
            </div>
            <div className="bg-white border border-honey-beige p-4 rounded-xl text-xs space-y-2 max-w-lg">
              <div className="flex justify-between">
                <span className="text-text-secondary font-semibold">Route:</span>
                <span className="font-bold text-hive-black">{pendingTrip.source} ➔ {pendingTrip.destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary font-semibold">Cargo Payload:</span>
                <span className="font-bold text-hive-black">{pendingTrip.cargo_weight} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary font-semibold">Route Distance:</span>
                <span className="font-bold text-hive-black">{pendingTrip.planned_distance} km</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleAcceptTrip(pendingTrip.id)}
                className="flex items-center gap-1.5 bg-success-green hover:bg-success-green/90 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Accept Shift
              </button>
              <button
                onClick={() => handleDeclineTrip(pendingTrip.id)}
                className="flex items-center gap-1.5 bg-white hover:bg-danger-red/10 border border-danger-red/20 text-danger-red font-bold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
                Decline Shift
              </button>
            </div>
          </div>
        )}

        {/* Live Route Telemetry */}
        <div className="space-y-3">
          <h2 className="text-lg font-extrabold text-hive-black">Active Route Navigation</h2>
          {activeTrip ? (
            <TelemetryMap
              activeTrips={[activeTrip]}
              onCompleteTrip={handleCompleteTripSimulated}
              simSpeed={simSpeed}
            />
          ) : (
            <div className="bg-white border border-honey-beige rounded-2xl p-12 text-center shadow-xs">
              <Truck className="w-12 h-12 text-honey-beige mx-auto mb-3" />
              <span className="block font-bold text-hive-black text-sm">No Active Trips Underway</span>
              <p className="text-text-secondary text-xs mt-1">Accept pending shifts above to initiate delivery tracking map.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. SAFETY OFFICER DASHBOARD VIEW
  // ==========================================
  if (user.role === 'SafetyOfficer') {
    // Calculations
    const avgSafetyScore = drivers.length > 0 
      ? Math.round(drivers.reduce((acc, curr) => acc + curr.safety_score, 0) / drivers.length)
      : 100;
      
    const licenseWarnings = complianceAlerts.license_alerts ? complianceAlerts.license_alerts.length : 0;
    const maintenanceWarnings = complianceAlerts.maintenance_alerts ? complianceAlerts.maintenance_alerts.length : 0;

    // High risk assets
    const highRiskVehicles = vehicles.filter(v => v.maintenance_risk === 'High' || v.status === 'InShop');
    const lowSafetyDrivers = drivers.filter(d => d.safety_score < 85);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-hive-black tracking-tight">Safety & Compliance</h1>
          <p className="text-text-secondary text-sm">Welcome, {user.name}. Audit safety scores, inspect license expirations, and monitor vehicle risks.</p>
        </div>

        {/* Safety KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-6 rounded-2xl border border-honey-beige shadow-premium">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Fleet Safety Average</span>
              <div className="w-9 h-9 rounded-xl bg-success-green/10 flex items-center justify-center text-success-green">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-hive-black">{avgSafetyScore} / 100</span>
              <span className="block text-[10px] text-text-secondary mt-1">Safety metric average across drivers</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-honey-beige shadow-premium">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">License Expiration Alerts</span>
              <div className="w-9 h-9 rounded-xl bg-danger-red/10 flex items-center justify-center text-danger-red">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-hive-black">{licenseWarnings} Alerts</span>
              <span className="block text-[10px] text-text-secondary mt-1">Licenses expiring or expired</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-honey-beige shadow-premium">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Maintenance Risks</span>
              <div className="w-9 h-9 rounded-xl bg-warning-orange/10 flex items-center justify-center text-warning-orange">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-hive-black">{maintenanceWarnings} Warnings</span>
              <span className="block text-[10px] text-text-secondary mt-1">Service schedule delays detected</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-honey-beige shadow-premium">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Active Operators</span>
              <div className="w-9 h-9 rounded-xl bg-hive-black/10 flex items-center justify-center text-hive-black">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-hive-black">{drivers.filter(d => d.status === 'OnTrip').length} Active</span>
              <span className="block text-[10px] text-text-secondary mt-1">Drivers currently on transit duty</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* High Risk Maintenance list */}
          <div className="bg-white p-5 rounded-2xl border border-honey-beige shadow-premium space-y-4">
            <h2 className="text-sm font-extrabold text-hive-black uppercase tracking-wider border-b border-honey-beige pb-2">High Risk Vehicles & In Shop</h2>
            <div className="space-y-2">
              {highRiskVehicles.length === 0 ? (
                <p className="text-xs text-text-secondary italic">No high risk vehicles detected.</p>
              ) : (
                highRiskVehicles.map(v => (
                  <div key={v.id} className="flex justify-between items-center p-3 bg-bg-warm border border-honey-beige rounded-xl text-xs">
                    <div>
                      <span className="block font-bold text-hive-black">{v.registration_number}</span>
                      <span className="block text-[10px] text-text-secondary">{v.name_model} ({v.type})</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${v.status === 'InShop' ? 'bg-danger-red/10 text-danger-red' : 'bg-warning-orange/15 text-warning-orange'}`}>
                      {v.status === 'InShop' ? 'In Shop' : 'High Risk'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Underperforming Driver Scores list */}
          <div className="bg-white p-5 rounded-2xl border border-honey-beige shadow-premium space-y-4">
            <h2 className="text-sm font-extrabold text-hive-black uppercase tracking-wider border-b border-honey-beige pb-2">Drivers Under Safety Threshold</h2>
            <div className="space-y-2">
              {lowSafetyDrivers.length === 0 ? (
                <p className="text-xs text-text-secondary italic">All drivers maintain safety scores above threshold (85).</p>
              ) : (
                lowSafetyDrivers.map(d => (
                  <div key={d.id} className="flex justify-between items-center p-3 bg-bg-warm border border-honey-beige rounded-xl text-xs">
                    <div>
                      <span className="block font-bold text-hive-black">{d.name}</span>
                      <span className="block text-[10px] text-text-secondary">License: {d.license_number}</span>
                    </div>
                    <span className="bg-danger-red/15 text-danger-red font-bold px-2 py-0.5 rounded-full text-[9px]">
                      Score: {d.safety_score}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 3. FINANCIAL ANALYST DASHBOARD VIEW
  // ==========================================
  if (user.role === 'FinancialAnalyst') {
    // Cost Calculations
    const fuelCostTotal = fuelLogs.reduce((acc, curr) => acc + (curr.cost || 0), 0);
    const maintenanceCostTotal = maintenance.reduce((acc, curr) => acc + (curr.status === 'Closed' ? (curr.cost || 0) : 0), 0);
    const extraExpensesTotal = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const totalOpsExpense = fuelCostTotal + maintenanceCostTotal + extraExpensesTotal;

    // Build chart data: Group expenses by month or type
    // Since we want dynamic charting, let's map recent expenses to an array
    const chartData = [
      { name: 'Fuel Costs', cost: fuelCostTotal },
      { name: 'Maintenance', cost: maintenanceCostTotal },
      { name: 'Extra Ops', cost: extraExpensesTotal }
    ];

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-hive-black tracking-tight">Financial Intelligence</h1>
          <p className="text-text-secondary text-sm">Welcome, {user.name}. Audit operating overheads, fleet fuel logs, and overall cost distributions.</p>
        </div>

        {/* Finance KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-6 rounded-2xl border border-honey-beige shadow-premium">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Operating Overhead</span>
              <div className="w-9 h-9 rounded-xl bg-honey-gold/10 flex items-center justify-center text-honey-dark">
                <Coins className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-hive-black">₹{totalOpsExpense.toLocaleString()}</span>
              <span className="block text-[10px] text-text-secondary mt-1">Total operating expenses logged</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-honey-beige shadow-premium">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Fuel Overheads</span>
              <div className="w-9 h-9 rounded-xl bg-success-green/10 flex items-center justify-center text-success-green">
                <BadgeDollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-hive-black">₹{fuelCostTotal.toLocaleString()}</span>
              <span className="block text-[10px] text-text-secondary mt-1">Sourced from active fuel logs</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-honey-beige shadow-premium">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Maintenance Bills</span>
              <div className="w-9 h-9 rounded-xl bg-warning-orange/10 flex items-center justify-center text-warning-orange">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-hive-black">₹{maintenanceCostTotal.toLocaleString()}</span>
              <span className="block text-[10px] text-text-secondary mt-1">Closed maintenance scheduling cost</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-honey-beige shadow-premium">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Analytical Exporters</span>
              <div className="w-9 h-9 rounded-xl bg-hive-black/10 flex items-center justify-center text-hive-black">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-hive-black">{expenses.length} Records</span>
              <span className="block text-[10px] text-text-secondary mt-1">Ledger items registered</span>
            </div>
          </div>
        </div>

        {/* Expenses Distribution Visual Area Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-honey-beige shadow-premium space-y-4">
            <h3 className="text-sm font-extrabold text-hive-black uppercase tracking-wider border-b border-honey-beige pb-2">Cost Breakdown Overview</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F5A623" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#F5A623" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#6B6259" fontSize={10} />
                  <YAxis stroke="#6B6259" fontSize={10} />
                  <Tooltip />
                  <Area type="monotone" dataKey="cost" stroke="#C97A1A" fillOpacity={1} fill="url(#colorCost)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expense Ledger list */}
          <div className="bg-white p-5 rounded-2xl border border-honey-beige shadow-premium space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-hive-black uppercase tracking-wider border-b border-honey-beige pb-2">Recent Fleet Expenses</h3>
              <div className="space-y-2 mt-3 max-h-[180px] overflow-y-auto pr-1">
                {expenses.length === 0 ? (
                  <p className="text-xs text-text-secondary italic">No expenses recorded yet.</p>
                ) : (
                  expenses.slice(0, 4).map(e => (
                    <div key={e.id} className="flex justify-between items-center text-xs p-2 bg-bg-warm border border-honey-beige rounded-lg">
                      <span className="font-bold text-hive-black">{e.type}</span>
                      <span className="text-honey-dark font-extrabold">₹{e.amount}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="text-[10px] text-text-secondary italic mt-4 text-center border-t border-honey-beige/60 pt-3">
              Go to the <strong className="text-hive-black">Expenses</strong> tab to record new ledger transactions or export financial CSV logs.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 4. FLEET MANAGER DASHBOARD VIEW
  // ==========================================
  const filteredVehicles = vehicles.filter(v => {
    const matchType = filterType ? v.type.toLowerCase() === filterType.toLowerCase() : true;
    const matchRegion = filterRegion ? v.region.toLowerCase() === filterRegion.toLowerCase() : true;
    return matchType && matchRegion;
  });

  const totalVehiclesCount = filteredVehicles.length;
  const activeVehiclesCount = filteredVehicles.filter(v => v.status === 'OnTrip').length;
  const availableVehiclesCount = filteredVehicles.filter(v => v.status === 'Available').length;
  const maintenanceVehiclesCount = filteredVehicles.filter(v => v.status === 'InShop').length;
  
  const filteredVehicleIds = new Set(filteredVehicles.map(v => v.id));
  const filteredTrips = trips.filter(t => filteredVehicleIds.has(t.vehicle_id));

  const activeTripsCount = filteredTrips.filter(t => t.status === 'Dispatched').length;
  const pendingTripsCount = filteredTrips.filter(t => t.status === 'Draft' || t.status === 'Assigned').length;
  const driversOnDutyCount = drivers.filter(d => ['Available', 'OnTrip', 'Reserved'].includes(d.status)).length;

  const fleetUtilization = totalVehiclesCount > 0 
    ? Math.round((activeVehiclesCount / totalVehiclesCount) * 100) 
    : 0;

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
            <span className="text-xl font-extrabold text-hive-black">{pendingTripsCount} Trips</span>
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
