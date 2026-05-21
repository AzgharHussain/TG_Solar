// backend/src/seeds/006_realistic_ap_applications.js
// Adds dense, realistic application data across ALL TS villages.

function rInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function rDate(daysAgoMax, daysAgoMin = 0) {
  return new Date(Date.now() - rInt(daysAgoMin, daysAgoMax) * 86400000);
}

// TS solar scheme cost bands (₹)
const RT_COSTS = [
  { cap: 1.0, total:  65000, subsidy:  26000 },
  { cap: 2.0, total: 120000, subsidy:  48000 },
  { cap: 3.0, total: 175000, subsidy:  70000 },
  { cap: 5.0, total: 285000, subsidy: 114000 },
];
const PM_COSTS = [
  { hp: 3,   total: 220000, subsidy: 132000 },
  { hp: 5,   total: 340000, subsidy: 204000 },
  { hp: 7.5, total: 480000, subsidy: 288000 },
];

const VENDORS = ['TS Solar Power Ltd', 'AgroSolar Telangana Ltd', 'GreenEnergy TS Systems'];
const MAKES   = ['Luminous', 'Tata Solar', 'Adani Solar', 'Vikram Solar', 'Waaree', 'RenewSys'];

const RT_COMMENTS = [
  'Roof inspection completed. Suitable for 3kW installation.',
  'TSSPDCL meter reading verified. Application proceeding.',
  'Site visit done. Net metering connection approved.',
  'Subsidy amount credited to beneficiary account.',
  null, null,
];
const REJECT_REASONS = [
  'Roof area insufficient for solar installation (<100 sqft).',
  'Incomplete Aadhaar and land documents.',
  'Applicant already availed benefit under previous scheme.',
  'Property disputed — legal clearance required.',
];

exports.seed = async function (knex) {
  console.log('\n🌱 Seed 006: Adding realistic TS application data...\n');

  const state = await knex('states').where({ code: 'TS' }).first();
  if (!state) { console.log('❌ TS state not found.'); return; }

  const villages = await knex('villages').where({ state_id: state.id });
  console.log(`Found ${villages.length} TS villages`);

  // Short unique prefix (changes every 65536 seconds ≈ 18 hours)
  const pfx = (Math.floor(Date.now() / 1000) % 65536).toString(16).toUpperCase().padStart(4, '0');

  let totalApps = 0;
  let totalAssets = 0;

  for (const village of villages) {
    const vid  = village.id;
    const code = (village.village_code || 'XX').slice(-4);

    // Households without existing rooftop application
    const hhFree = await knex('households')
      .where({ village_id: vid })
      .whereIn('solar_status', ['applied', 'installed'])
      .whereNotExists(
        knex('applications')
          .whereRaw('applications.household_id = households.id')
          .whereRaw("applications.type = 'rooftop'")
      );

    // Farmers without existing pump application
    const fmFree = await knex('farmers')
      .where({ village_id: vid })
      .whereIn('pump_status', ['applied', 'installed'])
      .whereNotExists(
        knex('applications')
          .whereRaw('applications.farmer_id = farmers.id')
          .whereRaw("applications.type = 'pump'")
      );

    if (hhFree.length === 0 && fmFree.length === 0) {
      console.log(`  ⏭️  ${village.name}: all covered`);
      continue;
    }

    const apps  = [];
    const assets = [];
    let aSq = await knex('assets').where({ village_id: vid }).count('id as c').first()
      .then(r => parseInt(r.c) + 1);

    // ── Rooftop Applications
    for (let i = 0; i < hhFree.length; i++) {
      const hh   = hhFree[i];
      const cost = RT_COSTS[rInt(0, RT_COSTS.length - 1)];
      const vendor = VENDORS[rInt(0, VENDORS.length - 1)];
      const make   = MAKES[rInt(0, MAKES.length - 1)];

      const roll = rInt(1, 100);
      let status, submittedDate, siteDate, approvalDate, installDate;
      submittedDate = rDate(365, 90);

      if (roll <= 40) {
        status       = 'installed';
        siteDate     = new Date(submittedDate.getTime() + rInt(7,21)  * 86400000);
        approvalDate = new Date(siteDate.getTime()      + rInt(5,15)  * 86400000);
        installDate  = new Date(approvalDate.getTime()  + rInt(10,30) * 86400000);
      } else if (roll <= 60) {
        status       = 'approved';
        siteDate     = new Date(submittedDate.getTime() + rInt(7,21)  * 86400000);
        approvalDate = new Date(siteDate.getTime()      + rInt(5,15)  * 86400000);
      } else if (roll <= 75) {
        status   = 'surveyed';
        siteDate = new Date(submittedDate.getTime() + rInt(5,14) * 86400000);
      } else if (roll <= 90) {
        status = 'submitted';
      } else {
        status = 'rejected';
      }

      // ID must fit varchar(20): "R-XXXX-YYYY-NNN" = 15 chars max
      const appId = `R-${code}-${pfx}-${String(i + 1).padStart(3, '0')}`;

      apps.push({
        application_id:           appId,
        type:                     'rooftop',
        household_id:             hh.id,
        village_id:               vid,
        status,
        submitted_date:           submittedDate,
        site_visit_date:          siteDate || null,
        approval_date:            approvalDate || null,
        installation_date:        installDate || null,
        subsidy_central_pct:      30,
        subsidy_state_pct:        30,
        total_cost:               cost.total,
        beneficiary_contribution: cost.total - cost.subsidy,
        approval_comments:        ['approved', 'installed'].includes(status)
          ? RT_COMMENTS[rInt(0, RT_COMMENTS.length - 1)]
          : null,
        rejection_reason:         status === 'rejected'
          ? REJECT_REASONS[rInt(0, REJECT_REASONS.length - 1)]
          : null,
      });

      await knex('households').where({ id: hh.id }).update({
        solar_status:     status === 'installed' ? 'installed'   : status === 'rejected' ? 'not_applied' : 'applied',
        installation_date: installDate || null,
        installed_capacity: status === 'installed' ? cost.cap : null,
        vendor_name:       status === 'installed' ? vendor : null,
      });

      if (status === 'installed') {
        assets.push({
          asset_code:        `AR-${code}-${pfx}-${String(aSq++).padStart(3, '0')}`,
          village_id:        vid,
          household_id:      hh.id,
          asset_type:        'rooftop',
          name:              `${cost.cap}kW Rooftop`,
          make,
          capacity_kw:       cost.cap,
          status:            'active',
          installation_date: installDate,
          warranty_expiry:   new Date(installDate.getTime() + 5 * 365 * 86400000),
          amc_end:           new Date(installDate.getTime() + 1 * 365 * 86400000),
        });
      }
    }

    // ── Pump Applications
    for (let i = 0; i < fmFree.length; i++) {
      const fm   = fmFree[i];
      const cost = PM_COSTS[rInt(0, PM_COSTS.length - 1)];
      const vendor = VENDORS[rInt(0, VENDORS.length - 1)];
      const make   = MAKES[rInt(0, MAKES.length - 1)];

      const roll = rInt(1, 100);
      let status, submittedDate, siteDate, approvalDate, installDate;
      submittedDate = rDate(300, 60);

      if (roll <= 45) {
        status       = 'installed';
        siteDate     = new Date(submittedDate.getTime() + rInt(10,25) * 86400000);
        approvalDate = new Date(siteDate.getTime()      + rInt(7,20)  * 86400000);
        installDate  = new Date(approvalDate.getTime()  + rInt(14,40) * 86400000);
      } else if (roll <= 65) {
        status       = 'approved';
        siteDate     = new Date(submittedDate.getTime() + rInt(10,25) * 86400000);
        approvalDate = new Date(siteDate.getTime()      + rInt(7,20)  * 86400000);
      } else if (roll <= 80) {
        status   = 'surveyed';
        siteDate = new Date(submittedDate.getTime() + rInt(7,18) * 86400000);
      } else if (roll <= 93) {
        status = 'submitted';
      } else {
        status = 'rejected';
      }

      // ID: "P-XXXX-YYYY-NNN" = 14 chars
      const appId = `P-${code}-${pfx}-${String(i + 1).padStart(3, '0')}`;

      apps.push({
        application_id:           appId,
        type:                     'pump',
        farmer_id:                fm.id,
        village_id:               vid,
        status,
        submitted_date:           submittedDate,
        site_visit_date:          siteDate || null,
        approval_date:            approvalDate || null,
        installation_date:        installDate || null,
        requested_hp:             cost.hp,
        subsidy_central_pct:      30,
        subsidy_state_pct:        30,
        total_cost:               cost.total,
        beneficiary_contribution: cost.total - cost.subsidy,
        approval_comments:        ['approved', 'installed'].includes(status)
          ? 'Field verification done. TS-KUSUM subsidy approved.'
          : null,
        rejection_reason:         status === 'rejected'
          ? REJECT_REASONS[rInt(0, REJECT_REASONS.length - 1)]
          : null,
      });

      await knex('farmers').where({ id: fm.id }).update({
        pump_status:      status === 'installed' ? 'installed' : status === 'rejected' ? 'no_pump' : 'applied',
        installation_date: installDate || null,
        installed_hp:     status === 'installed' ? cost.hp : null,
        vendor_name:      status === 'installed' ? vendor : null,
      });

      if (status === 'installed') {
        assets.push({
          asset_code:        `AP-${code}-${pfx}-${String(aSq++).padStart(3, '0')}`,
          village_id:        vid,
          farmer_id:         fm.id,
          asset_type:        'pump',
          name:              `${cost.hp}HP Solar Pump`,
          make,
          status:            'active',
          installation_date: installDate,
          warranty_expiry:   new Date(installDate.getTime() + 5 * 365 * 86400000),
          amc_end:           new Date(installDate.getTime() + 1 * 365 * 86400000),
        });
      }
    }

    // Insert in batches — skip any that would conflict on application_id
    for (let i = 0; i < apps.length; i += 50) {
      const batch = apps.slice(i, i + 50);
      await knex.raw(
        `${knex('applications').insert(batch).toString()} ON CONFLICT (application_id) DO NOTHING`
      );
    }

    const hasAssets = await knex.schema.hasTable('assets');
    if (hasAssets && assets.length) {
      for (let i = 0; i < assets.length; i += 50) {
        const batch = assets.slice(i, i + 50);
        await knex.raw(
          `${knex('assets').insert(batch).toString()} ON CONFLICT (asset_code) DO NOTHING`
        );
      }
    }

    totalApps   += apps.length;
    totalAssets += assets.length;
    console.log(`  ✅ ${village.name}: +${apps.length} apps, +${assets.length} assets`);
  }

  // ── Complaints (skip if already exists via try/catch)
  const CATS = [
    { cat: 'No generation',    type: 'rooftop', urgency: 'high'   },
    { cat: 'Inverter failure', type: 'rooftop', urgency: 'high'   },
    { cat: 'Panel cleaning',   type: 'rooftop', urgency: 'low'    },
    { cat: 'Pump not working', type: 'pump',    urgency: 'high'   },
    { cat: 'Low water output', type: 'pump',    urgency: 'medium' },
    { cat: 'Wiring issue',     type: 'rooftop', urgency: 'medium' },
  ];
  const CSTATS    = ['open', 'open', 'in_progress', 'resolved', 'resolved'];
  const TECHS     = ['Ravi Varma', 'Surya Prasad', 'Kiran Kumar', 'Anil Babu', 'Pavan Rao'];
  let tktSeq = await knex('complaints').count('id as c').first().then(r => parseInt(r.c) + 1001);

  for (const v of villages) {
    for (let i = 0; i < rInt(2, 5); i++) {
      const cc  = CATS[rInt(0, CATS.length - 1)];
      const st  = CSTATS[rInt(0, CSTATS.length - 1)];
      await knex('complaints').insert({
        ticket_id:       `TKT-${String(tktSeq++).padStart(5, '0')}`,
        village_id:      v.id,
        asset_type:      cc.type,
        category:        cc.cat,
        description:     `${cc.cat} reported at ${v.name}. Attending TSSPDCL technician.`,
        urgency:         cc.urgency,
        status:          st,
        technician_name: ['in_progress', 'resolved'].includes(st) ? TECHS[rInt(0, TECHS.length - 1)] : null,
        resolution_notes: st === 'resolved' ? 'Issue rectified. Beneficiary confirmed.' : null,
      }).catch(() => {});
    }
  }

  // ── Notifications for sarpanch users
  const sarpanches = await knex('users').where({ role: 'sarpanch' }).limit(15);
  const NOTIFS = [
    { title: '✅ Application Approved', message: 'Solar application approved by MPDO. Vendor will contact soon.', type: 'application' },
    { title: '📝 New Application',      message: 'New solar pump application submitted for your village.',        type: 'application' },
    { title: '💰 Subsidy Credited',     message: 'TS-KUSUM subsidy amount credited to beneficiary account.',      type: 'payment'     },
    { title: '🔧 Maintenance Alert',    message: 'Solar panel issue reported. Ticket auto-raised.',               type: 'complaint'   },
  ];
  for (const u of sarpanches) {
    for (let j = 0; j < 3; j++) {
      const n = NOTIFS[rInt(0, NOTIFS.length - 1)];
      await knex('notifications').insert({
        user_id:  u.id,
        title:    n.title,
        message:  n.message,
        type:     n.type,
        is_read:  rInt(0, 1) === 1,
      }).catch(() => {});
    }
  }

  console.log(`\n🎉 Seed 006 Complete! Apps: ${totalApps}, Assets: ${totalAssets}`);
};
