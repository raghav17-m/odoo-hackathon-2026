import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'egofleat-super-secure-key-2026';

app.use(cors());
app.use(express.json());

// JWT Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token missing' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Helper to log audit trails inside Prisma transactions
async function logAudit(tx, user, action, entityType, entityId) {
  try {
    const userIdentifier = user ? (user.name || user.email) : 'system';
    await tx.auditLog.create({
      data: {
        user_id: userIdentifier,
        action,
        entity_type: entityType,
        entity_id: entityId,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

// --- AUTHENTICATION ---
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role, license_number, license_category, license_expiry_date, contact_number } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          role,
        },
      });

      if (role === 'Driver') {
        if (!license_number || !license_category || !license_expiry_date || !contact_number) {
          throw new Error('Driver fields (License details and Contact Number) are required.');
        }

        const isDuplicateLicense = await tx.driver.findUnique({
          where: { license_number: license_number.toLowerCase() },
        });

        if (isDuplicateLicense) {
          throw new Error(`License number "${license_number}" is already registered.`);
        }

        await tx.driver.create({
          data: {
            name,
            license_number: license_number.toLowerCase(),
            license_category,
            license_expiry_date,
            contact_number,
            safety_score: 100,
            status: 'Available',
          },
        });
      }

      return user;
    });

    const token = jwt.sign(
      { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || 'Internal server error.' });
  }
});

// --- VEHICLES ---
app.get('/api/vehicles', authenticateToken, async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: {
        maintenanceLogs: true,
      },
      orderBy: { registration_number: 'asc' },
    });

    const enrichedVehicles = vehicles.map(v => {
      let risk = 'Low';
      const closedLogs = v.maintenanceLogs.filter(log => log.status === 'Closed');

      const lastServiceDate = closedLogs.length > 0
        ? new Date(Math.max(...closedLogs.map(l => new Date(l.closed_at || l.created_at))))
        : new Date(v.created_at);

      const daysSinceLastService = (new Date() - lastServiceDate) / (1000 * 60 * 60 * 24);

      if (v.status === 'Retired') {
        risk = 'Retired';
      } else if (v.odometer > 35000 || daysSinceLastService > 90) {
        risk = 'High';
      } else if (v.odometer > 20000 || daysSinceLastService > 60) {
        risk = 'Medium';
      }

      const { maintenanceLogs, ...vehicleData } = v;
      return {
        ...vehicleData,
        maintenance_risk: risk,
      };
    });

    res.json(enrichedVehicles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

app.post('/api/vehicles', authenticateToken, async (req, res) => {
  const { registration_number, name_model, type, max_load_capacity, odometer, acquisition_cost, region, status } = req.body;

  if (!registration_number || !name_model || !type) {
    return res.status(400).json({ message: 'Missing required vehicle fields.' });
  }

  try {
    const isDuplicate = await prisma.vehicle.findUnique({
      where: { registration_number: registration_number.toLowerCase() },
    });

    if (isDuplicate) {
      return res.status(400).json({ message: `Vehicle registration number "${registration_number}" already exists.` });
    }

    const newVehicle = await prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.create({
        data: {
          registration_number: registration_number.toLowerCase(),
          name_model,
          type,
          max_load_capacity: Number(max_load_capacity),
          odometer: Number(odometer),
          acquisition_cost: Number(acquisition_cost),
          region,
          status: status || 'Available',
        },
      });

      await logAudit(tx, req.user, 'CREATE_VEHICLE', 'Vehicle', vehicle.id);
      return vehicle;
    });

    res.status(201).json(newVehicle);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || 'Internal server error.' });
  }
});

app.put('/api/vehicles/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { registration_number, name_model, type, max_load_capacity, odometer, acquisition_cost, region, status } = req.body;

  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found.' });
    }

    if (registration_number) {
      const isDuplicate = await prisma.vehicle.findFirst({
        where: {
          id: { not: id },
          registration_number: registration_number.toLowerCase(),
        },
      });

      if (isDuplicate) {
        return res.status(400).json({ message: `Vehicle registration number "${registration_number}" already exists.` });
      }
    }

    const updatedVehicle = await prisma.$transaction(async (tx) => {
      const updated = await tx.vehicle.update({
        where: { id },
        data: {
          registration_number: registration_number ? registration_number.toLowerCase() : undefined,
          name_model,
          type,
          max_load_capacity: max_load_capacity !== undefined ? Number(max_load_capacity) : undefined,
          odometer: odometer !== undefined ? Number(odometer) : undefined,
          acquisition_cost: acquisition_cost !== undefined ? Number(acquisition_cost) : undefined,
          region,
          status,
        },
      });

      await logAudit(tx, req.user, 'UPDATE_VEHICLE', 'Vehicle', id);
      return updated;
    });

    res.json(updatedVehicle);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || 'Internal server error.' });
  }
});

app.delete('/api/vehicles/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const hasTrips = await prisma.trip.findFirst({
      where: { vehicle_id: id },
    });

    if (hasTrips) {
      return res.status(400).json({ message: 'Cannot delete vehicle. It is referenced in existing trips.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.vehicle.delete({ where: { id } });
      await logAudit(tx, req.user, 'DELETE_VEHICLE', 'Vehicle', id);
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || 'Internal server error.' });
  }
});

// --- DRIVERS ---
app.get('/api/drivers', authenticateToken, async (req, res) => {
  try {
    const drivers = await prisma.driver.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(drivers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

app.post('/api/drivers', authenticateToken, async (req, res) => {
  const { name, license_number, license_category, license_expiry_date, contact_number, safety_score, status } = req.body;

  if (!name || !license_number || !license_category || !license_expiry_date) {
    return res.status(400).json({ message: 'Missing required driver fields.' });
  }

  try {
    const isDuplicate = await prisma.driver.findUnique({
      where: { license_number: license_number.toLowerCase() },
    });

    if (isDuplicate) {
      return res.status(400).json({ message: `License number "${license_number}" is already registered.` });
    }

    const newDriver = await prisma.$transaction(async (tx) => {
      const driver = await tx.driver.create({
        data: {
          name,
          license_number: license_number.toLowerCase(),
          license_category,
          license_expiry_date,
          contact_number,
          safety_score: safety_score !== undefined ? Number(safety_score) : 100,
          status: status || 'Available',
        },
      });

      await logAudit(tx, req.user, 'CREATE_DRIVER', 'Driver', driver.id);
      return driver;
    });

    res.status(201).json(newDriver);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || 'Internal server error.' });
  }
});

app.put('/api/drivers/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, license_number, license_category, license_expiry_date, contact_number, safety_score, status } = req.body;

  try {
    const driver = await prisma.driver.findUnique({ where: { id } });
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found.' });
    }

    if (license_number) {
      const isDuplicate = await prisma.driver.findFirst({
        where: {
          id: { not: id },
          license_number: license_number.toLowerCase(),
        },
      });

      if (isDuplicate) {
        return res.status(400).json({ message: `License number "${license_number}" is already registered.` });
      }
    }

    const updatedDriver = await prisma.$transaction(async (tx) => {
      const updated = await tx.driver.update({
        where: { id },
        data: {
          name,
          license_number: license_number ? license_number.toLowerCase() : undefined,
          license_category,
          license_expiry_date,
          contact_number,
          safety_score: safety_score !== undefined ? Number(safety_score) : undefined,
          status,
        },
      });

      await logAudit(tx, req.user, 'UPDATE_DRIVER', 'Driver', id);
      return updated;
    });

    res.json(updatedDriver);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || 'Internal server error.' });
  }
});

app.delete('/api/drivers/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const hasTrips = await prisma.trip.findFirst({
      where: { driver_id: id },
    });

    if (hasTrips) {
      return res.status(400).json({ message: 'Cannot delete driver. They are referenced in existing trips.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.driver.delete({ where: { id } });
      await logAudit(tx, req.user, 'DELETE_DRIVER', 'Driver', id);
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || 'Internal server error.' });
  }
});

// --- TRIPS ---
app.get('/api/trips', authenticateToken, async (req, res) => {
  try {
    const trips = await prisma.trip.findMany({
      orderBy: { created_at: 'desc' },
    });
    res.json(trips);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

app.post('/api/trips', authenticateToken, async (req, res) => {
  const { vehicle_id, driver_id, source, destination, cargo_weight, planned_distance } = req.body;

  if (!vehicle_id || !driver_id || !source || !destination || !cargo_weight || !planned_distance) {
    return res.status(400).json({ message: 'Missing required trip fields.' });
  }

  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicle_id } });
    const driver = await prisma.driver.findUnique({ where: { id: driver_id } });

    if (!vehicle) return res.status(400).json({ message: 'Selected vehicle does not exist.' });
    if (!driver) return res.status(400).json({ message: 'Selected driver does not exist.' });

    if (['Retired', 'InShop'].includes(vehicle.status)) {
      return res.status(400).json({ message: `Vehicle is currently ${vehicle.status} and cannot be assigned to a trip.` });
    }

    if (driver.status === 'Suspended') {
      return res.status(400).json({ message: 'Driver is currently Suspended.' });
    }

    const expiry = new Date(driver.license_expiry_date);
    if (expiry < new Date()) {
      return res.status(400).json({ message: 'Driver license is expired.' });
    }

    if (vehicle.status === 'OnTrip') {
      return res.status(400).json({ message: 'Vehicle is already on a trip.' });
    }
    if (driver.status === 'OnTrip') {
      return res.status(400).json({ message: 'Driver is already on a trip.' });
    }

    const cargoWeightNum = Number(cargo_weight);
    if (cargoWeightNum > vehicle.max_load_capacity) {
      return res.status(400).json({ message: `${cargoWeightNum}kg exceeds ${vehicle.registration_number}'s ${vehicle.max_load_capacity}kg capacity.` });
    }

    const newTrip = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.create({
        data: {
          vehicle_id,
          driver_id,
          source,
          destination,
          cargo_weight: cargoWeightNum,
          planned_distance: Number(planned_distance),
          status: 'Draft',
        },
      });

      await logAudit(tx, req.user, 'CREATE_TRIP_DRAFT', 'Trip', trip.id);
      return trip;
    });

    res.status(201).json(newTrip);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || 'Internal server error.' });
  }
});

app.post('/api/trips/:id/dispatch', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const updatedTrip = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({ where: { id } });
      if (!trip) throw new Error('Trip not found.');

      if (trip.status !== 'Draft') {
        throw new Error('Only Draft trips can be assigned.');
      }

      const vehicle = await tx.vehicle.findUnique({ where: { id: trip.vehicle_id } });
      const driver = await tx.driver.findUnique({ where: { id: trip.driver_id } });

      if (!vehicle || !driver) {
        throw new Error('Vehicle or Driver assigned to trip no longer exists.');
      }

      if (vehicle.status !== 'Available') throw new Error(`Vehicle is not Available (currently ${vehicle.status}).`);
      if (driver.status !== 'Available') throw new Error(`Driver is not Available (currently ${driver.status}).`);
      if (new Date(driver.license_expiry_date) < new Date()) {
        throw new Error('Driver license is expired.');
      }

      const updated = await tx.trip.update({
        where: { id },
        data: {
          status: 'Assigned',
        },
      });

      await tx.vehicle.update({
        where: { id: trip.vehicle_id },
        data: { status: 'Reserved' },
      });

      await tx.driver.update({
        where: { id: trip.driver_id },
        data: { status: 'Reserved' },
      });

      await logAudit(tx, req.user, 'ASSIGN_TRIP', 'Trip', id);
      return updated;
    });

    res.json(updatedTrip);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || 'Internal server error.' });
  }
});

app.post('/api/trips/:id/accept', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const updatedTrip = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({ where: { id } });
      if (!trip) throw new Error('Trip not found.');

      if (trip.status !== 'Assigned') {
        throw new Error('Only Assigned trips can be accepted.');
      }

      const driver = await tx.driver.findUnique({ where: { id: trip.driver_id } });
      if (!driver) throw new Error('Driver assigned to trip no longer exists.');

      if (req.user.role === 'Driver' && !driver.name.toLowerCase().includes(req.user.name.toLowerCase())) {
        throw new Error('You are not authorized to accept this trip.');
      }

      const updated = await tx.trip.update({
        where: { id },
        data: {
          status: 'Dispatched',
          dispatched_at: new Date(),
        },
      });

      await tx.vehicle.update({
        where: { id: trip.vehicle_id },
        data: { status: 'OnTrip' },
      });

      await tx.driver.update({
        where: { id: trip.driver_id },
        data: { status: 'OnTrip' },
      });

      await logAudit(tx, req.user, 'ACCEPT_TRIP', 'Trip', id);
      return updated;
    });

    res.json(updatedTrip);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || 'Internal server error.' });
  }
});

app.post('/api/trips/:id/decline', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const updatedTrip = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({ where: { id } });
      if (!trip) throw new Error('Trip not found.');

      if (trip.status !== 'Assigned') {
        throw new Error('Only Assigned trips can be declined.');
      }

      const driver = await tx.driver.findUnique({ where: { id: trip.driver_id } });
      if (!driver) throw new Error('Driver assigned to trip no longer exists.');

      if (req.user.role === 'Driver' && !driver.name.toLowerCase().includes(req.user.name.toLowerCase())) {
        throw new Error('You are not authorized to decline this trip.');
      }

      const updated = await tx.trip.update({
        where: { id },
        data: {
          status: 'Draft',
        },
      });

      await tx.vehicle.update({
        where: { id: trip.vehicle_id },
        data: { status: 'Available' },
      });

      await tx.driver.update({
        where: { id: trip.driver_id },
        data: { status: 'Available' },
      });

      await logAudit(tx, req.user, 'DECLINE_TRIP', 'Trip', id);
      return updated;
    });

    res.json(updatedTrip);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || 'Internal server error.' });
  }
});

app.post('/api/trips/:id/complete', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { actual_distance, fuel_consumed } = req.body;

  const actualDistanceNum = Number(actual_distance);
  const fuelConsumedNum = Number(fuel_consumed);

  if (isNaN(actualDistanceNum) || actualDistanceNum <= 0) {
    return res.status(400).json({ message: 'Actual distance must be a positive number.' });
  }
  if (isNaN(fuelConsumedNum) || fuelConsumedNum < 0) {
    return res.status(400).json({ message: 'Fuel consumed must be a non-negative number.' });
  }

  try {
    const updatedTrip = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({ where: { id } });
      if (!trip) throw new Error('Trip not found.');

      if (trip.status !== 'Dispatched') {
        throw new Error('Only Dispatched trips can be completed.');
      }

      const updated = await tx.trip.update({
        where: { id },
        data: {
          status: 'Completed',
          completed_at: new Date(),
          actual_distance: actualDistanceNum,
          fuel_consumed: fuelConsumedNum,
        },
      });

      const vehicle = await tx.vehicle.findUnique({ where: { id: trip.vehicle_id } });
      if (vehicle) {
        await tx.vehicle.update({
          where: { id: trip.vehicle_id },
          data: {
            status: 'Available',
            odometer: Number(vehicle.odometer || 0) + actualDistanceNum,
          },
        });
      }

      await tx.driver.update({
        where: { id: trip.driver_id },
        data: { status: 'Available' },
      });

      if (fuelConsumedNum > 0 && vehicle) {
        const fuelCost = fuelConsumedNum * 100;
        await tx.fuelLog.create({
          data: {
            vehicle_id: trip.vehicle_id,
            trip_id: trip.id,
            liters: fuelConsumedNum,
            cost: fuelCost,
            date: new Date().toISOString().split('T')[0],
          },
        });
      }

      await logAudit(tx, req.user, 'COMPLETE_TRIP', 'Trip', id);
      return updated;
    });

    res.json(updatedTrip);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || 'Internal server error.' });
  }
});

app.post('/api/trips/:id/cancel', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const updatedTrip = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({ where: { id } });
      if (!trip) throw new Error('Trip not found.');

      const originalStatus = trip.status;
      if (!['Draft', 'Assigned', 'Dispatched'].includes(originalStatus)) {
        throw new Error('Only Draft, Assigned, or Dispatched trips can be cancelled.');
      }

      const updated = await tx.trip.update({
        where: { id },
        data: { status: 'Cancelled' },
      });

      if (['Assigned', 'Dispatched'].includes(originalStatus)) {
        await tx.vehicle.update({
          where: { id: trip.vehicle_id },
          data: { status: 'Available' },
        });
        await tx.driver.update({
          where: { id: trip.driver_id },
          data: { status: 'Available' },
        });
      }

      await logAudit(tx, req.user, 'CANCEL_TRIP', 'Trip', id);
      return updated;
    });

    res.json(updatedTrip);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || 'Internal server error.' });
  }
});

// --- MAINTENANCE ---
app.get('/api/maintenance', authenticateToken, async (req, res) => {
  try {
    const maintenanceLogs = await prisma.maintenance.findMany({
      orderBy: { created_at: 'desc' },
    });
    res.json(maintenanceLogs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

app.post('/api/maintenance', authenticateToken, async (req, res) => {
  const { vehicle_id, type, description, cost } = req.body;

  if (!vehicle_id || !type || cost === undefined) {
    return res.status(400).json({ message: 'Missing required maintenance fields.' });
  }

  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicle_id } });
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found.' });
    }

    if (vehicle.status === 'Retired') {
      return res.status(400).json({ message: 'Cannot put a Retired vehicle into maintenance.' });
    }

    const newLog = await prisma.$transaction(async (tx) => {
      const log = await tx.maintenance.create({
        data: {
          vehicle_id,
          type,
          description,
          cost: Number(cost),
          status: 'Open',
        },
      });

      await tx.vehicle.update({
        where: { id: vehicle_id },
        data: { status: 'InShop' },
      });

      await logAudit(tx, req.user, 'OPEN_MAINTENANCE', 'Maintenance', log.id);
      return log;
    });

    res.status(201).json(newLog);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || 'Internal server error.' });
  }
});

app.post('/api/maintenance/:id/close', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const updatedLog = await prisma.$transaction(async (tx) => {
      const log = await tx.maintenance.findUnique({ where: { id } });
      if (!log) throw new Error('Maintenance record not found.');

      if (log.status !== 'Open') {
        throw new Error('Record is already closed.');
      }

      const updated = await tx.maintenance.update({
        where: { id },
        data: {
          status: 'Closed',
          closed_at: new Date(),
        },
      });

      const vehicle = await tx.vehicle.findUnique({ where: { id: log.vehicle_id } });
      if (vehicle && vehicle.status !== 'Retired') {
        await tx.vehicle.update({
          where: { id: log.vehicle_id },
          data: { status: 'Available' },
        });
      }

      await logAudit(tx, req.user, 'CLOSE_MAINTENANCE', 'Maintenance', id);
      return updated;
    });

    res.json(updatedLog);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || 'Internal server error.' });
  }
});

// --- FUEL LOGS ---
app.get('/api/fuel', authenticateToken, async (req, res) => {
  try {
    const fuelLogs = await prisma.fuelLog.findMany({
      orderBy: { date: 'desc' },
    });
    res.json(fuelLogs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

app.post('/api/fuel', authenticateToken, async (req, res) => {
  const { vehicle_id, trip_id, liters, cost, date } = req.body;

  if (!vehicle_id || liters === undefined || cost === undefined || !date) {
    return res.status(400).json({ message: 'Missing required fuel log fields.' });
  }

  try {
    const vehicleExists = await prisma.vehicle.findUnique({ where: { id: vehicle_id } });
    if (!vehicleExists) {
      return res.status(400).json({ message: 'Vehicle does not exist.' });
    }

    const newLog = await prisma.fuelLog.create({
      data: {
        vehicle_id,
        trip_id: trip_id || null,
        liters: Number(liters),
        cost: Number(cost),
        date,
      },
    });

    res.status(201).json(newLog);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// --- EXPENSES ---
app.get('/api/expenses', authenticateToken, async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({
      orderBy: { date: 'desc' },
    });
    res.json(expenses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

app.post('/api/expenses', authenticateToken, async (req, res) => {
  const { vehicle_id, type, amount, date } = req.body;

  if (!vehicle_id || !type || amount === undefined || !date) {
    return res.status(400).json({ message: 'Missing required expense fields.' });
  }

  try {
    const vehicleExists = await prisma.vehicle.findUnique({ where: { id: vehicle_id } });
    if (!vehicleExists) {
      return res.status(400).json({ message: 'Vehicle does not exist.' });
    }

    const newExpense = await prisma.expense.create({
      data: {
        vehicle_id,
        type,
        amount: Number(amount),
        date,
      },
    });

    res.status(201).json(newExpense);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// --- COMPLIANCE ALERTS ---
app.get('/api/compliance/alerts', authenticateToken, async (req, res) => {
  try {
    const drivers = await prisma.driver.findMany();
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const licenseAlerts = drivers.filter(d => {
      const expiry = new Date(d.license_expiry_date);
      return expiry <= thirtyDaysFromNow;
    }).map(d => {
      const expiry = new Date(d.license_expiry_date);
      const isExpired = expiry < now;
      const daysRemaining = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
      return {
        id: d.id,
        driver_name: d.name,
        license_number: d.license_number,
        license_expiry_date: d.license_expiry_date,
        is_expired: isExpired,
        days_remaining: daysRemaining,
      };
    });

    const vehicles = await prisma.vehicle.findMany({
      include: { maintenanceLogs: true }
    });

    const maintenanceAlerts = vehicles.map(v => {
      let risk = 'Low';
      const closedLogs = v.maintenanceLogs.filter(log => log.status === 'Closed');
      const lastServiceDate = closedLogs.length > 0
        ? new Date(Math.max(...closedLogs.map(l => new Date(l.closed_at || l.created_at))))
        : new Date(v.created_at);

      const daysSinceLastService = (new Date() - lastServiceDate) / (1000 * 60 * 60 * 24);

      if (v.status === 'Retired') {
        risk = 'Retired';
      } else if (v.odometer > 35000 || daysSinceLastService > 90) {
        risk = 'High';
      } else if (v.odometer > 20000 || daysSinceLastService > 60) {
        risk = 'Medium';
      }

      return {
        id: v.id,
        registration_number: v.registration_number,
        name_model: v.name_model,
        odometer: v.odometer,
        risk,
        days_since_service: Math.ceil(daysSinceLastService)
      };
    }).filter(v => v.risk === 'High' && v.status !== 'Retired');

    res.json({
      license_alerts: licenseAlerts,
      maintenance_alerts: maintenanceAlerts,
      total_alerts: licenseAlerts.length + maintenanceAlerts.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// --- TRIP MATCH SUGGESTIONS ---
app.get('/api/trips/match-suggestions', authenticateToken, async (req, res) => {
  const { cargo_weight } = req.query;
  if (!cargo_weight) {
    return res.status(400).json({ message: 'cargo_weight is required.' });
  }

  const weight = Number(cargo_weight);

  try {
    const vehicles = await prisma.vehicle.findMany({
      where: {
        status: 'Available',
        max_load_capacity: { gte: weight },
      },
      include: { maintenanceLogs: true },
    });

    const rankedVehicles = vehicles.map(v => {
      let risk = 'Low';
      const closedLogs = v.maintenanceLogs.filter(log => log.status === 'Closed');
      const lastServiceDate = closedLogs.length > 0
        ? new Date(Math.max(...closedLogs.map(l => new Date(l.closed_at || l.created_at))))
        : new Date(v.created_at);

      const daysSinceLastService = (new Date() - lastServiceDate) / (1000 * 60 * 60 * 24);

      if (v.odometer > 35000 || daysSinceLastService > 90) {
        risk = 'High';
      } else if (v.odometer > 20000 || daysSinceLastService > 60) {
        risk = 'Medium';
      }

      return {
        id: v.id,
        registration_number: v.registration_number,
        name_model: v.name_model,
        max_load_capacity: v.max_load_capacity,
        odometer: v.odometer,
        region: v.region,
        status: v.status,
        maintenance_risk: risk,
      };
    }).sort((a, b) => {
      if (a.max_load_capacity !== b.max_load_capacity) {
        return a.max_load_capacity - b.max_load_capacity;
      }
      const riskWeights = { Low: 1, Medium: 2, High: 3 };
      return riskWeights[a.maintenance_risk] - riskWeights[b.maintenance_risk];
    });

    const drivers = await prisma.driver.findMany({
      where: {
        status: 'Available',
      },
    });

    const eligibleDrivers = drivers.filter(d => {
      const expiry = new Date(d.license_expiry_date);
      return d.status === 'Available' && expiry >= new Date();
    }).sort((a, b) => b.safety_score - a.safety_score);

    res.json({
      vehicles: rankedVehicles,
      drivers: eligibleDrivers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// --- AUDIT TRAIL LOGS ---
app.get('/api/audit-logs', authenticateToken, async (req, res) => {
  const { entity_type, entity_id } = req.query;
  try {
    const whereClause = {};
    if (entity_type) whereClause.entity_type = entity_type;
    if (entity_id) whereClause.entity_id = entity_id;

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// Serve static assets from frontend
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// SPA Wildcard Route to serve index.html for non-API frontend paths
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
