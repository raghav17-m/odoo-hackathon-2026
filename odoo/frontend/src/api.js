// TransitOps API and LocalStorage DB Simulator (Indian Context)
// Implements all database schemas, foreign keys, and business rules client-side for Phase 1.
// Tailored for India: INR currency, Indian License Categories (LMV, HMV, TRANS), and Indian Hubs.

const DB_KEYS = {
  USERS: 'transitops_users',
  VEHICLES: 'transitops_vehicles',
  DRIVERS: 'transitops_drivers',
  TRIPS: 'transitops_trips',
  MAINTENANCE: 'transitops_maintenance',
  FUEL_LOGS: 'transitops_fuel_logs',
  EXPENSES: 'transitops_expenses',
  CURRENT_USER: 'transitops_current_user',
};

// Seed default users with Indian context
const seedUsers = [
  { id: '1', name: 'Rajesh Sharma', email: 'manager@transitops.in', password: 'password', role: 'FleetManager' },
  { id: '2', name: 'Anjali Desai', email: 'safety@transitops.in', password: 'password', role: 'SafetyOfficer' },
  { id: '3', name: 'Vikram Mehta', email: 'finance@transitops.in', password: 'password', role: 'FinancialAnalyst' },
  { id: '4', name: 'Suresh Kumar', email: 'driver@transitops.in', password: 'password', role: 'Driver' },
];

const getStorageItem = (key, defaultValue = []) => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const setStorageItem = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Initialize DB with seed users
if (!localStorage.getItem(DB_KEYS.USERS)) {
  setStorageItem(DB_KEYS.USERS, seedUsers);
}

export const api = {
  // --- AUTHENTICATION ---
  auth: {
    login: async (email, password) => {
      const users = getStorageItem(DB_KEYS.USERS);
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        throw new Error('Invalid email or password.');
      }
      if (user.password !== password) {
        throw new Error('Invalid email or password.');
      }
      const token = `mock-jwt-token-${user.id}-${Date.now()}`;
      const sessionUser = { id: user.id, name: user.name, email: user.email, role: user.role, token };
      localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(sessionUser));
      return sessionUser;
    },
    logout: async () => {
      localStorage.removeItem(DB_KEYS.CURRENT_USER);
    },
    getCurrentUser: () => {
      const user = localStorage.getItem(DB_KEYS.CURRENT_USER);
      return user ? JSON.parse(user) : null;
    }
  },

  // --- VEHICLES ---
  vehicles: {
    list: async () => {
      return getStorageItem(DB_KEYS.VEHICLES);
    },
    create: async (vehicleData) => {
      const vehicles = getStorageItem(DB_KEYS.VEHICLES);
      
      const isDuplicate = vehicles.some(v => v.registration_number.toLowerCase() === vehicleData.registration_number.toLowerCase());
      if (isDuplicate) {
        throw new Error(`Vehicle registration number "${vehicleData.registration_number}" already exists.`);
      }

      const newVehicle = {
        id: `v-${Date.now()}`,
        status: 'Available',
        created_at: new Date().toISOString(),
        ...vehicleData,
        max_load_capacity: Number(vehicleData.max_load_capacity),
        odometer: Number(vehicleData.odometer),
        acquisition_cost: Number(vehicleData.acquisition_cost)
      };

      vehicles.push(newVehicle);
      setStorageItem(DB_KEYS.VEHICLES, vehicles);
      return newVehicle;
    },
    update: async (id, updatedData) => {
      const vehicles = getStorageItem(DB_KEYS.VEHICLES);
      const index = vehicles.findIndex(v => v.id === id);
      if (index === -1) throw new Error('Vehicle not found.');

      if (updatedData.registration_number) {
        const isDuplicate = vehicles.some(v => v.id !== id && v.registration_number.toLowerCase() === updatedData.registration_number.toLowerCase());
        if (isDuplicate) {
          throw new Error(`Vehicle registration number "${updatedData.registration_number}" already exists.`);
        }
      }

      vehicles[index] = {
        ...vehicles[index],
        ...updatedData,
        max_load_capacity: updatedData.max_load_capacity !== undefined ? Number(updatedData.max_load_capacity) : vehicles[index].max_load_capacity,
        odometer: updatedData.odometer !== undefined ? Number(updatedData.odometer) : vehicles[index].odometer,
        acquisition_cost: updatedData.acquisition_cost !== undefined ? Number(updatedData.acquisition_cost) : vehicles[index].acquisition_cost
      };

      setStorageItem(DB_KEYS.VEHICLES, vehicles);
      return vehicles[index];
    },
    delete: async (id) => {
      const vehicles = getStorageItem(DB_KEYS.VEHICLES);
      const trips = getStorageItem(DB_KEYS.TRIPS);
      
      const hasTrips = trips.some(t => t.vehicle_id === id);
      if (hasTrips) {
        throw new Error('Cannot delete vehicle. It is referenced in existing trips.');
      }

      const filtered = vehicles.filter(v => v.id !== id);
      setStorageItem(DB_KEYS.VEHICLES, filtered);
      return { success: true };
    }
  },

  // --- DRIVERS ---
  drivers: {
    list: async () => {
      return getStorageItem(DB_KEYS.DRIVERS);
    },
    create: async (driverData) => {
      const drivers = getStorageItem(DB_KEYS.DRIVERS);

      const isDuplicate = drivers.some(d => d.license_number.toLowerCase() === driverData.license_number.toLowerCase());
      if (isDuplicate) {
        throw new Error(`License number "${driverData.license_number}" is already registered.`);
      }

      const newDriver = {
        id: `d-${Date.now()}`,
        status: 'Available',
        safety_score: 100,
        created_at: new Date().toISOString(),
        ...driverData,
      };

      drivers.push(newDriver);
      setStorageItem(DB_KEYS.DRIVERS, drivers);
      return newDriver;
    },
    update: async (id, updatedData) => {
      const drivers = getStorageItem(DB_KEYS.DRIVERS);
      const index = drivers.findIndex(d => d.id === id);
      if (index === -1) throw new Error('Driver not found.');

      if (updatedData.license_number) {
        const isDuplicate = drivers.some(d => d.id !== id && d.license_number.toLowerCase() === updatedData.license_number.toLowerCase());
        if (isDuplicate) {
          throw new Error(`License number "${updatedData.license_number}" is already registered.`);
        }
      }

      drivers[index] = {
        ...drivers[index],
        ...updatedData,
        safety_score: updatedData.safety_score !== undefined ? Number(updatedData.safety_score) : drivers[index].safety_score
      };

      setStorageItem(DB_KEYS.DRIVERS, drivers);
      return drivers[index];
    },
    delete: async (id) => {
      const drivers = getStorageItem(DB_KEYS.DRIVERS);
      const trips = getStorageItem(DB_KEYS.TRIPS);

      const hasTrips = trips.some(t => t.driver_id === id);
      if (hasTrips) {
        throw new Error('Cannot delete driver. They are referenced in existing trips.');
      }

      const filtered = drivers.filter(d => d.id !== id);
      setStorageItem(DB_KEYS.DRIVERS, filtered);
      return { success: true };
    }
  },

  // --- TRIPS ---
  trips: {
    list: async () => {
      return getStorageItem(DB_KEYS.TRIPS);
    },
    create: async (tripData) => {
      const vehicles = getStorageItem(DB_KEYS.VEHICLES);
      const drivers = getStorageItem(DB_KEYS.DRIVERS);
      const trips = getStorageItem(DB_KEYS.TRIPS);

      const vehicle = vehicles.find(v => v.id === tripData.vehicle_id);
      const driver = drivers.find(d => d.id === tripData.driver_id);

      if (!vehicle) throw new Error('Selected vehicle does not exist.');
      if (!driver) throw new Error('Selected driver does not exist.');

      if (['Retired', 'InShop'].includes(vehicle.status)) {
        throw new Error(`Vehicle is currently ${vehicle.status} and cannot be assigned to a trip.`);
      }

      if (driver.status === 'Suspended') {
        throw new Error('Driver is currently Suspended.');
      }
      const expiry = new Date(driver.license_expiry_date);
      if (expiry < new Date()) {
        throw new Error('Driver license is expired.');
      }

      if (vehicle.status === 'OnTrip') {
        throw new Error('Vehicle is already on a trip.');
      }
      if (driver.status === 'OnTrip') {
        throw new Error('Driver is already on a trip.');
      }

      const cargoWeight = Number(tripData.cargo_weight);
      if (cargoWeight > vehicle.max_load_capacity) {
        throw new Error(`${cargoWeight}kg exceeds ${vehicle.registration_number}'s ${vehicle.max_load_capacity}kg capacity.`);
      }

      const newTrip = {
        id: `t-${Date.now()}`,
        status: 'Draft',
        created_at: new Date().toISOString(),
        dispatched_at: null,
        completed_at: null,
        actual_distance: null,
        fuel_consumed: null,
        ...tripData,
        cargo_weight: cargoWeight,
        planned_distance: Number(tripData.planned_distance),
      };

      trips.push(newTrip);
      setStorageItem(DB_KEYS.TRIPS, trips);
      return newTrip;
    },
    dispatch: async (id) => {
      const trips = getStorageItem(DB_KEYS.TRIPS);
      const vehicles = getStorageItem(DB_KEYS.VEHICLES);
      const drivers = getStorageItem(DB_KEYS.DRIVERS);

      const tripIndex = trips.findIndex(t => t.id === id);
      if (tripIndex === -1) throw new Error('Trip not found.');
      const trip = trips[tripIndex];

      if (trip.status !== 'Draft') {
        throw new Error('Only Draft trips can be dispatched.');
      }

      const vehicleIndex = vehicles.findIndex(v => v.id === trip.vehicle_id);
      const driverIndex = drivers.findIndex(d => d.id === trip.driver_id);

      if (vehicleIndex === -1 || driverIndex === -1) {
        throw new Error('Vehicle or Driver assigned to trip no longer exists.');
      }

      const vehicle = vehicles[vehicleIndex];
      const driver = drivers[driverIndex];

      if (vehicle.status === 'OnTrip') throw new Error('Vehicle is already OnTrip.');
      if (driver.status === 'OnTrip') throw new Error('Driver is already OnTrip.');
      if (['Retired', 'InShop'].includes(vehicle.status)) throw new Error('Vehicle is not available.');
      if (driver.status === 'Suspended' || new Date(driver.license_expiry_date) < new Date()) throw new Error('Driver is ineligible.');

      trips[tripIndex].status = 'Dispatched';
      trips[tripIndex].dispatched_at = new Date().toISOString();

      vehicles[vehicleIndex].status = 'OnTrip';
      drivers[driverIndex].status = 'OnTrip';

      setStorageItem(DB_KEYS.TRIPS, trips);
      setStorageItem(DB_KEYS.VEHICLES, vehicles);
      setStorageItem(DB_KEYS.DRIVERS, drivers);

      return trips[tripIndex];
    },
    complete: async (id, completionData) => {
      const trips = getStorageItem(DB_KEYS.TRIPS);
      const vehicles = getStorageItem(DB_KEYS.VEHICLES);
      const drivers = getStorageItem(DB_KEYS.DRIVERS);
      const fuelLogs = getStorageItem(DB_KEYS.FUEL_LOGS);

      const tripIndex = trips.findIndex(t => t.id === id);
      if (tripIndex === -1) throw new Error('Trip not found.');
      const trip = trips[tripIndex];

      if (trip.status !== 'Dispatched') {
        throw new Error('Only Dispatched trips can be completed.');
      }

      const vehicleIndex = vehicles.findIndex(v => v.id === trip.vehicle_id);
      const driverIndex = drivers.findIndex(d => d.id === trip.driver_id);

      const actualDistance = Number(completionData.actual_distance);
      const fuelConsumed = Number(completionData.fuel_consumed);

      if (isNaN(actualDistance) || actualDistance <= 0) throw new Error('Actual distance must be a positive number.');
      if (isNaN(fuelConsumed) || fuelConsumed < 0) throw new Error('Fuel consumed must be a non-negative number.');

      trips[tripIndex].status = 'Completed';
      trips[tripIndex].completed_at = new Date().toISOString();
      trips[tripIndex].actual_distance = actualDistance;
      trips[tripIndex].fuel_consumed = fuelConsumed;

      if (vehicleIndex !== -1) {
        vehicles[vehicleIndex].status = 'Available';
        vehicles[vehicleIndex].odometer = Number(vehicles[vehicleIndex].odometer || 0) + actualDistance;
      }
      if (driverIndex !== -1) {
        drivers[driverIndex].status = 'Available';
      }

      // If fuel consumed was entered, auto-create a fuel log (Simulate ₹100 per liter)
      if (fuelConsumed > 0 && vehicleIndex !== -1) {
        const fuelCost = fuelConsumed * 100;
        const newFuelLog = {
          id: `f-${Date.now()}`,
          vehicle_id: trip.vehicle_id,
          trip_id: trip.id,
          liters: fuelConsumed,
          cost: fuelCost,
          date: new Date().toISOString().split('T')[0]
        };
        fuelLogs.push(newFuelLog);
        setStorageItem(DB_KEYS.FUEL_LOGS, fuelLogs);
      }

      setStorageItem(DB_KEYS.TRIPS, trips);
      setStorageItem(DB_KEYS.VEHICLES, vehicles);
      setStorageItem(DB_KEYS.DRIVERS, drivers);

      return trips[tripIndex];
    },
    cancel: async (id) => {
      const trips = getStorageItem(DB_KEYS.TRIPS);
      const vehicles = getStorageItem(DB_KEYS.VEHICLES);
      const drivers = getStorageItem(DB_KEYS.DRIVERS);

      const tripIndex = trips.findIndex(t => t.id === id);
      if (tripIndex === -1) throw new Error('Trip not found.');
      const trip = trips[tripIndex];

      const originalStatus = trip.status;
      if (!['Draft', 'Dispatched'].includes(originalStatus)) {
        throw new Error('Only Draft or Dispatched trips can be cancelled.');
      }

      trips[tripIndex].status = 'Cancelled';

      if (originalStatus === 'Dispatched') {
        const vehicleIndex = vehicles.findIndex(v => v.id === trip.vehicle_id);
        const driverIndex = drivers.findIndex(d => d.id === trip.driver_id);

        if (vehicleIndex !== -1) vehicles[vehicleIndex].status = 'Available';
        if (driverIndex !== -1) drivers[driverIndex].status = 'Available';
      }

      setStorageItem(DB_KEYS.TRIPS, trips);
      setStorageItem(DB_KEYS.VEHICLES, vehicles);
      setStorageItem(DB_KEYS.DRIVERS, drivers);

      return trips[tripIndex];
    }
  },

  // --- MAINTENANCE ---
  maintenance: {
    list: async () => {
      return getStorageItem(DB_KEYS.MAINTENANCE);
    },
    create: async (logData) => {
      const maintenance = getStorageItem(DB_KEYS.MAINTENANCE);
      const vehicles = getStorageItem(DB_KEYS.VEHICLES);

      const vehicleIndex = vehicles.findIndex(v => v.id === logData.vehicle_id);
      if (vehicleIndex === -1) throw new Error('Vehicle not found.');

      if (vehicles[vehicleIndex].status === 'Retired') {
        throw new Error('Cannot put a Retired vehicle into maintenance.');
      }

      const newLog = {
        id: `m-${Date.now()}`,
        status: 'Open',
        created_at: new Date().toISOString(),
        closed_at: null,
        ...logData,
        cost: Number(logData.cost)
      };

      maintenance.push(newLog);
      vehicles[vehicleIndex].status = 'InShop';

      setStorageItem(DB_KEYS.MAINTENANCE, maintenance);
      setStorageItem(DB_KEYS.VEHICLES, vehicles);

      return newLog;
    },
    close: async (id) => {
      const maintenance = getStorageItem(DB_KEYS.MAINTENANCE);
      const vehicles = getStorageItem(DB_KEYS.VEHICLES);

      const logIndex = maintenance.findIndex(m => m.id === id);
      if (logIndex === -1) throw new Error('Maintenance record not found.');
      const log = maintenance[logIndex];

      if (log.status !== 'Open') {
        throw new Error('Record is already closed.');
      }

      const vehicleIndex = vehicles.findIndex(v => v.id === log.vehicle_id);

      maintenance[logIndex].status = 'Closed';
      maintenance[logIndex].closed_at = new Date().toISOString();

      if (vehicleIndex !== -1) {
        if (vehicles[vehicleIndex].status !== 'Retired') {
          vehicles[vehicleIndex].status = 'Available';
        }
      }

      setStorageItem(DB_KEYS.MAINTENANCE, maintenance);
      setStorageItem(DB_KEYS.VEHICLES, vehicles);

      return maintenance[logIndex];
    }
  },

  // --- FUEL LOGS ---
  fuel: {
    list: async () => {
      return getStorageItem(DB_KEYS.FUEL_LOGS);
    },
    create: async (logData) => {
      const fuelLogs = getStorageItem(DB_KEYS.FUEL_LOGS);
      const vehicles = getStorageItem(DB_KEYS.VEHICLES);

      const vehicleExists = vehicles.some(v => v.id === logData.vehicle_id);
      if (!vehicleExists) throw new Error('Vehicle does not exist.');

      const newLog = {
        id: `f-${Date.now()}`,
        ...logData,
        liters: Number(logData.liters),
        cost: Number(logData.cost),
      };

      fuelLogs.push(newLog);
      setStorageItem(DB_KEYS.FUEL_LOGS, fuelLogs);
      return newLog;
    }
  },

  // --- EXPENSES ---
  expenses: {
    list: async () => {
      return getStorageItem(DB_KEYS.EXPENSES);
    },
    create: async (expenseData) => {
      const expenses = getStorageItem(DB_KEYS.EXPENSES);
      const vehicles = getStorageItem(DB_KEYS.VEHICLES);

      const vehicleExists = vehicles.some(v => v.id === expenseData.vehicle_id);
      if (!vehicleExists) throw new Error('Vehicle does not exist.');

      const newExpense = {
        id: `e-${Date.now()}`,
        ...expenseData,
        amount: Number(expenseData.amount),
      };

      expenses.push(newExpense);
      setStorageItem(DB_KEYS.EXPENSES, expenses);
      return newExpense;
    }
  }
};
