import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Plus, Check, Play, Ban, X, AlertTriangle, HelpCircle } from 'lucide-react';

export default function Trips({ user }) {
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  // Filter
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState(null);

  // Match Suggestions State
  const [matchSuggestions, setMatchSuggestions] = useState(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Form States
  const [createFormData, setCreateFormData] = useState({
    source: '',
    destination: '',
    vehicle_id: '',
    driver_id: '',
    cargo_weight: '',
    planned_distance: ''
  });

  const [completeFormData, setCompleteFormData] = useState({
    actual_distance: '',
    fuel_consumed: ''
  });

  const [error, setError] = useState('');
  const [completeError, setCompleteError] = useState('');

  const isDriverRole = user.role === 'Driver';
  const isReadOnly = ['FinancialAnalyst', 'SafetyOfficer'].includes(user.role);

  const loadData = async () => {
    try {
      const tList = await api.trips.list();
      const vList = await api.vehicles.list();
      const dList = await api.drivers.list();
      
      setVehicles(vList);
      setDrivers(dList);

      // If logged in as Driver, restrict trips to those assigned to "Dan Driver" (id or name match)
      if (isDriverRole) {
        // Find Dan Driver id
        const driverObj = dList.find(d => d.name.toLowerCase().includes('driver') || d.name.toLowerCase().includes(user.name.toLowerCase()));
        if (driverObj) {
          setTrips(tList.filter(t => t.driver_id === driverObj.id));
        } else {
          setTrips([]);
        }
      } else {
        setTrips(tList);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Debounced fetch of match suggestions when cargo weight changes
  useEffect(() => {
    const weightNum = Number(createFormData.cargo_weight);
    if (!isCreateModalOpen || isNaN(weightNum) || weightNum <= 0) {
      setMatchSuggestions(null);
      return;
    }

    const fetchSuggestions = async () => {
      setLoadingSuggestions(true);
      try {
        const data = await api.trips.matchSuggestions(weightNum);
        setMatchSuggestions(data);
        
        // Auto-select top recommendation if none is selected or current selection is invalid
        if (data.vehicles?.length > 0) {
          const isCurrentVehicleValid = data.vehicles.some(v => v.id === createFormData.vehicle_id);
          if (!createFormData.vehicle_id || !isCurrentVehicleValid) {
            setCreateFormData(prev => ({ ...prev, vehicle_id: data.vehicles[0].id }));
          }
        } else {
          setCreateFormData(prev => ({ ...prev, vehicle_id: '' }));
        }

        if (data.drivers?.length > 0) {
          const isCurrentDriverValid = data.drivers.some(d => d.id === createFormData.driver_id);
          if (!createFormData.driver_id || !isCurrentDriverValid) {
            setCreateFormData(prev => ({ ...prev, driver_id: data.drivers[0].id }));
          }
        } else {
          setCreateFormData(prev => ({ ...prev, driver_id: '' }));
        }
      } catch (err) {
        console.error('Failed to load match suggestions:', err);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    const timer = setTimeout(fetchSuggestions, 450);
    return () => clearTimeout(timer);
  }, [createFormData.cargo_weight, isCreateModalOpen]);

  // Filter available vehicles and drivers for trip assignment
  const eligibleVehicles = vehicles.filter(v => v.status === 'Available');
  const eligibleDrivers = drivers.filter(d => {
    const isAvailable = d.status === 'Available';
    const isSuspended = d.status === 'Suspended';
    const isExpired = new Date(d.license_expiry_date) < new Date();
    return isAvailable && !isSuspended && !isExpired;
  });

  const handleOpenCreateModal = () => {
    setError('');
    setMatchSuggestions(null);
    setCreateFormData({
      source: '',
      destination: '',
      vehicle_id: eligibleVehicles[0]?.id || '',
      driver_id: eligibleDrivers[0]?.id || '',
      cargo_weight: '',
      planned_distance: ''
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.trips.create(createFormData);
      setIsCreateModalOpen(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDispatch = async (tripId) => {
    if (!window.confirm('Dispatch this trip now? Both vehicle and driver statuses will change to OnTrip.')) return;
    try {
      await api.trips.dispatch(tripId);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenCompleteModal = (tripId) => {
    setSelectedTripId(tripId);
    setCompleteError('');
    setCompleteFormData({
      actual_distance: '',
      fuel_consumed: ''
    });
    setIsCompleteModalOpen(true);
  };

  const handleCompleteTrip = async (e) => {
    e.preventDefault();
    setCompleteError('');
    try {
      await api.trips.complete(selectedTripId, completeFormData);
      setIsCompleteModalOpen(false);
      loadData();
    } catch (err) {
      setCompleteError(err.message);
    }
  };

  const handleCancel = async (tripId) => {
    if (!window.confirm('Are you sure you want to cancel this trip?')) return;
    try {
      await api.trips.cancel(tripId);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const getStatusBadge = (status) => {
    let classes = '';
    switch (status) {
      case 'Draft':
        classes = 'bg-gray-100 text-text-secondary border-gray-200';
        break;
      case 'Dispatched':
        classes = 'bg-honey-gold/15 text-honey-dark border-honey-gold/20';
        break;
      case 'Completed':
        classes = 'bg-success-green/10 text-success-green border-success-green/20';
        break;
      case 'Cancelled':
        classes = 'bg-danger-red/10 text-danger-red border-danger-red/20';
        break;
      default:
        classes = 'bg-gray-100 text-gray-500 border-gray-200';
    }
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${classes}`}>{status}</span>;
  };

  const filteredTrips = trips.filter(t => {
    if (statusFilter) return t.status === statusFilter;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-hive-black tracking-tight">
            {isDriverRole ? 'My Assigned Shifts' : 'Trip Coordination'}
          </h1>
          <p className="text-text-secondary text-sm">
            {isDriverRole 
              ? 'View and log completions for your active fleet deliveries.' 
              : 'Dispatch vehicles, assign drivers, and monitor payload metrics.'}
          </p>
        </div>

        {!isDriverRole && !isReadOnly && (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-honey-gold hover:bg-honey-dark text-hive-black font-bold px-4 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Draft Trip</span>
          </button>
        )}
      </div>

      {/* Filter Options */}
      <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-honey-beige shadow-premium w-fit text-xs">
        <span className="font-bold text-text-secondary uppercase text-[10px] tracking-wider px-2">Status:</span>
        <button
          onClick={() => setStatusFilter('')}
          className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${!statusFilter ? 'bg-honey-gold text-hive-black' : 'hover:bg-bg-warm text-text-secondary'}`}
        >
          All
        </button>
        <button
          onClick={() => setStatusFilter('Draft')}
          className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${statusFilter === 'Draft' ? 'bg-honey-gold text-hive-black' : 'hover:bg-bg-warm text-text-secondary'}`}
        >
          Drafts
        </button>
        <button
          onClick={() => setStatusFilter('Dispatched')}
          className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${statusFilter === 'Dispatched' ? 'bg-honey-gold text-hive-black' : 'hover:bg-bg-warm text-text-secondary'}`}
        >
          Dispatched
        </button>
        <button
          onClick={() => setStatusFilter('Completed')}
          className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${statusFilter === 'Completed' ? 'bg-honey-gold text-hive-black' : 'hover:bg-bg-warm text-text-secondary'}`}
        >
          Completed
        </button>
        <button
          onClick={() => setStatusFilter('Cancelled')}
          className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${statusFilter === 'Cancelled' ? 'bg-honey-gold text-hive-black' : 'hover:bg-bg-warm text-text-secondary'}`}
        >
          Cancelled
        </button>
      </div>

      {/* Trips list */}
      <div className="bg-white rounded-2xl border border-honey-beige shadow-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-bg-warm border-b border-honey-beige text-text-secondary font-bold">
                <th className="p-4">Route</th>
                <th className="p-4">Vehicle</th>
                <th className="p-4">Driver</th>
                <th className="p-4">Cargo Weight</th>
                <th className="p-4">Planned Distance</th>
                <th className="p-4">Actual Specs</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-honey-beige">
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-text-secondary">
                    No active trips scheduled.
                  </td>
                </tr>
              ) : (
                filteredTrips.map((t) => {
                  const vehicleObj = vehicles.find(v => v.id === t.vehicle_id);
                  const driverObj = drivers.find(d => d.id === t.driver_id);
                  return (
                    <tr key={t.id} className="hover:bg-bg-warm/40 transition-colors">
                      <td className="p-4">
                        <span className="block font-bold text-hive-black">{t.source}</span>
                        <span className="block text-[10px] text-text-secondary mt-0.5">&rarr; {t.destination}</span>
                      </td>
                      <td className="p-4">
                        <span className="block font-bold text-hive-black">{vehicleObj?.registration_number || 'Unknown'}</span>
                        <span className="block text-[10px] text-text-secondary mt-0.5">{vehicleObj?.name_model || ''}</span>
                      </td>
                      <td className="p-4">
                        <span className="block font-bold text-hive-black">{driverObj?.name || 'Unknown'}</span>
                        <span className="block text-[10px] text-text-secondary mt-0.5">{driverObj?.license_category || ''}</span>
                      </td>
                      <td className="p-4 font-medium">{t.cargo_weight.toLocaleString()} kg</td>
                      <td className="p-4 font-medium">{t.planned_distance.toLocaleString()} km</td>
                      <td className="p-4">
                        {t.status === 'Completed' ? (
                          <div className="space-y-0.5">
                            <span className="block font-medium">Distance: {t.actual_distance} km</span>
                            <span className="block text-[10px] text-text-secondary">Fuel: {t.fuel_consumed} L</span>
                          </div>
                        ) : (
                          <span className="text-text-secondary/50 italic">N/A</span>
                        )}
                      </td>
                      <td className="p-4">{getStatusBadge(t.status)}</td>
                      <td className="p-4 text-right space-x-2">
                        {/* Driver Operations */}
                        {isDriverRole && t.status === 'Dispatched' && (
                          <button
                            onClick={() => handleOpenCompleteModal(t.id)}
                            className="flex items-center gap-1 bg-success-green hover:bg-success-green/90 text-white font-bold px-2.5 py-1.5 rounded-lg text-[10px] transition-all cursor-pointer ml-auto"
                          >
                            <Check className="w-3 h-3" />
                            <span>Complete Shift</span>
                          </button>
                        )}

                        {/* Coordinator Operations */}
                        {!isDriverRole && !isReadOnly && (
                          <div className="flex justify-end gap-2">
                            {t.status === 'Draft' && (
                              <button
                                onClick={() => handleDispatch(t.id)}
                                className="flex items-center gap-1 bg-honey-gold hover:bg-honey-dark text-hive-black font-bold px-2 py-1 rounded-lg text-[10px] transition-all cursor-pointer"
                                title="Dispatch Trip"
                              >
                                <Play className="w-3 h-3" />
                                <span>Dispatch</span>
                              </button>
                            )}
                            {t.status === 'Dispatched' && (
                              <button
                                onClick={() => handleOpenCompleteModal(t.id)}
                                className="flex items-center gap-1 bg-success-green hover:bg-success-green/90 text-white font-bold px-2 py-1 rounded-lg text-[10px] transition-all cursor-pointer"
                                title="Complete Trip"
                              >
                                <Check className="w-3 h-3" />
                                <span>Complete</span>
                              </button>
                            )}
                            {['Draft', 'Dispatched'].includes(t.status) && (
                              <button
                                onClick={() => handleCancel(t.id)}
                                className="flex items-center gap-1 bg-white hover:bg-danger-red/10 border border-danger-red/20 text-danger-red font-semibold px-2 py-1 rounded-lg text-[10px] transition-all cursor-pointer"
                                title="Cancel Trip"
                              >
                                <Ban className="w-3 h-3" />
                                <span>Cancel</span>
                              </button>
                            )}
                          </div>
                        )}
                        {isReadOnly && <span className="text-[10px] text-text-secondary/40 italic">View Only</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Trip Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-hive-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-honey-beige shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-honey-beige flex items-center justify-between bg-bg-warm">
              <h3 className="font-extrabold text-lg text-hive-black">Create Fleet Trip</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-text-secondary hover:text-hive-black transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTrip} className="p-6 overflow-y-auto space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-danger-red/10 border border-danger-red/20 rounded-xl text-danger-red font-medium flex items-start gap-2 animate-shake">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Source Hub *</label>
                  <input
                    type="text"
                    value={createFormData.source}
                    onChange={(e) => setCreateFormData({ ...createFormData, source: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold"
                    placeholder="e.g. Mumbai Logistics Park"
                    required
                  />
                </div>

                <div>
                  <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Destination Hub *</label>
                  <input
                    type="text"
                    value={createFormData.destination}
                    onChange={(e) => setCreateFormData({ ...createFormData, destination: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold"
                    placeholder="e.g. Pune Depot"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Assign Vehicle *</label>
                {matchSuggestions ? (
                  matchSuggestions.vehicles.length === 0 ? (
                    <div className="p-3 bg-danger-red/10 border border-danger-red/20 rounded-lg text-danger-red font-semibold">
                      No vehicles are large enough to carry this payload weight ({createFormData.cargo_weight}kg).
                    </div>
                  ) : (
                    <select
                      value={createFormData.vehicle_id}
                      onChange={(e) => setCreateFormData({ ...createFormData, vehicle_id: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold font-semibold text-hive-black border-l-3 border-honey-gold"
                      required
                    >
                      {matchSuggestions.vehicles.map((v, index) => (
                        <option key={v.id} value={v.id}>
                          {index === 0 ? '🏆 [Optimal Fit] ' : ''}{v.registration_number.toUpperCase()} - {v.name_model} (Cap: {v.max_load_capacity}kg, Risk: {v.maintenance_risk})
                        </option>
                      ))}
                    </select>
                  )
                ) : eligibleVehicles.length === 0 ? (
                  <div className="p-3 bg-warning-orange/10 border border-warning-orange/20 rounded-lg text-warning-orange font-semibold">
                    No available vehicles in fleet. Open maintenance tasks or wait for trip completions.
                  </div>
                ) : (
                  <select
                    value={createFormData.vehicle_id}
                    onChange={(e) => setCreateFormData({ ...createFormData, vehicle_id: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold font-semibold text-hive-black"
                    required
                  >
                    {eligibleVehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.registration_number.toUpperCase()} - {v.name_model} (Max Cap: {v.max_load_capacity}kg)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Assign Eligible Driver *</label>
                {matchSuggestions ? (
                  matchSuggestions.drivers.length === 0 ? (
                    <div className="p-3 bg-danger-red/10 border border-danger-red/20 rounded-lg text-danger-red font-semibold">
                      No drivers are currently available for assignment.
                    </div>
                  ) : (
                    <select
                      value={createFormData.driver_id}
                      onChange={(e) => setCreateFormData({ ...createFormData, driver_id: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold font-semibold text-hive-black border-l-3 border-honey-gold"
                      required
                    >
                      {matchSuggestions.drivers.map((d, index) => (
                        <option key={d.id} value={d.id}>
                          {index === 0 ? '⭐ [Best Safety Score] ' : ''}{d.name} (Score: {d.safety_score}/100)
                        </option>
                      ))}
                    </select>
                  )
                ) : eligibleDrivers.length === 0 ? (
                  <div className="p-3 bg-warning-orange/10 border border-warning-orange/20 rounded-lg text-warning-orange font-semibold">
                    No eligible drivers are currently available. Check status and license expiries.
                  </div>
                ) : (
                  <select
                    value={createFormData.driver_id}
                    onChange={(e) => setCreateFormData({ ...createFormData, driver_id: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold font-semibold text-hive-black"
                    required
                  >
                    {eligibleDrivers.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.license_category}) - Score: {d.safety_score}/100
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Cargo Payload Weight (kg) *</label>
                  <input
                    type="number"
                    value={createFormData.cargo_weight}
                    onChange={(e) => setCreateFormData({ ...createFormData, cargo_weight: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold"
                    placeholder="e.g. 500"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Planned Distance (km) *</label>
                  <input
                    type="number"
                    value={createFormData.planned_distance}
                    onChange={(e) => setCreateFormData({ ...createFormData, planned_distance: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold"
                    placeholder="e.g. 350"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-honey-beige">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-honey-beige hover:bg-bg-warm rounded-lg font-bold text-text-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={eligibleVehicles.length === 0 || eligibleDrivers.length === 0}
                  className="px-4 py-2 bg-honey-gold hover:bg-honey-dark text-hive-black rounded-lg font-bold shadow-md disabled:opacity-50 cursor-pointer"
                >
                  Save Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Trip Modal */}
      {isCompleteModalOpen && (
        <div className="fixed inset-0 bg-hive-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl border border-honey-beige shadow-lg overflow-hidden flex flex-col">
            <div className="p-5 border-b border-honey-beige flex items-center justify-between bg-bg-warm">
              <h3 className="font-extrabold text-lg text-hive-black">Log Trip Completion</h3>
              <button onClick={() => setIsCompleteModalOpen(false)} className="text-text-secondary hover:text-hive-black transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteTrip} className="p-6 space-y-4 text-xs">
              {completeError && (
                <div className="p-3 bg-danger-red/10 border border-danger-red/20 rounded-xl text-danger-red font-medium flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{completeError}</span>
                </div>
              )}

              <div>
                <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Actual Distance Travelled (km) *</label>
                <input
                  type="number"
                  value={completeFormData.actual_distance}
                  onChange={(e) => setCompleteFormData({ ...completeFormData, actual_distance: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold"
                  placeholder="e.g. 355"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Fuel Consumed (Liters) *</label>
                <input
                  type="number"
                  value={completeFormData.fuel_consumed}
                  onChange={(e) => setCompleteFormData({ ...completeFormData, fuel_consumed: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold"
                  placeholder="e.g. 30"
                  min="0"
                  required
                />
                <span className="block text-[10px] text-text-secondary mt-1">Completing will automatically record a fuel log entry for this vehicle.</span>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-honey-beige text-right">
                <button
                  type="button"
                  onClick={() => setIsCompleteModalOpen(false)}
                  className="px-4 py-2 border border-honey-beige hover:bg-bg-warm rounded-lg font-bold text-text-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-success-green hover:bg-success-green/90 text-white rounded-lg font-bold shadow-md cursor-pointer"
                >
                  Complete Trip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
