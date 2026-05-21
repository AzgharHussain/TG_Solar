// backend/src/seeds/002_more_users_data.js
const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  const hash = await bcrypt.hash('Admin@123', 10);

  // Get existing refs
  const state = await knex('states').where({ code: 'TS' }).first();
  const district = await knex('districts').where({ name: 'Siddipet' }).first();
  const mandal = await knex('mandals').where({ name: 'Siddipet Urban' }).first();

  if (!state || !district || !mandal) {
    console.log('Base refs missing, skipping 002 seed.');
    return;
  }

  const sid = state.id;
  const did = district.id;
  const mid = mandal.id;

  const newVillages = [
    { name: 'Kondapak',   code: 'SDP-KP', lat: 18.0600, lon: 78.8100, user: 'sarpanch_kondapak',  fn: 'K. Chandraiah Goud' },
    { name: 'Nangnoor',   code: 'SDP-NN', lat: 18.1500, lon: 78.9600, user: 'sarpanch_nangnoor',  fn: 'M. Kishan Rao' },
    { name: 'Wargal',     code: 'SDP-WG', lat: 17.7800, lon: 78.6200, user: 'sarpanch_wargal',    fn: 'T. Srinivas Reddy' },
    { name: 'Jagdevpur',  code: 'SDP-JP', lat: 17.8500, lon: 78.7800, user: 'sarpanch_jagdevpur',  fn: 'K. Anitha Reddy' },
  ];

  for (const v of newVillages) {
    console.log(`Seeding data for Telangana village: ${v.name}...`);

    // Create village
    const [villageResult] = await knex('villages').insert({
      state_id: sid,
      district_id: did,
      mandal_id: mid,
      name: v.name,
      village_code: v.code,
      total_household_target: 300,
      total_farmer_target: 100,
      land_plant_target_mw: 1.5,
      latitude: v.lat,
      longitude: v.lon,
    }).returning('id');
    
    const vid = villageResult.id || villageResult;

    // Create user
    await knex('users').insert({
      username: v.user,
      password_hash: hash,
      full_name: v.fn,
      mobile: `98761${Math.floor(Math.random() * 89999 + 10000)}`,
      role: 'sarpanch',
      village_id: vid,
      mandal_id: mid,
      district_id: did,
      state_id: sid,
      preferred_language: 'te',
    });

    // ── Generate 200 Households ──
    const hhData = [];
    const householdStatuses = ['not_applied', 'applied', 'installed', 'applied', 'not_applied'];
    const roofTypes = ['flat', 'sloped', 'tiled'];
    
    for (let i = 1; i <= 200; i++) {
      const status = householdStatuses[i % householdStatuses.length];
      const area = (20 + Math.random() * 40).toFixed(2);
      
      hhData.push({
        household_id: `HH-${v.code}-${String(i).padStart(4, '0')}`,
        village_id: vid,
        head_name: `${v.name} Head ${i}`,
        mobile: `9${Math.floor(Math.random() * 899999999 + 100000000)}`,
        ward_no: String((i % 10) + 1),
        house_no: `${(i % 5) + 1}-${i * 2}`,
        family_members: (i % 5) + 2,
        roof_type: roofTypes[i % 3],
        roof_length: (15 + i % 10).toFixed(2),
        roof_width: (10 + i % 8).toFixed(2),
        roof_area: area,
        recommended_capacity: (parseFloat(area) / 10).toFixed(2),
        avg_monthly_bill: (200 + i * 12).toFixed(2),
        solar_status: status,
        latitude: v.lat + (Math.random() - 0.5) * 0.05,
        longitude: v.lon + (Math.random() - 0.5) * 0.05,
        installation_date: status === 'installed' ? '2024-05-10' : null,
        installed_capacity: status === 'installed' ? 3.0 : null,
        vendor_name: status === 'installed' ? 'GreenEnergy TS Systems' : null,
      });
    }
    await knex('households').insert(hhData);

    // ── Generate 50 Farmers ──
    const farmerData = [];
    const pumpStatuses = ['no_pump', 'diesel', 'applied', 'installed'];
    const crops = ['Paddy', 'Maize', 'Turmeric', 'Cotton'];
    
    for (let i = 1; i <= 50; i++) {
      const status = pumpStatuses[i % pumpStatuses.length];
      farmerData.push({
        farmer_id: `FM-${v.code}-${String(i).padStart(4, '0')}`,
        village_id: vid,
        name: `Farmer ${i} ${v.name}`,
        mobile: `8${Math.floor(Math.random() * 899999999 + 100000000)}`,
        survey_number: `SV-${i}`,
        land_extent: (2.0 + i * 0.2).toFixed(2),
        current_pump_type: status === 'diesel' ? 'diesel' : 'none',
        current_pump_hp: 5,
        water_source: 'borewell',
        crops: [crops[i % 4]],
        irrigation_need: 'seasonal',
        pump_status: status,
        latitude: v.lat + (Math.random() - 0.5) * 0.06,
        longitude: v.lon + (Math.random() - 0.5) * 0.06,
        installation_date: status === 'installed' ? '2024-03-12' : null,
        installed_hp: status === 'installed' ? 5 : null,
        vendor_name: status === 'installed' ? 'AgroSolar Telangana Ltd' : null,
      });
    }
    await knex('farmers').insert(farmerData);

    // ── Applications & Assets ──
    const activeHouseholds = await knex('households').where({ village_id: vid }).whereIn('solar_status', ['applied', 'installed']);
    const appData = [];
    const assetData = [];

    let assetCounter = 1;

    for (let i = 0; i < activeHouseholds.length; i++) {
      const hh = activeHouseholds[i];
      appData.push({
        application_id: `APP-RT-${v.code}-${String(i + 1).padStart(5, '0')}`,
        type: 'rooftop',
        household_id: hh.id,
        village_id: vid,
        status: hh.solar_status === 'installed' ? 'installed' : 'submitted',
        submitted_date: new Date('2024-01-15'),
        installation_date: hh.solar_status === 'installed' ? new Date('2024-05-10') : null,
        subsidy_central_pct: 30,
        subsidy_state_pct: 30,
        total_cost: 150000,
        beneficiary_contribution: 60000,
      });

      if (hh.solar_status === 'installed') {
        assetData.push({
          asset_code: `AST-${v.code}-${String(assetCounter++).padStart(4, '0')}`,
          village_id: vid,
          household_id: hh.id,
          asset_type: 'rooftop',
          name: `3kW Rooftop - ${hh.head_name}`,
          make: 'Luminous',
          capacity_kw: 3.0,
          status: 'active',
          installation_date: new Date('2024-05-10'),
          warranty_expiry: new Date('2029-05-10'),
          amc_end: new Date('2025-05-10'),
        });
      }
    }

    const activeFarmers = await knex('farmers').where({ village_id: vid }).whereIn('pump_status', ['applied', 'installed']);
    for (let i = 0; i < activeFarmers.length; i++) {
      const fr = activeFarmers[i];
      appData.push({
        application_id: `APP-PM-${v.code}-${String(i + 1).padStart(5, '0')}`,
        type: 'pump',
        farmer_id: fr.id,
        village_id: vid,
        status: fr.pump_status === 'installed' ? 'installed' : 'submitted',
        submitted_date: new Date('2024-02-20'),
        requested_hp: 5,
        subsidy_central_pct: 30,
        subsidy_state_pct: 30,
        total_cost: 300000,
        beneficiary_contribution: 120000,
      });

      if (fr.pump_status === 'installed') {
        assetData.push({
          asset_code: `AST-${v.code}-${String(assetCounter++).padStart(4, '0')}`,
          village_id: vid,
          farmer_id: fr.id,
          asset_type: 'pump',
          name: `5HP Pump - ${fr.name}`,
          make: 'Tata Solar',
          status: 'active',
          installation_date: new Date('2024-03-12'),
          warranty_expiry: new Date('2029-03-12'),
          amc_end: new Date('2025-03-12'),
        });
      }
    }

    if (appData.length) await knex('applications').insert(appData);
    if (assetData.length) await knex('assets').insert(assetData);
  }

  console.log('✅ 4 New Telangana Villages added with >200 records each.');
  console.log('New credentials:');
  console.log('- sarpanch_kondapak / Admin@123');
  console.log('- sarpanch_nangnoor / Admin@123');
  console.log('- sarpanch_wargal / Admin@123');
  console.log('- sarpanch_jagdevpur / Admin@123');
};
