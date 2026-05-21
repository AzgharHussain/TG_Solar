// backend/src/seeds/005_fill_remaining_mandals.js
// Fills the remaining Guntur district mandals with villages, users & 200+ apps each.
// Run: node node_modules/knex/bin/cli.js seed:run --specific=005_fill_remaining_mandals.js

const bcrypt = require('bcryptjs');

function rInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function rFloat(min, max, d = 2) { return parseFloat((Math.random() * (max - min) + min).toFixed(d)); }
function rDate(daysAgoMax = 365, daysAgoMin = 0) {
  return new Date(Date.now() - rInt(daysAgoMin, daysAgoMax) * 86400000);
}
function mob(p = '9') { return `${p}${rInt(100000000, 999999999)}`; }

const ROOF_TYPES    = ['flat', 'sloped', 'tiled', 'thatched'];
const WATER_SOURCES = ['borewell', 'open_well', 'canal', 'tank'];
const CROPS         = ['Paddy', 'Cotton', 'Maize', 'Turmeric', 'Soyabean', 'Sunflower'];
const VENDORS = ['TS Solar Power Ltd', 'AgroSolar Telangana Ltd', 'GreenEnergy TS Systems'];
const MAKES         = ['Luminous', 'Tata Solar', 'Adani Solar', 'Vikram Solar', 'Waaree'];
const RT_STATUS     = ['submitted','submitted','approved','approved','surveyed','rejected','installed','installed'];
const PM_STATUS     = ['submitted','submitted','approved','surveyed','rejected','installed','installed','approved'];

// Siddipet district mandals with TS village coordinates
const MANDAL_DATA = [
  {
    name: 'Husnabad',
    villages: [
      { name: 'Husnabad Town',  code: 'HSN001', lat: 18.0100, lon: 79.1200 },
      { name: 'Pandilla',       code: 'HSN002', lat: 18.0300, lon: 79.1400 },
      { name: 'Pothugal',       code: 'HSN003', lat: 17.9900, lon: 79.1000 },
    ],
  },
  {
    name: 'Cherial',
    villages: [
      { name: 'Cherial Town',   code: 'CRL001', lat: 17.9200, lon: 78.9800 },
      { name: 'Mustiyal',       code: 'CRL002', lat: 17.9400, lon: 79.0000 },
      { name: 'Kadavergu',      code: 'CRL003', lat: 17.9000, lon: 78.9600 },
    ],
  },
  {
    name: 'Mulugu',
    villages: [
      { name: 'Mulugu Town',    code: 'MLG001', lat: 17.7200, lon: 78.6700 },
      { name: 'Koukonda',       code: 'MLG002', lat: 17.7400, lon: 78.6900 },
    ],
  },
  {
    name: 'Kondapak',
    villages: [
      { name: 'Kondapak Central', code: 'KDP001', lat: 18.0200, lon: 78.8000 },
      { name: 'Sirisinagandla',   code: 'KDP002', lat: 18.0400, lon: 78.7800 },
    ],
  },
];

exports.seed = async function (knex) {
  console.log('🌱 Seed 005: Filling remaining mandals of Siddipet district (Telangana)...');

  const hash     = await bcrypt.hash('Admin@123', 10);
  const state    = await knex('states').where({ code: 'TS' }).first();
  const district = await knex('districts').where({ name: 'Siddipet' }).first();

  if (!state || !district) {
    console.log('❌ Base geography missing. Run seed 001 first.');
    return;
  }

  for (const md of MANDAL_DATA) {
    const mandal = await knex('mandals').where({ name: md.name, district_id: district.id }).first();
    if (!mandal) { console.log(`  ⚠️  Mandal "${md.name}" not found, skipping.`); continue; }

    console.log(`\n🏛️  Mandal: ${md.name}`);

    for (const vd of md.villages) {
      // ── Create village ────────────────────────────────────────────────
      let village = await knex('villages').where({ village_code: vd.code }).first();
      if (!village) {
        const [vr] = await knex('villages').insert({
          state_id:               state.id,
          district_id:            district.id,
          mandal_id:              mandal.id,
          name:                   vd.name,
          village_code:           vd.code,
          total_household_target: 400,
          total_farmer_target:    120,
          land_plant_target_mw:   2.0,
          latitude:               vd.lat,
          longitude:              vd.lon,
        }).returning('*');
        village = vr;
        console.log(`  + Village: ${vd.name} (${vd.code})`);
      }
      const vid = village.id;

      // ── Sarpanch user ───────────────────────────────────────────────
      const uname = `sarpanch_${vd.code.toLowerCase()}`;
      if (!(await knex('users').where({ username: uname }).first())) {
        await knex('users').insert({
          username: uname, password_hash: hash,
          full_name: `Sarpanch ${vd.name}`, mobile: mob(),
          role: 'sarpanch',
          village_id: vid, mandal_id: mandal.id,
          district_id: district.id, state_id: state.id,
          preferred_language: 'te',
        });
      }

      // ── 300 Households ───────────────────────────────────────────────
      const hhExist = await knex('households').where({ village_id: vid }).count('id as c').first();
      const hhNeed  = Math.max(0, 300 - parseInt(hhExist.c));
      if (hhNeed > 0) {
        const pool   = ['not_applied','applied','applied','applied','installed'];
        const batch  = [];
        for (let i = 1; i <= hhNeed; i++) {
          const area   = rFloat(18, 55);
          const status = pool[i % pool.length];
          batch.push({
            household_id: `HH-${vd.code}-${String(i).padStart(4,'0')}`,
            village_id: vid,
            head_name: `${vd.name} Head ${i}`,
            mobile: mob(),
            ward_no: String((i % 12) + 1),
            house_no: `${(i % 6) + 1}-${i * 2}`,
            family_members: rInt(2, 8),
            roof_type: ROOF_TYPES[i % ROOF_TYPES.length],
            roof_length: rFloat(12, 25),
            roof_width: rFloat(8, 16),
            roof_area: area,
            recommended_capacity: parseFloat((area / 10).toFixed(2)),
            avg_monthly_bill: rFloat(200, 800).toFixed(2),
            solar_status: status,
            latitude:  vd.lat + rFloat(-0.03, 0.03, 6),
            longitude: vd.lon + rFloat(-0.03, 0.03, 6),
            installation_date: status === 'installed' ? rDate(300, 30) : null,
            installed_capacity: status === 'installed' ? rFloat(1.5, 4.0) : null,
            vendor_name: status === 'installed' ? VENDORS[i % 3] : null,
          });
        }
        for (let i = 0; i < batch.length; i += 50) await knex('households').insert(batch.slice(i, i+50));
        console.log(`    HH: ${hhNeed} added`);
      }

      // ── 100 Farmers ──────────────────────────────────────────────────
      const fmExist = await knex('farmers').where({ village_id: vid }).count('id as c').first();
      const fmNeed  = Math.max(0, 100 - parseInt(fmExist.c));
      if (fmNeed > 0) {
        const pool  = ['no_pump','diesel','applied','applied','installed'];
        const batch = [];
        for (let i = 1; i <= fmNeed; i++) {
          const status = pool[i % pool.length];
          batch.push({
            farmer_id: `FM-${vd.code}-${String(i).padStart(4,'0')}`,
            village_id: vid,
            name: `Farmer ${i} ${vd.name}`,
            mobile: mob('8'),
            survey_number: `SV-${i}`,
            land_extent: rFloat(1.5, 8.0),
            current_pump_type: i % 3 === 0 ? 'diesel' : 'none',
            current_pump_hp: 5,
            water_source: WATER_SOURCES[i % WATER_SOURCES.length],
            crops: [CROPS[i % CROPS.length]],
            irrigation_need: 'seasonal',
            pump_status: status,
            latitude:  vd.lat + rFloat(-0.04, 0.04, 6),
            longitude: vd.lon + rFloat(-0.04, 0.04, 6),
            installation_date: status === 'installed' ? rDate(300, 30) : null,
            installed_hp: status === 'installed' ? [3,5,7.5][i % 3] : null,
            vendor_name: status === 'installed' ? VENDORS[i % 3] : null,
          });
        }
        for (let i = 0; i < batch.length; i += 50) await knex('farmers').insert(batch.slice(i, i+50));
        console.log(`    FM: ${fmNeed} added`);
      }

      // ── 220+ Applications ────────────────────────────────────────────
      const appsExist = await knex('applications').where({ village_id: vid }).count('id as c').first();
      if (parseInt(appsExist.c) >= 200) {
        console.log(`    Apps: already ${appsExist.c} — skipping`);
        continue;
      }

      const hhFree = await knex('households')
        .leftJoin('applications', function() {
          this.on('households.id','=','applications.household_id')
              .andOn('applications.type','=', knex.raw('?',['rooftop']));
        })
        .where('households.village_id', vid)
        .whereNull('applications.id')
        .select('households.id').limit(200);

      const fmFree = await knex('farmers')
        .leftJoin('applications', function() {
          this.on('farmers.id','=','applications.farmer_id')
              .andOn('applications.type','=', knex.raw('?',['pump']));
        })
        .where('farmers.village_id', vid)
        .whereNull('applications.id')
        .select('farmers.id').limit(100);

      const apps  = [];
      const assets = [];
      let   ctr   = parseInt(appsExist.c) + 1;
      let   aSq   = 1;

      // Rooftop
      const hhTarget = Math.min(hhFree.length, 160);
      for (let i = 0; i < hhTarget; i++) {
        const hh     = hhFree[i];
        const status = RT_STATUS[ctr % RT_STATUS.length];
        apps.push({
          application_id: `APP-RT-${vd.code}-${String(ctr).padStart(5,'0')}`,
          type: 'rooftop', household_id: hh.id, village_id: vid,
          status,
          submitted_date:    rDate(365, 30),
          site_visit_date:   ['surveyed','approved','installed'].includes(status) ? rDate(60,5) : null,
          approval_date:     ['approved','installed'].includes(status) ? rDate(30,2) : null,
          installation_date: status === 'installed' ? rDate(20,1) : null,
          subsidy_central_pct: 30, subsidy_state_pct: 30,
          total_cost: rInt(100000, 180000),
          beneficiary_contribution: rInt(40000, 72000),
          approval_comments: status === 'approved' ? 'MPDO verified & approved.' : null,
          rejection_reason:  status === 'rejected'  ? 'Incomplete documents.' : null,
        });
        await knex('households').where({ id: hh.id }).update({
          solar_status: status === 'installed' ? 'installed' : status === 'rejected' ? 'not_applied' : 'applied',
        });
        if (status === 'installed') {
          assets.push({
            asset_code: `AST-${vd.code}-${String(aSq++).padStart(4,'0')}`,
            village_id: vid, household_id: hh.id, asset_type: 'rooftop',
            name: `${rFloat(1.5,4.0,1)}kW Rooftop System`,
            make: MAKES[ctr % MAKES.length], capacity_kw: rFloat(1.5,4.0),
            status: 'active',
            installation_date: rDate(300,30),
            warranty_expiry: new Date(Date.now() + 5*365*86400000),
            amc_end:         new Date(Date.now() + 1*365*86400000),
          });
        }
        ctr++;
      }

      // Pump
      const fmTarget = Math.min(fmFree.length, 70);
      for (let i = 0; i < fmTarget; i++) {
        const fm     = fmFree[i];
        const status = PM_STATUS[ctr % PM_STATUS.length];
        apps.push({
          application_id: `APP-PM-${vd.code}-${String(ctr).padStart(5,'0')}`,
          type: 'pump', farmer_id: fm.id, village_id: vid,
          status,
          submitted_date:    rDate(300, 20),
          site_visit_date:   ['surveyed','approved','installed'].includes(status) ? rDate(60,5) : null,
          approval_date:     ['approved','installed'].includes(status) ? rDate(30,2) : null,
          installation_date: status === 'installed' ? rDate(20,1) : null,
          requested_hp: [3,5,7.5][ctr % 3],
          subsidy_central_pct: 30, subsidy_state_pct: 30,
          total_cost: rInt(200000,450000),
          beneficiary_contribution: rInt(80000,180000),
          approval_comments: status === 'approved' ? 'Field verified. Pump approved.' : null,
          rejection_reason:  status === 'rejected'  ? 'Land docs missing.' : null,
        });
        await knex('farmers').where({ id: fm.id }).update({
          pump_status: status === 'installed' ? 'installed' : status === 'rejected' ? 'no_pump' : 'applied',
        });
        if (status === 'installed') {
          assets.push({
            asset_code: `AST-${vd.code}-${String(aSq++).padStart(4,'0')}`,
            village_id: vid, farmer_id: fm.id, asset_type: 'pump',
            name: `${[3,5,7.5][ctr%3]}HP Solar Pump`,
            make: MAKES[ctr % MAKES.length], status: 'active',
            installation_date: rDate(300,30),
            warranty_expiry: new Date(Date.now() + 5*365*86400000),
            amc_end:         new Date(Date.now() + 1*365*86400000),
          });
        }
        ctr++;
      }

      for (let i = 0; i < apps.length; i += 50) await knex('applications').insert(apps.slice(i, i+50));

      const hasAssets = await knex.schema.hasTable('assets');
      if (hasAssets && assets.length) {
        for (let i = 0; i < assets.length; i += 50) await knex('assets').insert(assets.slice(i, i+50));
      }

      const finalCount = await knex('applications').where({ village_id: vid }).count('id as c').first();
      console.log(`    ✅ ${vd.name}: ${finalCount.c} applications, ${assets.length} assets`);
    }
  }

  // Summary
  const total = await knex('villages')
    .join('districts','villages.district_id','districts.id')
    .where('districts.name','Siddipet')
    .count('villages.id as c').first();
  console.log(`\n🎉 Done! Siddipet district (TS) now has ${total.c} villages.`);
  console.log('New sarpanch logins (all password: Admin@123):');
  MANDAL_DATA.forEach(m => m.villages.forEach(v =>
    console.log(`  sarpanch_${v.code.toLowerCase()}`)));
};
