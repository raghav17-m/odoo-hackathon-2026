import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Plus, Search, Edit2, Trash2, X, AlertCircle } from 'lucide-react';

export default function Vehicles({ user }) {
  const [vehicles, setVehicles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('registration_number');

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    registration_number: '',
    name_model: '',
    type: '',
    max_load_capacity: '',
    odometer: '',
    acquisition_cost: '',
    region: '',
    status: 'Available'
  });
  const [error, setError] = useState('');

  const isReadOnly = ['FinancialAnalyst', 'SafetyOfficer', 'Driver'].includes(user.role);

  const loadVehicles = async () => {
    try {
      const data = await api.vehicles.list();
      setVehicles(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      registration_number: '',
      name_model: '',
      type: 'Truck',
      max_load_capacity: '',
      odometer: '',
      acquisition_cost: '',
      region: '',
      status: 'Available'
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (vehicle) => {
    setEditingId(vehicle.id);
    setFormData({
      registration_number: vehicle.registration_number,
      name_model: vehicle.name_model,
      type: vehicle.type,
      max_load_capacity: vehicle.max_load_capacity,
      odometer: vehicle.odometer,
      acquisition_cost: vehicle.acquisition_cost,
      region: vehicle.region,
      status: vehicle.status
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.vehicles.update(editingId, formData);
      } else {
        await api.vehicles.create(formData);
      }
      setIsModalOpen(false);
      loadVehicles();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) return;
    try {
      await api.vehicles.delete(id);
      loadVehicles();
    } catch (err) {
      alert(err.message);
    }
  };

  // Filter & Sort Logic
  const filtered = vehicles
    .filter(v => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = v.registration_number.toLowerCase().includes(searchLower) ||
                            v.name_model.toLowerCase().includes(searchLower) ||
                            v.region.toLowerCase().includes(searchLower);
      const matchesType = typeFilter ? v.type === typeFilter : true;
      const matchesStatus = statusFilter ? v.status === statusFilter : true;
      return matchesSearch && matchesType && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'max_load_capacity' || sortBy === 'odometer' || sortBy === 'acquisition_cost') {
        return Number(b[sortBy]) - Number(a[sortBy]);
      }
      return String(a[sortBy]).localeCompare(String(b[sortBy]));
    });

  const getStatusBadge = (status) => {
    let classes = '';
    switch (status) {
      case 'Available':
        classes = 'bg-success-green/10 text-success-green border-success-green/20';
        break;
      case 'OnTrip':
        classes = 'bg-honey-gold/15 text-honey-dark border-honey-gold/20';
        break;
      case 'InShop':
        classes = 'bg-warning-orange/10 text-warning-orange border-warning-orange/20';
        break;
      case 'Retired':
        classes = 'bg-danger-red/10 text-danger-red border-danger-red/20';
        break;
      default:
        classes = 'bg-gray-100 text-gray-500 border-gray-200';
    }
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${classes}`}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-hive-black tracking-tight">Vehicle Registry</h1>
          <p className="text-text-secondary text-sm">Manage and monitor physical fleet configurations.</p>
        </div>

        {!isReadOnly && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-honey-gold hover:bg-honey-dark text-hive-black font-bold px-4 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vehicle</span>
          </button>
        )}
      </div>

      {/* Search and Filters Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-honey-beige shadow-premium">
        {/* Search */}
        <div className="relative col-span-1 sm:col-span-2">
          <Search className="absolute left-3 top-2.5 text-text-secondary w-4 h-4" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by reg number, model, region..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold"
          />
        </div>

        {/* Filters */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-xs bg-bg-warm border border-honey-beige rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-honey-gold"
        >
          <option value="">All Types</option>
          <option value="Truck">Truck</option>
          <option value="Van">Van</option>
          <option value="Semi">Semi</option>
          <option value="Flatbed">Flatbed</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs bg-bg-warm border border-honey-beige rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-honey-gold"
        >
          <option value="">All Statuses</option>
          <option value="Available">Available</option>
          <option value="OnTrip">On Trip</option>
          <option value="InShop">In Shop</option>
          <option value="Retired">Retired</option>
        </select>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-honey-beige shadow-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-bg-warm border-b border-honey-beige text-text-secondary font-bold">
                <th className="p-4 cursor-pointer hover:text-honey-dark" onClick={() => setSortBy('registration_number')}>Reg Number</th>
                <th className="p-4">Model & Make</th>
                <th className="p-4">Type</th>
                <th className="p-4 cursor-pointer hover:text-honey-dark" onClick={() => setSortBy('max_load_capacity')}>Max Capacity (kg)</th>
                <th className="p-4 cursor-pointer hover:text-honey-dark" onClick={() => setSortBy('odometer')}>Odometer (km)</th>
                <th className="p-4 cursor-pointer hover:text-honey-dark" onClick={() => setSortBy('acquisition_cost')}>Acquisition Cost</th>
                <th className="p-4">Region</th>
                <th className="p-4">Status</th>
                {!isReadOnly && <th className="p-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-honey-beige">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isReadOnly ? 8 : 9} className="p-8 text-center text-text-secondary">
                    No vehicles found matching filters.
                  </td>
                </tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-bg-warm/40 transition-colors">
                    <td className="p-4 font-bold text-hive-black">{v.registration_number}</td>
                    <td className="p-4 text-text-secondary">{v.name_model}</td>
                    <td className="p-4 text-text-secondary">{v.type}</td>
                    <td className="p-4 font-medium">{v.max_load_capacity.toLocaleString()} kg</td>
                    <td className="p-4 font-medium">{v.odometer.toLocaleString()} km</td>
                    <td className="p-4 font-medium">₹{v.acquisition_cost.toLocaleString()}</td>
                    <td className="p-4 text-text-secondary">{v.region}</td>
                    <td className="p-4">{getStatusBadge(v.status)}</td>
                    {!isReadOnly && (
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(v)}
                          className="p-1 hover:text-honey-dark text-text-secondary rounded transition-colors inline-block cursor-pointer"
                          title="Edit Vehicle"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(v.id)}
                          className="p-1 hover:text-danger-red text-text-secondary rounded transition-colors inline-block cursor-pointer"
                          title="Delete Vehicle"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-hive-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-honey-beige shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-honey-beige flex items-center justify-between bg-bg-warm">
              <h3 className="font-extrabold text-lg text-hive-black">
                {editingId ? 'Edit Vehicle Configuration' : 'Register New Vehicle'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-hive-black transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-danger-red/10 border border-danger-red/20 rounded-xl text-danger-red font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Registration Number *</label>
                  <input
                    type="text"
                    value={formData.registration_number}
                    onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm font-bold uppercase placeholder:normal-case placeholder:font-normal focus:outline-none focus:ring-1 focus:ring-honey-gold"
                    placeholder="e.g. MH-12-PQ-1234"
                    required
                  />
                </div>

                <div>
                  <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Model & Make *</label>
                  <input
                    type="text"
                    value={formData.name_model}
                    onChange={(e) => setFormData({ ...formData, name_model: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold"
                    placeholder="e.g. Ford F-550"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Vehicle Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold"
                    required
                  >
                    <option value="Truck">Truck</option>
                    <option value="Van">Van</option>
                    <option value="Semi">Semi</option>
                    <option value="Flatbed">Flatbed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Max Load Capacity (kg) *</label>
                  <input
                    type="number"
                    value={formData.max_load_capacity}
                    onChange={(e) => setFormData({ ...formData, max_load_capacity: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold"
                    placeholder="e.g. 15000"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Initial Odometer (km) *</label>
                  <input
                    type="number"
                    value={formData.odometer}
                    onChange={(e) => setFormData({ ...formData, odometer: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold"
                    placeholder="e.g. 45000"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Acquisition Cost (₹) *</label>
                  <input
                    type="number"
                    value={formData.acquisition_cost}
                    onChange={(e) => setFormData({ ...formData, acquisition_cost: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold"
                    placeholder="e.g. 1500000"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Operational Region *</label>
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold"
                    placeholder="e.g. Maharashtra"
                    required
                  />
                </div>

                {editingId && (
                  <div>
                    <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold"
                    >
                      <option value="Available">Available</option>
                      <option value="OnTrip">On Trip</option>
                      <option value="InShop">In Shop</option>
                      <option value="Retired">Retired</option>
                    </select>
                  </div>
                )}
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
                  className="px-4 py-2 bg-honey-gold hover:bg-honey-dark text-hive-black rounded-lg font-bold shadow-md cursor-pointer"
                >
                  {editingId ? 'Save Changes' : 'Register Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
