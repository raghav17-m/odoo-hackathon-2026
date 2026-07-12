import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data to avoid duplicates on re-run
  await prisma.expense.deleteMany();
  await prisma.fuelLog.deleteMany();
  await prisma.maintenance.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const hashedPassword = await bcrypt.hash('password', 10);
  
  const users = [
    { name: 'Rajesh Sharma', email: 'manager@transitops.in', password: hashedPassword, role: 'FleetManager' },
    { name: 'Anjali Desai', email: 'safety@transitops.in', password: hashedPassword, role: 'SafetyOfficer' },
    { name: 'Vikram Mehta', email: 'finance@transitops.in', password: hashedPassword, role: 'FinancialAnalyst' },
    { name: 'Suresh Kumar', email: 'driver@transitops.in', password: hashedPassword, role: 'Driver' },
  ];

  for (const u of users) {
    await prisma.user.create({ data: u });
  }
  console.log('Seeded users.');

  // Create default vehicles
  const vehicles = [
    {
      registration_number: 'MH-12-PQ-9876',
      name_model: 'Tata Prima 4925.S',
      type: 'Truck',
      max_load_capacity: 25000,
      odometer: 45200,
      acquisition_cost: 3800000,
      region: 'West (Mumbai)',
      status: 'Available',
    },
    {
      registration_number: 'DL-01-XY-5678',
      name_model: 'Mahindra Blazo X 35',
      type: 'Truck',
      max_load_capacity: 18000,
      odometer: 28400,
      acquisition_cost: 3200000,
      region: 'North (Delhi)',
      status: 'Available',
    },
    {
      registration_number: 'KA-03-MN-1122',
      name_model: 'Ashok Leyland Partner',
      type: 'Van',
      max_load_capacity: 4000,
      odometer: 15100,
      acquisition_cost: 1100000,
      region: 'South (Bengaluru)',
      status: 'Available',
    },
  ];

  for (const v of vehicles) {
    await prisma.vehicle.create({ data: v });
  }
  console.log('Seeded vehicles.');

  // Create default drivers
  const drivers = [
    {
      name: 'Suresh Kumar',
      license_number: 'DL-1420180098765',
      license_category: 'TRANS',
      license_expiry_date: '2028-12-31',
      contact_number: '+91 9876543210',
      safety_score: 95,
      status: 'Available',
    },
    {
      name: 'Amit Patel',
      license_number: 'MH-1220150034567',
      license_category: 'HMV',
      license_expiry_date: '2027-06-15',
      contact_number: '+91 9123456789',
      safety_score: 88,
      status: 'Available',
    },
    {
      name: 'Rajinder Singh',
      license_number: 'PB-1020200011223',
      license_category: 'LMV',
      license_expiry_date: '2029-01-20',
      contact_number: '+91 9988776655',
      safety_score: 92,
      status: 'Available',
    },
  ];

  for (const d of drivers) {
    await prisma.driver.create({ data: d });
  }
  console.log('Seeded drivers.');
  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
