import {
  PrismaClient,
  Role,
  Status,
  PropertyCategory,
  ListingPurpose,
  HouseType,
  ApartmentType,
  ManagementScope,
  ManagementAgreementStatus,
  LeaseStatus,
  RentFrequency,
  MaintenanceStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive test accounts & sample data seeding...');

  const defaultPassword = 'Password123!';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdminPassword123!';

  const hashedDefaultPassword = await bcrypt.hash(defaultPassword, 10);
  const hashedSuperAdminPassword = await bcrypt.hash(superAdminPassword, 10);

  // ─── 1. SEED TEST USERS ──────────────────────────────────────────────────
  const testUsers = [
    {
      name: 'Super Admin User',
      email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@realtor.com',
      password: hashedSuperAdminPassword,
      role: Role.SUPER_ADMIN,
      status: Status.APPROVED,
      phone: '+2348010000001',
      bio: 'Platform Super Administrator with full system control',
    },
    {
      name: 'Chief Landlord',
      email: 'landlord.test@realtor.com',
      password: hashedDefaultPassword,
      role: Role.LANDLORD,
      status: Status.APPROVED,
      phone: '+2348010000002',
      bio: 'Property portfolio owner managing residential and commercial buildings',
    },
    {
      name: 'Apex Estate Agent',
      email: 'agent.test@realtor.com',
      password: hashedDefaultPassword,
      role: Role.AGENT,
      status: Status.APPROVED,
      phone: '+2348010000003',
      bio: 'Licensed real estate broker specializing in luxury Lagos properties',
    },
    {
      name: 'Prime Caretaker',
      email: 'caretaker.test@realtor.com',
      password: hashedDefaultPassword,
      role: Role.CARETAKER,
      status: Status.APPROVED,
      phone: '+2348010000004',
      bio: 'Certified facility manager overseeing tenant requests and maintenance SLAs',
    },
    {
      name: 'Verified Tenant',
      email: 'tenant.test@realtor.com',
      password: hashedDefaultPassword,
      role: Role.TENANT,
      status: Status.APPROVED,
      phone: '+2348010000005',
      bio: 'Active resident with verified lease agreements and payment history',
    },
    {
      name: 'Support Agent Lead',
      email: 'support.test@realtor.com',
      password: hashedDefaultPassword,
      role: Role.SUPPORT_AGENT,
      status: Status.APPROVED,
      phone: '+2348010000006',
      bio: 'Customer success and dispute resolution specialist',
    },
    {
      name: 'Active Property Buyer',
      email: 'user.test@realtor.com',
      password: hashedDefaultPassword,
      role: Role.USER,
      status: Status.APPROVED,
      phone: '+2348010000007',
      bio: 'Prospective tenant and property seeker browsing premium listings',
    },
  ];

  const seededUsers: Record<string, any> = {};

  for (const user of testUsers) {
    const upserted = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        password: user.password,
        role: user.role,
        status: user.status,
        isBlocked: false,
        phone: user.phone,
        bio: user.bio,
      },
      create: {
        name: user.name,
        email: user.email,
        password: user.password,
        role: user.role,
        status: user.status,
        isBlocked: false,
        phone: user.phone,
        bio: user.bio,
      },
    });
    seededUsers[user.email] = upserted;
    console.log(`  ✅ User seeded/updated: [${upserted.role}] ${upserted.email}`);
  }

  const landlord = seededUsers['landlord.test@realtor.com'];
  const agent = seededUsers['agent.test@realtor.com'];
  const caretaker = seededUsers['caretaker.test@realtor.com'];
  const tenant = seededUsers['tenant.test@realtor.com'];

  // ─── 2. SEED SAMPLE AGENT PROPERTIES ─────────────────────────────────────
  const sampleProperties = [
    {
      title: 'Luxury 4-Bedroom Terrace Duplex with Pool',
      description: 'Stunning modern contemporary 4-bedroom terrace duplex in a secure gated estate with 24/7 power, private swimming pool, fitted kitchen, and CCTV surveillance.',
      price: 180000000,
      rentFrequency: RentFrequency.YEARLY,
      type: 'DUPLEX',
      location: 'Admiralty Way, Lekki Phase 1, Lagos',
      country: 'Nigeria',
      latitude: 6.4474,
      longitude: 3.4735,
      category: PropertyCategory.HOUSE,
      houseType: HouseType.TERRACED,
      purpose: ListingPurpose.SALE,
      listingType: 'SALE',
      status: 'PUBLISHED',
      available: true,
      bedrooms: 4,
      bathrooms: 5,
      toilets: 5,
      amenities: ['Swimming Pool', '24/7 Security', 'Solar Inverter', 'Gym', 'Fitted Kitchen', 'CCTV'],
      features: ['Automated Gate', 'Borehole Water Treatment', 'POP Ceiling', 'Walk-in Closet'],
      imageUrls: [
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
      ],
      electricityScore: 4.8,
      safetyScore: 4.9,
      floodRiskScore: 1.1,
      schoolScore: 4.5,
      internetScore: 4.9,
      agentId: agent.id,
    },
    {
      title: 'Contemporary 2-Bedroom Waterfront Penthouse',
      description: 'Exquisite waterfront penthouse with panoramic skyline and ocean views, floor-to-ceiling windows, smart home automation, and concierge services.',
      price: 8500000,
      rentFrequency: RentFrequency.YEARLY,
      type: 'PENTHOUSE',
      location: 'Eko Atlantic City, Victoria Island, Lagos',
      country: 'Nigeria',
      latitude: 6.4253,
      longitude: 3.4095,
      category: PropertyCategory.APARTMENT,
      apartmentType: ApartmentType.PENTHOUSE,
      purpose: ListingPurpose.RENT,
      listingType: 'RENT',
      status: 'PUBLISHED',
      available: true,
      bedrooms: 2,
      bathrooms: 3,
      toilets: 3,
      amenities: ['Ocean View', 'Elevator', '24/7 Concierge', 'Valet Parking', 'Smart Home', 'Fiber Internet'],
      features: ['Balcony', 'Ensuite Bedrooms', 'Marble Flooring', 'Built-in Audio System'],
      imageUrls: [
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
      ],
      electricityScore: 5.0,
      safetyScore: 5.0,
      floodRiskScore: 1.0,
      schoolScore: 4.2,
      internetScore: 5.0,
      agentId: agent.id,
    },
    {
      title: 'Serviced 3-Bedroom Apartment in Banana Island',
      description: 'Well-appointed luxury serviced 3-bedroom apartment with maid quarters, central air conditioning, standby generator, and tennis court.',
      price: 15000000,
      rentFrequency: RentFrequency.YEARLY,
      type: 'THREE_BEDROOM',
      location: 'Banana Island, Ikoyi, Lagos',
      country: 'Nigeria',
      latitude: 6.4531,
      longitude: 3.4385,
      category: PropertyCategory.APARTMENT,
      apartmentType: ApartmentType.THREE_BEDROOM,
      purpose: ListingPurpose.RENT,
      listingType: 'RENT',
      status: 'PUBLISHED',
      available: true,
      bedrooms: 3,
      bathrooms: 4,
      toilets: 4,
      amenities: ['Tennis Court', 'Standby Generator', 'Children Play Area', 'Security Patrol', 'Gym'],
      features: ['BQ Included', 'Water Treatment', 'Intercom', 'Smoke Detectors'],
      imageUrls: [
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
      ],
      electricityScore: 4.9,
      safetyScore: 5.0,
      floodRiskScore: 1.2,
      schoolScore: 4.7,
      internetScore: 4.8,
      agentId: agent.id,
    },
  ];

  for (const prop of sampleProperties) {
    const existing = await prisma.property.findFirst({
      where: { title: prop.title, agentId: agent.id },
    });
    if (!existing) {
      await prisma.property.create({ data: prop });
      console.log(`  🏠 Property listing seeded: "${prop.title}"`);
    }
  }

  // ─── 3. SEED SAMPLE BUILDING, UNITS & CARETAKER AGREEMENT ────────────────
  const existingBuilding = await prisma.building.findFirst({
    where: { name: 'Elegushi Royal Towers', landlordId: landlord.id },
    include: { units: true },
  });

  let building = existingBuilding;
  if (!building) {
    building = await prisma.building.create({
      data: {
        name: 'Elegushi Royal Towers',
        address: 'Plot 14, Freedom Way, Lekki Phase 1, Lagos',
        description: 'Multi-family luxury residential apartment complex featuring 6 units with dedicated caretaker management.',
        landlordId: landlord.id,
        caretakerId: caretaker.id,
      },
      include: { units: true },
    });
    console.log(`  🏢 Building seeded: "${building.name}"`);

    // Create 4 units for the building
    const unitsData = [
      { unitNumber: 'Flat 1A', bedrooms: 2, bathrooms: 2, isOccupied: true },
      { unitNumber: 'Flat 1B', bedrooms: 2, bathrooms: 2, isOccupied: false },
      { unitNumber: 'Flat 2A', bedrooms: 3, bathrooms: 3, isOccupied: false },
      { unitNumber: 'Flat 2B', bedrooms: 3, bathrooms: 3, isOccupied: false },
    ];

    for (const u of unitsData) {
      const createdUnit = await prisma.unit.create({
        data: {
          ...u,
          buildingId: building.id,
        },
      });

      // If occupied Flat 1A, create an active lease for our test tenant!
      if (u.unitNumber === 'Flat 1A') {
        const lease = await prisma.lease.create({
          data: {
            unitId: createdUnit.id,
            tenantId: tenant.id,
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            rentAmount: 3500000,
            rentFrequency: RentFrequency.YEARLY,
            status: LeaseStatus.ACTIVE,
            signedAt: new Date(),
          },
        });

        // Add pending maintenance request for tenant
        await prisma.maintenanceRequest.create({
          data: {
            unitId: createdUnit.id,
            tenantId: tenant.id,
            description: 'Bathroom shower mixer leaking and requires seal replacement.',
            status: MaintenanceStatus.OPEN,
            estimatedCostMin: 15000,
            estimatedCostMax: 25000,
          },
        });

        console.log(`  📝 Active Lease & Maintenance Request created for tenant: ${tenant.email}`);
      }
    }

    // Create Management Agreement between Landlord and Caretaker
    await prisma.managementAgreement.create({
      data: {
        buildingId: building.id,
        caretakerId: caretaker.id,
        scope: ManagementScope.FULL_MANAGEMENT,
        durationMonths: 12,
        startDate: new Date(),
        managementFee: 10,
        feeType: 'PERCENTAGE',
        status: ManagementAgreementStatus.ACTIVE,
        slaTargetDaysRent: 3,
        slaTargetDaysMaintenance: 2,
        notes: 'Caretaker is responsible for monthly rent roll collection and contractor coordination under strict SLA.',
        signedAt: new Date(),
      },
    });
    console.log(`  🤝 Management Agreement & SLA signed between Landlord and Caretaker`);
  }

  console.log('\n✨ Database seeding completed successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑 ALL TEST ACCOUNTS ARE NOW READY WITH CREDENTIALS:');
  console.log('  • Super Admin: superadmin@realtor.com   | Password: SuperAdminPassword123!');
  console.log('  • Landlord:    landlord.test@realtor.com | Password: Password123!');
  console.log('  • Agent:       agent.test@realtor.com    | Password: Password123!');
  console.log('  • Caretaker:   caretaker.test@realtor.com| Password: Password123!');
  console.log('  • Tenant:      tenant.test@realtor.com   | Password: Password123!');
  console.log('  • Support:     support.test@realtor.com  | Password: Password123!');
  console.log('  • Buyer/User:  user.test@realtor.com     | Password: Password123!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
