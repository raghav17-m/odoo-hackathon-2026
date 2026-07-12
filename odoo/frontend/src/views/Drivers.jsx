import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Plus, Search, Edit2, Trash2, X, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function Drivers({ user }) {
  const [drivers, setDrivers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    license_number: '',
    license_category: 'CDL-A',
    license_expiry_date: '',
    contact_number: '',
    safety_score: '100',
    status: 'Available'
  });
  const [error, setError] = useState('');

  const isReadOnly = ['FinancialAnalyst', 'Driver'].includes(user.role);
  const isSafetyOfficer = user.role === 'SafetyOfficer';

  const loadDrivers = async () => {
    try {
      const data = await api.drivers.list();
      setDrivers(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      license_number: '',
      license_category: 'CDL-A',
      license_expiry_date: '',
      contact_number: '',
      safety_score: '100',
      status: 'Available'
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (driver) => {
    setEditingId(driver.id);
    setFormData({
      name: driver.name,
      license_number: driver.license_number,
      license_category: driver.license_category,
      license_expiry_date: driver.license_expiry_date,
      contact_number: driver.contact_number,
      safety_score: driver.safety_score,
      status: driver.status
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.drivers.update(editingId, formData);
      } else {
        await api.drivers.create(formData);
      }
      setIsModalOpen(false);
      loadDrivers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this driver?')) return;
    try {
      await api.drivers.delete(id);
      loadDrivers();
    } catch (err) {
      alert(err.message);
    }
  };

  const isExpired = (expiryDate) => {
    return new Date(expiryDate) < new Date();
  };

  const isExpiringSoon = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30; // within 30 days
  };

  // Filter & Sort Logic
  const filtered = drivers
    .filter(d => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = d.name.toLowerCase().includes(searchLower) ||
                            d.license_number.toLowerCase().includes(searchLower) ||
                            d.contact_number.includes(searchTerm);
      const matchesStatus = statusFilter ? d.status === statusFilter : true;
      const matchesCategory = categoryFilter ? d.license_category === categoryFilter : true;
      return matchesSearch && matchesStatus && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'safety_score') {
        return Number(b.safety_score) - Number(a.safety_score);
      }
      if (sortBy === 'license_expiry_date') {
        return new Date(a.license_expiry_date) - new Date(b.license_expiry_date);
      }
      return String(a[sortBy]).localeCompare(String(b[sortBy]));
    });

  const getStatusBadge = (driver) => {
    const expired = isExpired(driver.license_expiry_date);
    if (expired) {
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-danger-red/10 text-danger-red border-danger-red/20">License Expired</span>;
    }

    let classes = '';
    switch (driver.status) {
      case 'Available':
        classes = 'bg-success-green/10 text-success-green border-success-green/20';
        break;
      case 'OnTrip':
        classes = 'bg-honey-gold/15 text-honey-dark border-honey-gold/20';
        break;
      case 'OffDuty':
        classes = 'bg-gray-100 text-text-secondary border-gray-200';
        break;
      case 'Suspended':
        classes = 'bg-danger-red/10 text-danger-red border-danger-red/20';
        break;
      default:
        classes = 'bg-gray-100 text-gray-500 border-gray-200';
    }
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${classes}`}>{driver.status}</span>;
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-hive-black tracking-tight">Driver Registry</h1>
          <p className="text-text-secondary text-sm">
            {isSafetyOfficer 
              ? 'Safety Compliance: Review driver safety records, license states, and compliance status.' 
              : 'Register and monitor driver shifts, licenses, and safety scores.'}
          </p>
        </div>

        {!isReadOnly && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-honey-gold hover:bg-honey-dark text-hive-black font-bold px-4 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register Driver</span>
          </button>
        )}
      </div>

      {/* Compliance Overview for Safety Officers */}
      {isSafetyOfficer && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-warning-orange/5 border border-honey-beige p-5 rounded-2xl shadow-premium">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-danger-red/15 text-danger-red flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-hive-black">Expired/Suspended Alerts</h3>
              <p className="text-text-secondary text-xs mt-0.5">
                Total Suspended/Expired: {drivers.filter(d => d.status === 'Suspended' || isExpired(d.license_expiry_date)).length}
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-honey-gold/20 text-honey-dark flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-hive-black">License Expiring in 30 Days</h3>
              <p className="text-text-secondary text-xs mt-0.5">
                Action Required: {drivers.filter(d => isExpiringSoon(d.license_expiry_date)).length} drivers
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-honey-beige shadow-premium">
        {/* Search */}
        <div className="relative col-span-1 sm:col-span-2">
          <Search className="absolute left-3 top-2.5 text-text-secondary w-4 h-4" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, license number..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold"
          />
        </div>

        {/* Filters */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-xs bg-bg-warm border border-honey-beige rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-honey-gold"
        >
          <option value="">All Categories</option>
          <option value="TRANS">TRANS (Transport)</option>
          <option value="HMV">HMV (Heavy Motor Vehicle)</option>
          <option value="LMV">LMV (Light Motor Vehicle)</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs bg-bg-warm border border-honey-beige rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-honey-gold"
        >
          <option value="">All Statuses</option>
          <option value="Available">Available</option>
          <option value="OnTrip">On Trip</option>
          <option value="OffDuty">Off Duty</option>
          <option value="Suspended">Suspended</option>
        </select>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-honey-beige shadow-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-bg-warm border-b border-honey-beige text-text-secondary font-bold">
                <th className="p-4 cursor-pointer hover:text-honey-dark" onClick={() => setSortBy('name')}>Driver Name</th>
                <th className="p-4">License Number</th>
                <th className="p-4">Category</th>
                <th className="p-4 cursor-pointer hover:text-honey-dark" onClick={() => setSortBy('license_expiry_date')}>License Expiry</th>
                <th className="p-4">Contact Number</th>
                <th className="p-4 cursor-pointer hover:text-honey-dark" onClick={() => setSortBy('safety_score')}>Safety Score</th>
                <th className="p-4">Status</th>
                {!isReadOnly && <th className="p-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-honey-beige">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isReadOnly ? 7 : 8} className="p-8 text-center text-text-secondary">
                    No drivers registered.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => {
                  const expired = isExpired(d.license_expiry_date);
                  const expiringSoon = isExpiringSoon(d.license_expiry_date);
                  const isSuspended = d.status === 'Suspended';
                  return (
                    <tr 
                      key={d.id} 
                      className={`hover:bg-bg-warm/40 transition-colors ${
                        expired || isSuspended 
                          ? 'bg-danger-red/[0.02]' 
                          : expiringSoon 
                            ? 'bg-warning-orange/[0.02]' 
                            : ''
                      }`}
                    >
                      <td className="p-4 font-bold text-hive-black flex items-center gap-2">
                        {d.name}
                        {(expired || isSuspended) && (
                          <ShieldAlert className="w-4 h-4 text-danger-red shrink-0" title="Safety/Compliance Alert" />
                        )}
                        {expiringSoon && (
                          <AlertTriangle className="w-4 h-4 text-warning-orange shrink-0" title="License Expiring Soon" />
                        )}
                      </td>
                      <td className="p-4 text-text-secondary font-mono">{d.license_number}</td>
                      <td className="p-4 text-text-secondary">{d.license_category}</td>
                      <td className={`p-4 font-medium ${expired ? 'text-danger-red font-bold' : expiringSoon ? 'text-warning-orange font-bold' : ''}`}>
                        {d.license_expiry_date}
                      </td>
                      <td className="p-4 text-text-secondary">{d.contact_number}</td>
                      <td className="p-4">
                        <span className={`font-bold px-2 py-0.5 rounded-sm ${
                          d.safety_score >= 90 
                            ? 'text-success-green bg-success-green/10' 
                            : d.safety_score >= 75 
                              ? 'text-warning-orange bg-warning-orange/10' 
                              : 'text-danger-red bg-danger-red/10'
                        }`}>
                          {d.safety_score}/100
                        </span>
                      </td>
                      <td className="p-4">{getStatusBadge(d)}</td>
                      {!isReadOnly && (
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenEditModal(d)}
                            className="p-1 hover:text-honey-dark text-text-secondary rounded transition-colors inline-block cursor-pointer"
                            title="Edit Driver"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(d.id)}
                            className="p-1 hover:text-danger-red text-text-secondary rounded transition-colors inline-block cursor-pointer"
                            title="Delete Driver"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-hive-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-honey-beige shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-honey-beige flex items-center justify-between bg-bg-warm">
              <h3 className="font-extrabold text-lg text-hive-black">
                {editingId ? 'Edit Driver Information' : 'Register New Driver'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-hive-black transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-danger-red/10 border border-danger-red/20 rounded-xl text-danger-red font-medium flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Driver Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold"
                    placeholder="e.g. Rajesh Kumar"
                    required
                  />
                </div>

                <div>
                  <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">License Number *</label>
                  <input
                    type="text"
                    value={formData.license_number}
                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm font-mono uppercase focus:outline-none focus:ring-1 focus:ring-honey-gold"
                    placeholder="e.g. MH12 20240001234"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">License Category *</label>
                  <select
                    value={formData.license_category}
                    onChange={(e) => setFormData({ ...formData, license_category: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold"
                    required
                  >
                    <option value="TRANS">TRANS (Transport)</option>
                    <option value="HMV">HMV (Heavy Motor Vehicle)</option>
                    <option value="LMV">LMV (Light Motor Vehicle)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">License Expiry Date *</label>
                  <input
                    type="date"
                    value={formData.license_expiry_date}
                    onChange={(e) => setFormData({ ...formData, license_expiry_date: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Contact Number *</label>
                  <input
                    type="tel"
                    value={formData.contact_number}
                    onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold"
                    placeholder="e.g. 555-0199"
                    required
                  />
                </div>

                <div>
                  <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Safety Score (0 - 100) *</label>
                  <input
                    type="number"
                    value={formData.safety_score}
                    onChange={(e) => setFormData({ ...formData, safety_score: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold"
                    min="0"
                    max="100"
                    required
                  />
                </div>
              </div>

              {editingId && (
                <div>
                  <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Operational Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold"
                  >
                    <option value="Available">Available</option>
                    <option value="OnTrip">On Trip</option>
                    <option value="OffDuty">Off Duty</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              )}

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
                  {editingId ? 'Save Changes' : 'Register Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
