import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download as DownloadIcon, Info as InfoIcon, Landmark } from 'lucide-react';

export default function Reports({ user }) {
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);

  const loadData = async () => {
    try {
      const vList = await api.vehicles.list();
      const tList = await api.trips.list();
      const mList = await api.maintenance.list();
      const fList = await api.fuel.list();
      const eList = await api.expenses.list();

      setVehicles(vList);
      setTrips(tList);
      setMaintenance(mList);
      setFuelLogs(fList);
      setExpenses(eList);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute metrics per vehicle
  const reportData = vehicles.map(vehicle => {
    // 1. Filter associated records
    const vehicleTrips = trips.filter(t => t.vehicle_id === vehicle.id && t.status === 'Completed');
    const vehicleFuel = fuelLogs.filter(f => f.vehicle_id === vehicle.id);
    const vehicleMaint = maintenance.filter(m => m.vehicle_id === vehicle.id);
    const vehicleExp = expenses.filter(e => e.vehicle_id === vehicle.id);

    // 2. Sums
    const totalDistance = vehicleTrips.reduce((sum, t) => sum + Number(t.actual_distance || 0), 0);
    const totalFuelLiters = vehicleTrips.reduce((sum, t) => sum + Number(t.fuel_consumed || 0), 0) + 
                             vehicleFuel.reduce((sum, f) => sum + Number(f.liters || 0), 0);

    const fuelCost = vehicleFuel.reduce((sum, f) => sum + Number(f.cost || 0), 0);
    const maintenanceCost = vehicleMaint.reduce((sum, m) => sum + Number(m.cost || 0), 0);
    const generalExpenses = vehicleExp.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    // Formula for Revenue: distance * ₹15 + cargo_weight * ₹2
    const revenue = vehicleTrips.reduce((sum, t) => {
      const distRev = Number(t.actual_distance || 0) * 15;
      const weightRev = Number(t.cargo_weight || 0) * 2;
      return sum + distRev + weightRev;
    }, 0);

    // Total cost
    const totalOperationalCost = fuelCost + maintenanceCost + generalExpenses;

    // ROI: (Revenue - Total Operational Cost) / Acquisition Cost
    const roi = vehicle.acquisition_cost > 0 
      ? ((revenue - totalOperationalCost) / vehicle.acquisition_cost) * 100 
      : 0;

    // Fuel Efficiency (km/L)
    const fuelEfficiency = totalFuelLiters > 0 
      ? Number((totalDistance / totalFuelLiters).toFixed(2)) 
      : 0;

    return {
      id: vehicle.id,
      regNumber: vehicle.registration_number,
      model: vehicle.name_model,
      distance: totalDistance,
      fuelLiters: totalFuelLiters,
      fuelCost,
      maintenanceCost,
      generalExpenses,
      totalCost: totalOperationalCost,
      revenue,
      roi: Number(roi.toFixed(1)),
      fuelEfficiency
    };
  });

  const exportCSV = () => {
    if (reportData.length === 0) {
      alert('No data available to export.');
      return;
    }

    const headers = [
      'Registration Number',
      'Model & Make',
      'Total Distance (km)',
      'Total Fuel (Liters)',
      'Fuel Cost (₹)',
      'Maintenance Cost (₹)',
      'General Expenses (₹)',
      'Calculated Revenue (₹)',
      'Net Operational Cost (₹)',
      'Return on Investment (ROI %)'
    ];

    const csvRows = [
      headers.join(','), // Header row
      ...reportData.map(row => [
        `"${row.regNumber}"`,
        `"${row.model}"`,
        row.distance,
        row.fuelLiters,
        row.fuelCost.toFixed(2),
        row.maintenanceCost.toFixed(2),
        row.generalExpenses.toFixed(2),
        row.revenue.toFixed(2),
        row.totalCost.toFixed(2),
        `"${row.roi}%"`
      ].join(','))
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EgoFleat_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasData = reportData.some(r => r.distance > 0 || r.totalCost > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-hive-black tracking-tight">Reports & Fleet Analytics</h1>
          <p className="text-text-secondary text-sm">Review fuel efficiency, operational overhead, and asset ROI metrics.</p>
        </div>

        <button
          onClick={exportCSV}
          disabled={reportData.length === 0}
          className="flex items-center gap-2 bg-hive-black text-honey-gold border border-honey-gold/30 hover:bg-hive-black/90 font-bold px-4 py-2.5 rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer text-xs"
        >
          <DownloadIcon className="w-4 h-4" />
          <span>Export Fleet CSV</span>
        </button>
      </div>

      {/* Analytics Info Callout */}
      <div className="bg-white border border-honey-beige p-4 rounded-xl flex items-start gap-3 shadow-premium text-xs">
        <InfoIcon className="w-5 h-5 text-honey-dark shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-hive-black mb-0.5">ROI Calculation Business Rules</h3>
          <p className="text-text-secondary leading-relaxed">
            Revenue is simulated based on completed shipments: <span className="font-semibold text-hive-black">Distance Travelled &times; ₹15.00/km + Load Payload &times; ₹2.00/kg</span>.
            ROI represents the net returns (Revenue minus Fuel, Maintenance, and Miscellaneous Expenses) divided by the original vehicle acquisition cost.
          </p>
        </div>
      </div>

      {!hasData ? (
        <div className="bg-white rounded-2xl border border-honey-beige p-16 text-center shadow-premium space-y-3">
          <Landmark className="w-12 h-12 text-honey-gold mx-auto stroke-1" />
          <h3 className="text-lg font-bold text-hive-black">No Financial Data Logged</h3>
          <p className="text-text-secondary text-sm max-w-md mx-auto">
            Charts and financial ROI statements will generate dynamically once trips are completed and expenses/fuel refills are logged.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Fuel Efficiency */}
          <div className="bg-white p-6 rounded-2xl border border-honey-beige shadow-premium space-y-4">
            <div>
              <h3 className="font-bold text-sm text-hive-black uppercase tracking-wider">Fuel Efficiency (km/L)</h3>
              <p className="text-[10px] text-text-secondary">Higher values represent superior fuel economy</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0DFC4" vertical={false} />
                  <XAxis dataKey="regNumber" stroke="#6B6259" fontSize={10} tickLine={false} />
                  <YAxis stroke="#6B6259" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #F0DFC4', borderRadius: '12px', fontSize: '11px' }}
                    labelStyle={{ fontWeight: 'bold', color: '#1F1B16' }}
                  />
                  <Bar dataKey="fuelEfficiency" name="Avg km / L" fill="#F5A623" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Cost Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-honey-beige shadow-premium space-y-4">
            <div>
              <h3 className="font-bold text-sm text-hive-black uppercase tracking-wider">Operational Cost Breakdown (₹)</h3>
              <p className="text-[10px] text-text-secondary">Total costs broken down by category</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0DFC4" vertical={false} />
                  <XAxis dataKey="regNumber" stroke="#6B6259" fontSize={10} tickLine={false} />
                  <YAxis stroke="#6B6259" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #F0DFC4', borderRadius: '12px', fontSize: '11px' }}
                    labelStyle={{ fontWeight: 'bold', color: '#1F1B16' }}
                  />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  <Bar dataKey="fuelCost" name="Fuel (₹)" stackId="a" fill="#C97A1A" />
                  <Bar dataKey="maintenanceCost" name="Maintenance (₹)" stackId="a" fill="#F5A623" />
                  <Bar dataKey="generalExpenses" name="General (₹)" stackId="a" fill="#1F1B16" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: ROI Leaderboard */}
          <div className="bg-white p-6 rounded-2xl border border-honey-beige shadow-premium space-y-4 lg:col-span-2">
            <div>
              <h3 className="font-bold text-sm text-hive-black uppercase tracking-wider">Asset Return on Investment (ROI %)</h3>
              <p className="text-[10px] text-text-secondary">Calculated net margins relative to acquisition cost</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0DFC4" horizontal={false} />
                  <XAxis type="number" stroke="#6B6259" fontSize={10} tickLine={false} />
                  <YAxis dataKey="regNumber" type="category" stroke="#6B6259" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #F0DFC4', borderRadius: '12px', fontSize: '11px' }}
                    labelStyle={{ fontWeight: 'bold', color: '#1F1B16' }}
                  />
                  <Bar dataKey="roi" name="ROI %" fill="#2E9E5B" radius={[0, 4, 4, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
