// backend/src/seeds/004_bulk_applications_data.js
// Generates 200+ applications, 300+ households, 100+ farmers per village (TS-specific).
// Run: npx knex seed:run --specific=004_bulk_applications_data.js

const bcrypt = require('bcryptjs');

const ROOFTOP_STATUSES = ['submitted', 'submitted', 'approved', 'approved', 'surveyed', 'rejected', 'installed', 'installed'];
const PUMP_STATUSES    = ['submitted', 'submitted', 'approved', 'surveyed', 'rejected', 'installed', 'installed', 'approved'];
const ROOF_TYPES       = ['flat', 'sloped', 'tiled', 'thatched'];
const CROPS            = ['Paddy', 'Cotton', 'Maize', 'Turmeric', 'Soyabean', 'Sunflower', 'Chilli', 'Tobacco'];
const VENDOR_NAMES     = ['TS Solar Power Ltd', 'AgroSolar Telangana Ltd', 'GreenEnergy TS Systems'];
const MAKES            = ['Luminous', 'Tata Solar', 'Adani Solar', 'Vikram Solar', 'Waaree', 'RenewSys'];
const WATER_SOURCES    = ['borewell', 'open_well', 'canal', 'tank'];
const AP_NAMES_FIRST   = ['Ramu', 'Venkat', 'Krishna', 'Srinivas', 'Rajesh', 'Suresh', 'Ramaiah', 'Balaji',
                           'Lakshmi', 'Savitri', 'Padma', 'Radha', 'Kamala', 'Anitha', 'Sita', 'Meena'];
const AP_NAMES_LAST    = ['Naidu', 'Reddy', 'Raju', 'Varma', 'Rao', 'Sharma', 'Goud', 'Murthy', 'Babu'];

function rInt(min, max)         { return Math.floor(Math.random() * (max - min + 1)) + min; }
function rFloat(min, max, d=2)  { return parseFloat((Math.random() * (max - min) + min).toFixed(d)); }
function rDate(daysAgoMax=365, daysAgoMin=0) {
  return new Date(Date.now() - rInt(daysAgoMin, daysAgoMax) * 86400000);
}
function mob(prefix='9') { return `${prefix}${rInt(100000000, 999999999)}`; }
function apName() {
  return `${AP_NAMES_FIRST[rInt(0,AP_NAMES_FIRST.length-1)]} ${AP_NAMES_LAST[rInt(0,AP_NAMES_LAST.length-1)]}`;
}

// ── 2 extra Telangana mandals to add (Gajwel & Dubbak in Siddipet district)
const EXTRA_MANDALS = [
  { name: 'Gajwel', villages: [
    { name: 'Pregnapur',     code: 'GJW001', lat: 17.8500, lon: 78.6800 },
    { name: 'Gajwel Town',   code: 'GJW002', lat: 17.8500, lon: 78.7000 },
    { name: 'Mutrajpally',   code: 'GJW003', lat: 17.8300, lon: 78.7200 },
  ]},
  { name: 'Dubbak', villages: [
    { name: 'Dubbak Town',   code: 'DBK001', lat: 18.1500, lon: 78.6100 },
    { name: 'Lachapet',      code: 'DBK002', lat: 18.1300, lon: 78.6300 },
    { name: 'Chegod',        code: 'DBK003', lat: 18.1700, lon: 78.5900 },
  ]},
];

exports.seed = async function (knex) {
  console.log('🌱 Starting bulk applications seed (004) for Telangana...');

  const state    = await knex('states').where({ code: 'TS' }).first();
  const district = await knex('districts').where({ name: 'Siddipet' }).first();

  if (!state || !district) {
    console.log('❌ TS state or Siddipet district not found. Run 001 seed first.');
    return;
  }

  const hash = await bcrypt.hash('Admin@123', 10);
  const allVillages = await knex('villages').where({ state_id: state.id }).select('*');

  // ── 1. Add extra mandal villages ──────────────────────────────────────────
  for (const em of EXTRA_MANDALS) {
    let mandalRow = await knex('mandals').where({ name: em.name, district_id: district.id }).first();
    if (!mandalRow) {
      const [mr] = await knex('mandals').insert({ district_id: district.id, name: em.name }).returning('*');
      mandalRow = mr;
      console.log(`  + Mandal: ${em.name}`);
    }

    for (const vd of em.villages) {
      let villageRow = await knex('villages').where({ village_code: vd.code }).first();
      if (!villageRow) {
        const [vr] = await knex('villages').insert({
          state_id: state.id, district_id: district.id, mandal_id: mandalRow.id,
          name: vd.name, village_code: vd.code,
          total_household_target: 500, total_farmer_target: 150,
          land_plant_target_mw: 2.5, latitude: vd.lat, longitude: vd.lon,
        }).returning('*');
        villageRow = vr;
        console.log(`    + Village: ${vd.name}`);
      }

      // sarpanch user
      const uname = `sarpanch_${vd.code.toLowerCase()}`;
      if (!(await knex('users').where({ username: uname }).first())) {
        await knex('users').insert({
          username: uname, password_hash: hash,
          full_name: `Sarpanch ${vd.name}`, mobile: mob(),
          role: 'sarpanch',
          village_id: villageRow.id, mandal_id: mandalRow.id,
          district_id: district.id, state_id: state.id,
          preferred_language: 'te',
        });
      }

      // Add to list for bulk seeding
      if (!allVillages.find(v => v.id === villageRow.id)) {
        allVillages.push(villageRow);
      }
    }
  }

  // ── 2. For every TS village: ensure 300 HH + 100 FM + 200+ apps ──────────
  for (const village of allVillages) {
    const vid   = village.id;
    const vcode = village.village_code || `V${vid}`;
    const lat   = parseFloat(village.latitude)  || 18.1;
    const lon   = parseFloat(village.longitude) || 78.8;

    console.log(`\n📍 Processing: ${village.name} (${vcode})`);

    // ── 2a. Top-up households to 300 ──
    const hhExist  = await knex('households').where({ village_id: vid }).count('id as cnt').first();
    const hhCount  = parseInt(hhExist.cnt);
    const hhNeeded = Math.max(0, 300 - hhCount);

    if (hhNeeded > 0) {
      console.log(`   Adding ${hhNeeded} households...`);
      const pool    = ['not_applied','applied','applied','applied','installed'];
      const hhBatch = [];
      for (let i = 1; i <= hhNeeded; i++) {
        const seq    = hhCount + i;
        const area   = rFloat(18, 55);
        const status = pool[seq % pool.length];
        hhBatch.push({
          household_id:          `HH-${vcode}-B${String(seq).padStart(4,'0')}`,
          village_id:            vid,
          head_name:             apName(),
          mobile:                mob(),
          ward_no:               String((seq % 12) + 1),
          house_no:              `${(seq % 6) + 1}-${seq * 2}`,
          family_members:        rInt(2, 8),
          roof_type:             ROOF_TYPES[seq % ROOF_TYPES.length],
          roof_length:           rFloat(12, 25),
          roof_width:            rFloat(8, 16),
          roof_area:             area,
          recommended_capacity:  parseFloat((area / 10).toFixed(2)),
          avg_monthly_bill:      rFloat(200, 800).toFixed(2),
          solar_status:          status,
          latitude:              lat + rFloat(-0.03, 0.03, 6),
          longitude:             lon + rFloat(-0.03, 0.03, 6),
          installation_date:     status === 'installed' ? rDate(300, 30) : null,
          installed_capacity:    status === 'installed' ? rFloat(1.5, 4.0) : null,
          vendor_name:           status === 'installed' ? VENDOR_NAMES[seq % 3] : null,
        });
      }
      for (let i = 0; i < hhBatch.length; i += 50) {
        await knex('households').insert(hhBatch.slice(i, i+50));
      }
    }

    // ── 2b. Top-up farmers to 100 ──
    const fmExist  = await knex('farmers').where({ village_id: vid }).count('id as cnt').first();
    const fmCount  = parseInt(fmExist.cnt);
    const fmNeeded = Math.max(0, 100 - fmCount);

    if (fmNeeded > 0) {
      console.log(`   Adding ${fmNeeded} farmers...`);
      const pool    = ['no_pump','diesel','applied','applied','installed'];
      const fmBatch = [];
      for (let i = 1; i <= fmNeeded; i++) {
        const seq    = fmCount + i;
        const status = pool[seq % pool.length];
        fmBatch.push({
          farmer_id:          `FM-${vcode}-B${String(seq).padStart(4,'0')}`,
          village_id:         vid,
          name:               apName(),
          mobile:             mob('8'),
          survey_number:      `SV-B-${seq}`,
          land_extent:        rFloat(1.5, 8.0),
          current_pump_type:  seq % 3 === 0 ? 'diesel' : 'none',
          current_pump_hp:    5,
          water_source:       WATER_SOURCES[seq % WATER_SOURCES.length],
          crops:              [CROPS[seq % CROPS.length]],
          irrigation_need:    'seasonal',
          pump_status:        status,
          latitude:           lat + rFloat(-0.04, 0.04, 6),
          longitude:          lon + rFloat(-0.04, 0.04, 6),
          installation_date:  status === 'installed' ? rDate(300, 30) : null,
          installed_hp:       status === 'installed' ? [3, 5, 7.5][seq % 3] : null,
          vendor_name:        status === 'installed' ? VENDOR_NAMES[seq % 3] : null,
        });
      }
      for (let i = 0; i < fmBatch.length; i += 50) {
        await knex('farmers').insert(fmBatch.slice(i, i+50));
      }
    }

    // ── 2c. Ensure 220+ applications ──
    const existingApps = await knex('applications').where({ village_id: vid }).count('id as cnt').first();
    const appCount     = parseInt(existingApps.cnt);
    const appsNeeded   = Math.max(0, 220 - appCount);

    if (appsNeeded === 0) {
      console.log(`   ✅ Already has ${appCount} applications — skipping.`);
      continue;
    }
    console.log(`   Generating ${appsNeeded} additional applications (current: ${appCount})...`);

    // Fetch unlinked households & farmers
    const hhWithoutApp = await knex('households')
      .leftJoin('applications', function () {
        this.on('households.id', '=', 'applications.household_id')
            .andOn('applications.type', '=', knex.raw('?', ['rooftop']));
      })
      .where('households.village_id', vid)
      .whereNull('applications.id')
      .select('households.id', 'households.solar_status')
      .limit(300);

    const fmWithoutApp = await knex('farmers')
      .leftJoin('applications', function () {
        this.on('farmers.id', '=', 'applications.farmer_id')
            .andOn('applications.type', '=', knex.raw('?', ['pump']));
      })
      .where('farmers.village_id', vid)
      .whereNull('applications.id')
      .select('farmers.id', 'farmers.pump_status')
      .limit(200);

    const appBatch   = [];
    const assetBatch = [];
    let counter      = appCount + 1;
    let assetSeq     = await knex('assets').where({ village_id: vid }).count('id as cnt').first()
                         .then(r => parseInt(r.cnt) + 1).catch(() => 1);

    // Rooftop applications (up to 70% of needed)
    const hhTarget = Math.min(hhWithoutApp.length, Math.ceil(appsNeeded * 0.7));
    for (let i = 0; i < hhTarget; i++) {
      const hh         = hhWithoutApp[i];
      const status     = ROOFTOP_STATUSES[counter % ROOFTOP_STATUSES.length];
      const cost       = [65000, 120000, 175000, 285000][counter % 4];
      const subsidy    = [26000,  48000,  70000, 114000][counter % 4];
      const capKw      = [1.0, 2.0, 3.0, 5.0][counter % 4];
      const submitDate = rDate(365, 30);

      appBatch.push({
        application_id:           `APP-RT-${vcode}-${String(counter).padStart(5, '0')}`,
        type:                     'rooftop',
        household_id:             hh.id,
        village_id:               vid,
        status,
        submitted_date:           submitDate,
        site_visit_date:          ['surveyed','approved','installed'].includes(status) ? rDate(30, 5) : null,
        approval_date:            ['approved','installed'].includes(status) ? rDate(20, 2) : null,
        installation_date:        status === 'installed' ? rDate(10, 1) : null,
        subsidy_central_pct:      30,
        subsidy_state_pct:        30,
        total_cost:               cost,
        beneficiary_contribution: cost - subsidy,
        approval_comments:        ['approved','installed'].includes(status) ? 'Site verified. Approved by MPDO.' : null,
        rejection_reason:         status === 'rejected' ? 'Incomplete documentation submitted.' : null,
      });

      const solarStatus = status === 'installed' ? 'installed' : status === 'rejected' ? 'not_applied' : 'applied';
      await knex('households').where({ id: hh.id }).update({
        solar_status:       solarStatus,
        installation_date:  status === 'installed' ? rDate(10, 1) : null,
        installed_capacity: status === 'installed' ? capKw : null,
        vendor_name:        status === 'installed' ? VENDOR_NAMES[counter % 3] : null,
      });

      if (status === 'installed') {
        assetBatch.push({
          asset_code:        `AST-${vcode}-${String(assetSeq++).padStart(4, '0')}`,
          village_id:        vid,
          household_id:      hh.id,
          asset_type:        'rooftop',
          name:              `${capKw}kW Rooftop System`,
          make:              MAKES[counter % MAKES.length],
          capacity_kw:       capKw,
          status:            'active',
          installation_date: rDate(300, 30),
          warranty_expiry:   new Date(Date.now() + 5 * 365 * 86400000),
          amc_end:           new Date(Date.now() + 1 * 365 * 86400000),
        });
      }
      counter++;
    }

    // Pump applications (up to 35% of needed)
    const fmTarget = Math.min(fmWithoutApp.length, Math.ceil(appsNeeded * 0.35));
    for (let i = 0; i < fmTarget; i++) {
      const fm         = fmWithoutApp[i];
      const status     = PUMP_STATUSES[counter % PUMP_STATUSES.length];
      const hp         = [3, 5, 7.5][counter % 3];
      const cost       = [220000, 340000, 480000][counter % 3];
      const subsidy    = [132000, 204000, 288000][counter % 3];
      const submitDate = rDate(300, 20);

      appBatch.push({
        application_id:           `APP-PM-${vcode}-${String(counter).padStart(5, '0')}`,
        type:                     'pump',
        farmer_id:                fm.id,
        village_id:               vid,
        status,
        submitted_date:           submitDate,
        site_visit_date:          ['surveyed','approved','installed'].includes(status) ? rDate(30, 5) : null,
        approval_date:            ['approved','installed'].includes(status) ? rDate(20, 2) : null,
        installation_date:        status === 'installed' ? rDate(10, 1) : null,
        requested_hp:             hp,
        subsidy_central_pct:      30,
        subsidy_state_pct:        30,
        total_cost:               cost,
        beneficiary_contribution: cost - subsidy,
        approval_comments:        ['approved','installed'].includes(status) ? 'Field verified. TS-KUSUM pump approved.' : null,
        rejection_reason:         status === 'rejected' ? 'Land ownership documents missing.' : null,
      });

      const pumpStatus = status === 'installed' ? 'installed' : status === 'rejected' ? 'no_pump' : 'applied';
      await knex('farmers').where({ id: fm.id }).update({
        pump_status:       pumpStatus,
        installation_date: status === 'installed' ? rDate(10, 1) : null,
        installed_hp:      status === 'installed' ? hp : null,
        vendor_name:       status === 'installed' ? VENDOR_NAMES[counter % 3] : null,
      });

      if (status === 'installed') {
        assetBatch.push({
          asset_code:        `AST-${vcode}-${String(assetSeq++).padStart(4, '0')}`,
          village_id:        vid,
          farmer_id:         fm.id,
          asset_type:        'pump',
          name:              `${hp}HP Solar Pump`,
          make:              MAKES[counter % MAKES.length],
          status:            'active',
          installation_date: rDate(300, 30),
          warranty_expiry:   new Date(Date.now() + 5 * 365 * 86400000),
          amc_end:           new Date(Date.now() + 1 * 365 * 86400000),
        });
      }
      counter++;
    }

    // Insert in chunks of 50
    for (let i = 0; i < appBatch.length; i += 50) {
      await knex.raw(
        `${knex('applications').insert(appBatch.slice(i, i + 50)).toString()} ON CONFLICT (application_id) DO NOTHING`
      );
    }

    const hasAssetsTable = await knex.schema.hasTable('assets');
    if (hasAssetsTable && assetBatch.length > 0) {
      for (let i = 0; i < assetBatch.length; i += 50) {
        await knex.raw(
          `${knex('assets').insert(assetBatch.slice(i, i + 50)).toString()} ON CONFLICT (asset_code) DO NOTHING`
        );
      }
      console.log(`   📦 ${assetBatch.length} assets inserted.`);
    }

    const total = await knex('applications').where({ village_id: vid }).count('id as cnt').first();
    console.log(`   ✅ "${village.name}" now has ${total.cnt} applications.`);
  }

  console.log('\n🎉 Seed 004 complete! Every TS village now has 200+ applications, 300+ households, 100+ farmers.');
  console.log('All passwords: Admin@123');
  EXTRA_MANDALS.forEach(m => m.villages.forEach(v =>
    console.log(`  sarpanch_${v.code.toLowerCase()} / Admin@123`)));
};
