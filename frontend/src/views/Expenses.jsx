import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Plus, X, Fuel, Receipt, AlertCircle } from 'lucide-react';

export default function Expenses({ user }) {
  const [activeTab, setActiveTab] = useState('fuel'); // 'fuel' or 'general'
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);

  // Modals
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Form states
  const [fuelForm, setFuelForm] = useState({
    vehicle_id: '',
    trip_id: '',
    liters: '',
    cost: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [expenseForm, setExpenseForm] = useState({
    vehicle_id: '',
    type: 'Toll',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const vList = await api.vehicles.list();
      const tList = await api.trips.list();
      const fList = await api.fuel.list();
      const eList = await api.expenses.list();

      setVehicles(vList);
      setTrips(tList);
      setFuelLogs(fList);
      setExpenses(eList);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenFuelModal = () => {
    setError('');
    setFuelForm({
      vehicle_id: vehicles[0]?.id || '',
      trip_id: '',
      liters: '',
      cost: '',
      date: new Date().toISOString().split('T')[0]
    });
    setIsFuelModalOpen(true);
  };

  const handleOpenExpenseModal = () => {
    setError('');
    setExpenseForm({
      vehicle_id: vehicles[0]?.id || '',
      type: 'Toll',
      amount: '',
      date: new Date().toISOString().split('T')[0]
    });
    setIsExpenseModalOpen(true);
  };

  const handleAddFuelLog = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.fuel.create({
        ...fuelForm,
        trip_id: fuelForm.trip_id || null
      });
      setIsFuelModalOpen(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.expenses.create(expenseForm);
      setIsExpenseModalOpen(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Filter trips for selected vehicle in fuel log modal
  const filteredTrips = trips.filter(t => t.vehicle_id === fuelForm.vehicle_id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-hive-black tracking-tight">Fuel & Expense Logs</h1>
          <p className="text-text-secondary text-sm">Record fill-ups, road tolls, and miscellaneous fleet expenses.</p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'fuel' ? (
            <button
              onClick={handleOpenFuelModal}
              disabled={vehicles.length === 0}
              className="flex items-center gap-2 bg-honey-gold hover:bg-honey-dark text-hive-black font-bold px-4 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-55 cursor-pointer text-xs"
            >
              <Fuel className="w-4 h-4" />
              <span>Log Fuel Entry</span>
            </button>
          ) : (
            <button
              onClick={handleOpenExpenseModal}
              disabled={vehicles.length === 0}
              className="flex items-center gap-2 bg-honey-gold hover:bg-honey-dark text-hive-black font-bold px-4 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-55 cursor-pointer text-xs"
            >
              <Receipt className="w-4 h-4" />
              <span>Log General Expense</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="border-b border-honey-beige flex gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('fuel')}
          className={`pb-3 transition-colors relative cursor-pointer ${
            activeTab === 'fuel' 
              ? 'text-honey-dark' 
              : 'text-text-secondary hover:text-hive-black'
          }`}
        >
          <span className="flex items-center gap-2">
            <Fuel className="w-4 h-4" />
            <span>Fuel Refill Logs</span>
          </span>
          {activeTab === 'fuel' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-honey-dark rounded" />}
        </button>

        <button
          onClick={() => setActiveTab('general')}
          className={`pb-3 transition-colors relative cursor-pointer ${
            activeTab === 'general' 
              ? 'text-honey-dark' 
              : 'text-text-secondary hover:text-hive-black'
          }`}
        >
          <span className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            <span>General Operational Expenses</span>
          </span>
          {activeTab === 'general' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-honey-dark rounded" />}
        </button>
      </div>

      {/* Fuel Logs Grid/Table */}
      {activeTab === 'fuel' && (
        <div className="bg-white rounded-2xl border border-honey-beige shadow-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-bg-warm border-b border-honey-beige text-text-secondary font-bold">
                  <th className="p-4">Vehicle</th>
                  <th className="p-4">Associated Trip</th>
                  <th className="p-4">Refill Volume (Liters)</th>
                  <th className="p-4">Total Cost</th>
                  <th className="p-4">Price Per Liter</th>
                  <th className="p-4">Refill Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-honey-beige">
                {fuelLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-text-secondary">
                      No fuel logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  fuelLogs.map((log) => {
                    const vehicleObj = vehicles.find(v => v.id === log.vehicle_id);
                    const tripObj = trips.find(t => t.id === log.trip_id);
                    const ppl = log.liters > 0 ? (log.cost / log.liters).toFixed(2) : '0.00';
                    return (
                      <tr key={log.id} className="hover:bg-bg-warm/40 transition-colors">
                        <td className="p-4 font-bold text-hive-black">
                          {vehicleObj ? vehicleObj.registration_number : 'Unknown Vehicle'}
                        </td>
                        <td className="p-4 text-text-secondary">
                          {tripObj ? `${tripObj.source} to ${tripObj.destination}` : <span className="italic text-text-secondary/40">Manual Refill</span>}
                        </td>
                        <td className="p-4 font-semibold">{log.liters.toLocaleString()} L</td>
                        <td className="p-4 font-bold text-hive-black">₹{log.cost.toLocaleString()}</td>
                        <td className="p-4 text-text-secondary">₹{ppl} / L</td>
                        <td className="p-4 text-text-secondary">{log.date}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* General Expenses Grid/Table */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-2xl border border-honey-beige shadow-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-bg-warm border-b border-honey-beige text-text-secondary font-bold">
                  <th className="p-4">Vehicle</th>
                  <th className="p-4">Expense Type</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Date logged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-honey-beige">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-text-secondary">
                      No general expenses recorded yet.
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => {
                    const vehicleObj = vehicles.find(v => v.id === exp.vehicle_id);
                    return (
                      <tr key={exp.id} className="hover:bg-bg-warm/40 transition-colors">
                        <td className="p-4 font-bold text-hive-black">
                          {vehicleObj ? vehicleObj.registration_number : 'Unknown Vehicle'}
                        </td>
                        <td className="p-4 font-bold text-hive-black">{exp.type}</td>
                        <td className="p-4 font-bold text-danger-red">₹{exp.amount.toLocaleString()}</td>
                        <td className="p-4 text-text-secondary">{exp.date}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fuel Log Modal */}
      {isFuelModalOpen && (
        <div className="fixed inset-0 bg-hive-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl border border-honey-beige shadow-lg overflow-hidden flex flex-col">
            <div className="p-5 border-b border-honey-beige flex items-center justify-between bg-bg-warm">
              <h3 className="font-extrabold text-lg text-hive-black">Log Fuel Refill</h3>
              <button onClick={() => setIsFuelModalOpen(false)} className="text-text-secondary hover:text-hive-black transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddFuelLog} className="p-6 space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-danger-red/10 border border-danger-red/20 rounded-xl text-danger-red font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Select Vehicle *</label>
                <select
                  value={fuelForm.vehicle_id}
                  onChange={(e) => setFuelForm({ ...fuelForm, vehicle_id: e.target.value, trip_id: '' })}
                  className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold font-semibold"
                  required
                >
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.registration_number} - {v.name_model}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Select Associated Trip (Optional)</label>
                <select
                  value={fuelForm.trip_id}
                  onChange={(e) => setFuelForm({ ...fuelForm, trip_id: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold"
                >
                  <option value="">No Active Trip (Manual fill-up)</option>
                  {filteredTrips.map(t => (
                    <option key={t.id} value={t.id}>
                      Trip: {t.source} to {t.destination} ({t.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Liters *</label>
                  <input
                    type="number"
                    value={fuelForm.liters}
                    onChange={(e) => setFuelForm({ ...fuelForm, liters: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold"
                    placeholder="e.g. 50"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Total Cost (₹) *</label>
                  <input
                    type="number"
                    value={fuelForm.cost}
                    onChange={(e) => setFuelForm({ ...fuelForm, cost: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold"
                    placeholder="e.g. 5000"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Refill Date *</label>
                <input
                  type="date"
                  value={fuelForm.date}
                  onChange={(e) => setFuelForm({ ...fuelForm, date: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold"
                  required
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-honey-beige">
                <button
                  type="button"
                  onClick={() => setIsFuelModalOpen(false)}
                  className="px-4 py-2 border border-honey-beige hover:bg-bg-warm rounded-lg font-bold text-text-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-honey-gold hover:bg-honey-dark text-hive-black rounded-lg font-bold shadow-md cursor-pointer"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-hive-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl border border-honey-beige shadow-lg overflow-hidden flex flex-col">
            <div className="p-5 border-b border-honey-beige flex items-center justify-between bg-bg-warm">
              <h3 className="font-extrabold text-lg text-hive-black">Log General Expense</h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-text-secondary hover:text-hive-black transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-6 space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-danger-red/10 border border-danger-red/20 rounded-xl text-danger-red font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Select Vehicle *</label>
                <select
                  value={expenseForm.vehicle_id}
                  onChange={(e) => setExpenseForm({ ...expenseForm, vehicle_id: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold font-semibold"
                  required
                >
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.registration_number} - {v.name_model}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Expense Type *</label>
                  <select
                    value={expenseForm.type}
                    onChange={(e) => setExpenseForm({ ...expenseForm, type: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold font-semibold"
                    required
                  >
                    <option value="Toll">Toll</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Permit">Permit</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Misc">Miscellaneous</option>
                  </select>
                </div>

                <div>
                  <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Expense Amount (₹) *</label>
                  <input
                    type="number"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold"
                    placeholder="e.g. 250"
                    min="1"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-text-secondary font-bold mb-1.5 uppercase tracking-wider">Expense Date *</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-honey-beige bg-bg-warm focus:outline-none focus:ring-1 focus:ring-honey-gold"
                  required
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-honey-beige">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 border border-honey-beige hover:bg-bg-warm rounded-lg font-bold text-text-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-honey-gold hover:bg-honey-dark text-hive-black rounded-lg font-bold shadow-md cursor-pointer"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
