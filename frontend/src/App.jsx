import React, { useState, useEffect } from 'react';
import { api } from './api';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import Vehicles from './views/Vehicles';
import Drivers from './views/Drivers';
import Trips from './views/Trips';
import Maintenance from './views/Maintenance';
import Expenses from './views/Expenses';
import Reports from './views/Reports';

import { 
  LayoutDashboard, Truck, Users, Navigation, 
  Wrench, BadgeDollarSign, BarChart3, LogOut, ShieldAlert, Bell
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRoles, setUserRoles] = useState([]);
  const [alerts, setAlerts] = useState({ license_alerts: [], maintenance_alerts: [], total_alerts: 0 });
  const [showAlertDropdown, setShowAlertDropdown] = useState(false);

  useEffect(() => {
    const user = api.auth.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const fetchAlerts = async () => {
      try {
        const data = await api.compliance.alerts();
        setAlerts(data || { license_alerts: [], maintenance_alerts: [], total_alerts: 0 });
      } catch (err) {
        console.error('Failed to fetch compliance alerts:', err);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    api.auth.logout();
    setCurrentUser(null);
  };

  // Simulated role switching on the fly (for testing purposes)
  const handleSimulatedRoleChange = (newRole) => {
    if (!currentUser) return;
    const updated = { ...currentUser, role: newRole };
    api.auth.setCurrentUser(updated);
    setCurrentUser(updated);
    
    // Auto-adjust active tab if it's no longer allowed
    const allowed = getAllowedTabs(newRole);
    if (!allowed.includes(activeTab)) {
      setActiveTab('dashboard');
    }
  };

  const getAllowedTabs = (role) => {
    const norm = (role || '').toLowerCase();
    switch (norm) {
      case 'fleetmanager':
        return ['dashboard', 'vehicles', 'drivers', 'trips', 'maintenance', 'expenses', 'reports'];
      case 'safetyofficer':
        return ['dashboard', 'vehicles', 'drivers', 'trips'];
      case 'financialanalyst':
        return ['dashboard', 'vehicles', 'drivers', 'expenses', 'reports'];
      case 'driver':
        return ['dashboard', 'trips'];
      default:
        return ['dashboard'];
    }
  };

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const allowedTabs = getAllowedTabs(currentUser.role);

  const navigationItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, role: 'All' },
    { id: 'vehicles', name: 'Vehicles', icon: Truck, role: 'FleetManager, SafetyOfficer, FinancialAnalyst' },
    { id: 'drivers', name: 'Drivers', icon: Users, role: 'FleetManager, SafetyOfficer, FinancialAnalyst' },
    { id: 'trips', name: 'Trips', icon: Navigation, role: 'FleetManager, SafetyOfficer, Driver' },
    { id: 'maintenance', name: 'Maintenance', icon: Wrench, role: 'FleetManager' },
    { id: 'expenses', name: 'Expenses', icon: BadgeDollarSign, role: 'FleetManager, FinancialAnalyst' },
    { id: 'reports', name: 'Reports', icon: BarChart3, role: 'FleetManager, FinancialAnalyst' },
  ];

  const visibleNavs = navigationItems.filter(item => allowedTabs.includes(item.id));

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard user={currentUser} />;
      case 'vehicles':
        return <Vehicles user={currentUser} />;
      case 'drivers':
        return <Drivers user={currentUser} />;
      case 'trips':
        return <Trips user={currentUser} />;
      case 'maintenance':
        return <Maintenance user={currentUser} />;
      case 'expenses':
        return <Expenses user={currentUser} />;
      case 'reports':
        return <Reports user={currentUser} />;
      default:
        return <Dashboard user={currentUser} />;
    }
  };

  return (
    <div className="flex bg-bg-warm min-h-screen text-text-primary">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-hive-black text-white flex flex-col justify-between shrink-0 shadow-premium border-r border-honey-beige/10">
        <div>
          {/* Logo Brand */}
          <div className="p-6 flex items-center gap-3 border-b border-honey-beige/10">
            <div className="w-8 h-8 bg-honey-gold rounded-lg flex items-center justify-center shadow-md">
              <Truck className="text-hive-black w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-wider text-honey-gold uppercase">Ego Fleat</span>
              <span className="block text-[9px] text-honey-beige/60">Fleet Intelligence</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {visibleNavs.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    isActive 
                      ? 'bg-honey-gold text-hive-black shadow-md' 
                      : 'text-honey-beige/70 hover:bg-honey-beige/5 hover:text-white'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5 shrink-0" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Account Bar & Logout */}
        <div className="p-4 border-t border-honey-beige/10 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-honey-gold flex items-center justify-center text-hive-black font-bold text-xs uppercase shadow-sm">
              {currentUser.name[0]}
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-bold truncate">{currentUser.name}</span>
              <span className="block text-[10px] text-honey-beige/60 truncate">{currentUser.role}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-danger-red hover:bg-danger-red/10 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header navbar */}
        <header className="h-16 bg-white border-b border-honey-beige px-6 flex items-center justify-between shadow-xs shrink-0 relative">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-success-green animate-pulse" />
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Live System Sync</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Compliance Alerts Bell */}
            <div className="relative">
              <button
                onClick={() => setShowAlertDropdown(!showAlertDropdown)}
                className="p-2 hover:bg-bg-warm rounded-full transition-all relative cursor-pointer"
              >
                <Bell className="w-5 h-5 text-hive-black" />
                {alerts.total_alerts > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-danger-red text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {alerts.total_alerts}
                  </span>
                )}
              </button>

              {showAlertDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-honey-beige rounded-2xl shadow-xl z-50 p-4 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-honey-beige">
                    <span className="text-xs font-bold text-hive-black uppercase tracking-wider">Compliance Alerts</span>
                    <span className="text-[10px] bg-honey-gold/20 text-honey-dark font-extrabold px-2 py-0.5 rounded-full">
                      {alerts.total_alerts} Active
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {alerts.total_alerts === 0 ? (
                      <p className="text-center text-xs text-text-secondary py-4">No active compliance issues.</p>
                    ) : (
                      <>
                        {alerts.license_alerts.map(a => (
                          <div 
                            key={a.id} 
                            onClick={() => {
                              setActiveTab('drivers');
                              setShowAlertDropdown(false);
                            }}
                            className="p-2.5 hover:bg-bg-warm rounded-xl transition-all text-left text-xs cursor-pointer border-l-3 border-danger-red"
                          >
                            <span className="block font-bold text-hive-black">License Expiring: {a.driver_name}</span>
                            <span className="block text-[10px] text-text-secondary">
                              License: {a.license_number.toUpperCase()} • {a.days_remaining <= 0 ? 'Expired' : `${a.days_remaining} days left`}
                            </span>
                          </div>
                        ))}

                        {alerts.maintenance_alerts.map(a => (
                          <div 
                            key={a.id} 
                            onClick={() => {
                              setActiveTab('vehicles');
                              setShowAlertDropdown(false);
                            }}
                            className="p-2.5 hover:bg-bg-warm rounded-xl transition-all text-left text-xs cursor-pointer border-l-3 border-warning-orange"
                          >
                            <span className="block font-bold text-hive-black">High Service Risk: {a.name_model}</span>
                            <span className="block text-[10px] text-text-secondary">
                              Reg: {a.registration_number.toUpperCase()} • Odometer: {a.odometer.toLocaleString()} km
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* Alerts end */}
          </div>
        </header>

        {/* Main View Container */}
        <main className="p-8 flex-1 max-w-7xl w-full mx-auto">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}
