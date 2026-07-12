import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Plus, Check, X, AlertCircle } from 'lucide-react';

export default function Maintenance({ user }) {
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_id: '',
    type: 'Oil Change',
    description: '',
    cost: ''
  });
  const [error, setError] = useState('');

  const isReadOnly = ['FinancialAnalyst', 'SafetyOfficer', 'Driver'].includes(user.role);

  const loadData = async () => {
    try {
      const logList = await api.maintenance.list();
      const vehicleList = await api.vehicles.list();
      setLogs(logList);
      setVehicles(vehicleList);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter available vehicles (Available or OnTrip can go to shop, but Retired cannot)
  const eligibleVehicles = vehicles.filter(v => v.status !== 'Retired');

  const handleOpenModal = () => {
    setError('');
    setFormData({
      vehicle_id: eligibleVehicles[0]?.id || '',
      type: 'Oil Change',
      description: '',
      cost: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.maintenance.create(formData);
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCloseTicket = async (id) => {
    if (!window.confirm('Mark this maintenance ticket as Closed? The vehicle will return to Available status.')) return;
    try {
      await api.maintenance.close(id);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const getStatusBadge = (status) => {
    let classes = '';
    switch (status) {
      case 'Open':
        classes = 'bg-warning-orange/10 text-warning-orange border-warning-orange/20';
        break;
      case 'Closed':
        classes = 'bg-success-green/10 text-success-green border-success-green/20';
        break;
      default:
        classes = 'bg-gray-100 text-gray-500 border-gray-200';
    }
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${classes}`}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-hive-black tracking-tight">Maintenance Logs</h1>
          <p className="text-text-secondary text-sm">Schedule repairs, track maintenance expenses, and update shop status.</p>
        </div>

        {!isReadOnly && (
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 bg-honey-gold hover:bg-honey-dark text-hive-black font-bold px-4 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Open Ticket</span>
          </button>
        )}
      </div>

      {/* Maintenance Logs List */}
      <div className="bg-white rounded-2xl border border-honey-beige shadow-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-bg-warm border-b border-honey-beige text-text-secondary font-bold">
                <th className="p-4">Vehicle</th>
                <th className="p-4">Service Type</th>
                <th className="p-4">Description</th>
                <th className="p-4">Cost</th>
                <th className="p-4">Opened Date</th>
                <th className="p-4">Closed Date</th>
                <th className="p-4">Status</th>
                {!isReadOnly && <th className="p-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-honey-beige">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={isReadOnly ? 7 : 8} className="p-8 text-center text-text-secondary">
                    No maintenance records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const vehicleObj = vehicles.find(v => v.id === log.vehicle_id);
                  return (
                    <tr key={log.id} className="hover:bg-bg-warm/40 transition-colors">
                      <td className="p-4">
                        <span className="block font-bold text-hive-black">{vehicleObj?.registration_number || 'Unknown'}</span>
                        <span className="block text-[10px] text-text-secondary mt-0.5">{vehicleObj?.name_model || ''}</span>
                      </td>
                      <td className="p-4 font-bold text-hive-black">{log.type}</td>
                      <td className="p-4 text-text-secondary max-w-xs truncate" title={log.description}>{log.description}</td>
                      <td className="p-4 font-semibold">₹{log.cost.toLocaleString()}</td>
                      <td className="p-4 text-text-secondary">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="p-4 text-text-secondary">
                        {log.closed_at ? new Date(log.closed_at).toLocaleString() : <span className="italic text-text-secondary/40">In Progress</span>}
                      </td>
                      <td className="p-4">{getStatusBadge(log.status)}</td>
                      {!isReadOnly && (
                        <td className="p-4 text-right">
                          {log.status === 'Open' && (
                            <button
                              onClick={() => handleCloseTicket(log.id)}
                              className="flex items-center gap-1 bg-success-green hover:bg-success-green/90 text-white font-bold px-2.5 py-1.5 rounded-lg text-[10px] transition-all cursor-pointer ml-auto"
                            >
                              <Check className="w-3 h-3" />
                              <span>Close Ticket</span>
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Open Maintenance Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-hive-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl border border-honey-beige shadow-lg overflow-hidden flex flex-col">
            <div className="p-5 border-b border-honey-beige flex items-center justify-between bg-bg-warm">
              <h3 className="font-extrabold text-lg text-hive-black">Open Maintenance Ticket</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-hive-black transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-danger-red/10 border border-danger-red/20 rounded-xl text-danger-red font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Select Vehicle *</label>
                {eligibleVehicles.length === 0 ? (
                  <div className="p-3 bg-warning-orange/10 border border-warning-orange/20 rounded-lg text-warning-orange font-semibold">
                    No active vehicles found in registry. Add a vehicle first.
                  </div>
                ) : (
                  <select
                    value={formData.vehicle_id}
                    onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold font-semibold text-hive-black"
                    required
                  >
                    {eligibleVehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.registration_number} - {v.name_model} ({v.status})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Service Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold font-semibold"
                  required
                >
                  <option value="Oil Change">Oil Change</option>
                  <option value="Tire Rotation">Tire Rotation</option>
                  <option value="Brake Repair">Brake Repair</option>
                  <option value="Engine Diagnostics">Engine Diagnostics</option>
                  <option value="Transmission Service">Transmission Service</option>
                  <option value="Body Work">Body Work</option>
                  <option value="Scheduled Maintenance">Scheduled Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Estimated Cost (₹) *</label>
                <input
                  type="number"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold font-semibold"
                  placeholder="e.g. 2000"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Detailed Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold h-20"
                  placeholder="Describe repair requirements..."
                  required
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-honey-beige">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-honey-beige hover:bg-bg-warm rounded-lg font-bold text-text-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={eligibleVehicles.length === 0}
                  className="px-4 py-2 bg-honey-gold hover:bg-honey-dark text-hive-black rounded-lg font-bold shadow-md cursor-pointer"
                >
                  Open Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
