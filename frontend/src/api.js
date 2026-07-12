// EcoFleet API Integration Layer
// Connects the frontend client to the Express/SQLite REST backend.
// Implements safe storage logic to fallback gracefully when localStorage is blocked.

const BASE_URL = window.location.origin.includes('localhost:5173')
  ? 'http://localhost:5000/api'
  : '/api';

const DB_KEYS = {
  CURRENT_USER: 'ecofleet_current_user',
};

// Safe storage wrapper to prevent crashes in sandbox/iframe preview environments
const inMemoryStore = {};
const safeStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('localStorage is not accessible, using in-memory fallback:', e);
      return inMemoryStore[key] || null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('localStorage is not accessible, using in-memory fallback:', e);
      inMemoryStore[key] = value;
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('localStorage is not accessible, using in-memory fallback:', e);
      delete inMemoryStore[key];
    }
  }
};

// Helper for making authenticated requests to the backend
async function request(path, options = {}) {
  const userJson = safeStorage.getItem(DB_KEYS.CURRENT_USER);
  const user = userJson ? JSON.parse(userJson) : null;
  const token = user?.token;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      safeStorage.removeItem(DB_KEYS.CURRENT_USER);
      window.location.reload();
    }
    const errorMsg = data?.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // --- AUTHENTICATION ---
  auth: {
    login: async (email, password) => {
      const response = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      safeStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(response));
      return response;
    },
    register: async (name, email, password, role) => {
      const response = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role }),
      });
      safeStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(response));
      return response;
    },
    logout: async () => {
      safeStorage.removeItem(DB_KEYS.CURRENT_USER);
    },
    getCurrentUser: () => {
      const user = safeStorage.getItem(DB_KEYS.CURRENT_USER);
      return user ? JSON.parse(user) : null;
    },
    setCurrentUser: (user) => {
      safeStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(user));
    }
  },

  // --- VEHICLES ---
  vehicles: {
    list: async () => {
      return request('/vehicles');
    },
    create: async (vehicleData) => {
      return request('/vehicles', {
        method: 'POST',
        body: JSON.stringify(vehicleData),
      });
    },
    update: async (id, updatedData) => {
      return request(`/vehicles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedData),
      });
    },
    delete: async (id) => {
      return request(`/vehicles/${id}`, {
        method: 'DELETE',
      });
    }
  },

  // --- DRIVERS ---
  drivers: {
    list: async () => {
      return request('/drivers');
    },
    create: async (driverData) => {
      return request('/drivers', {
        method: 'POST',
        body: JSON.stringify(driverData),
      });
    },
    update: async (id, updatedData) => {
      return request(`/drivers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedData),
      });
    },
    delete: async (id) => {
      return request(`/drivers/${id}`, {
        method: 'DELETE',
      });
    }
  },

  // --- TRIPS ---
  trips: {
    list: async () => {
      return request('/trips');
    },
    create: async (tripData) => {
      return request('/trips', {
        method: 'POST',
        body: JSON.stringify(tripData),
      });
    },
    dispatch: async (id) => {
      return request(`/trips/${id}/dispatch`, {
        method: 'POST',
      });
    },
    complete: async (id, completionData) => {
      return request(`/trips/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify(completionData),
      });
    },
    cancel: async (id) => {
      return request(`/trips/${id}/cancel`, {
        method: 'POST',
      });
    },
    matchSuggestions: async (cargoWeight) => {
      return request(`/trips/match-suggestions?cargo_weight=${cargoWeight}`);
    }
  },

  // --- MAINTENANCE ---
  maintenance: {
    list: async () => {
      return request('/maintenance');
    },
    create: async (logData) => {
      return request('/maintenance', {
        method: 'POST',
        body: JSON.stringify(logData),
      });
    },
    close: async (id) => {
      return request(`/maintenance/${id}/close`, {
        method: 'POST',
      });
    }
  },

  // --- FUEL LOGS ---
  fuel: {
    list: async () => {
      return request('/fuel');
    },
    create: async (logData) => {
      return request('/fuel', {
        method: 'POST',
        body: JSON.stringify(logData),
      });
    }
  },

  // --- EXPENSES ---
  expenses: {
    list: async () => {
      return request('/expenses');
    },
    create: async (expenseData) => {
      return request('/expenses', {
        method: 'POST',
        body: JSON.stringify(expenseData),
      });
    }
  },

  // --- COMPLIANCE ---
  compliance: {
    alerts: async () => {
      return request('/compliance/alerts');
    }
  },

  // --- AUDIT TRAIL ---
  audit: {
    list: async (type = '', id = '') => {
      return request(`/audit-logs?entity_type=${type}&entity_id=${id}`);
    }
  }
};
