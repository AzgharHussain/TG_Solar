// backend/src/seeds/003_more_applications_data.js
// Adds extra application data for specific AP villages.

const STATUSES = ['submitted', 'approved', 'rejected', 'submitted', 'approved', 'installed', 'surveyed'];

function rDate(daysAgoMax = 365, daysAgoMin = 0) {
  const ms = Date.now() - (Math.floor(Math.random() * (daysAgoMax - daysAgoMin + 1)) + daysAgoMin) * 86400000;
  return new Date(ms);
}

exports.seed = async function(knex) {
  // Target villages that exist in the AP seed (001_base_data.js)
  const targetVillages = ['Ensanpally', 'Mittapally', 'Tadkapally'];

  for (const vName of targetVillages) {
    const village = await knex('villages').where({ name: vName }).first();
    if (!village) {
      console.log(`⚠️  Village "${vName}" not found — skipping.`);
      continue;
    }

    const vid   = village.id;
    const vCode = village.village_code || `V${vid}`;

    // ── Rooftop applications ──
    const householdsWithoutApps = await knex('households')
      .leftJoin('applications', function() {
        this.on('households.id', '=', 'applications.household_id')
            .andOn('applications.type', '=', knex.raw('?', ['rooftop']));
      })
      .where('households.village_id', vid)
      .whereNull('applications.id')
      .select('households.id');

    console.log(`Found ${householdsWithoutApps.length} households without apps in ${vName}`);

    const limitHH  = Math.min(householdsWithoutApps.length, 100);
    const appData  = [];
    let   counter  = 1;

    for (let i = 0; i < limitHH; i++) {
      const hhId  = householdsWithoutApps[i].id;
      const status = STATUSES[i % STATUSES.length];
      const submittedDate = rDate(300, 30);

      appData.push({
        application_id:           `APP-RT-${vCode}-E${String(counter).padStart(4, '0')}`,
        type:                     'rooftop',
        household_id:             hhId,
        village_id:               vid,
        status,
        submitted_date:           submittedDate,
        site_visit_date:          ['surveyed','approved','installed'].includes(status) ? rDate(60, 5) : null,
        approval_date:            ['approved','installed'].includes(status) ? rDate(30, 2) : null,
        installation_date:        status === 'installed' ? rDate(15, 1) : null,
        subsidy_central_pct:      30,
        subsidy_state_pct:        30,
        total_cost:               [65000, 120000, 175000, 285000][i % 4],
        beneficiary_contribution: [26000,  48000,  70000, 114000][i % 4],
        rejection_reason:         status === 'rejected' ? 'Incomplete documentation.' : null,
        approval_comments:        ['approved','installed'].includes(status) ? 'MPDO verified & approved.' : null,
      });

      const solarStatus = status === 'installed' ? 'installed' : status === 'rejected' ? 'not_applied' : 'applied';
      await knex('households').where({ id: hhId }).update({ solar_status: solarStatus });
      counter++;
    }

    // ── Pump applications ──
    const farmersWithoutApps = await knex('farmers')
      .leftJoin('applications', function() {
        this.on('farmers.id', '=', 'applications.farmer_id')
            .andOn('applications.type', '=', knex.raw('?', ['pump']));
      })
      .where('farmers.village_id', vid)
      .whereNull('applications.id')
      .select('farmers.id');

    const limitFM = Math.min(farmersWithoutApps.length, 40);
    for (let i = 0; i < limitFM; i++) {
      const fmId  = farmersWithoutApps[i].id;
      const status = STATUSES[i % STATUSES.length];
      const submittedDate = rDate(280, 20);

      appData.push({
        application_id:           `APP-PM-${vCode}-E${String(counter).padStart(4, '0')}`,
        type:                     'pump',
        farmer_id:                fmId,
        village_id:               vid,
        status,
        submitted_date:           submittedDate,
        site_visit_date:          ['surveyed','approved','installed'].includes(status) ? rDate(60, 5) : null,
        approval_date:            ['approved','installed'].includes(status) ? rDate(30, 2) : null,
        installation_date:        status === 'installed' ? rDate(15, 1) : null,
        requested_hp:             [3, 5, 7.5][i % 3],
        subsidy_central_pct:      30,
        subsidy_state_pct:        30,
        total_cost:               [220000, 340000, 480000][i % 3],
        beneficiary_contribution: [ 88000, 136000, 192000][i % 3],
        rejection_reason:         status === 'rejected' ? 'Land ownership documents missing.' : null,
        approval_comments:        ['approved','installed'].includes(status) ? 'TS-KUSUM field verified & approved.' : null,
      });

      const pumpStatus = status === 'installed' ? 'installed' : status === 'rejected' ? 'no_pump' : 'applied';
      await knex('farmers').where({ id: fmId }).update({ pump_status: pumpStatus });
      counter++;
    }

    if (appData.length > 0) {
      for (let i = 0; i < appData.length; i += 50) {
        await knex.raw(
          `${knex('applications').insert(appData.slice(i, i + 50)).toString()} ON CONFLICT (application_id) DO NOTHING`
        );
      }
      console.log(`✅ Added ${appData.length} new applications for ${vName}`);
    }
  }

  console.log('✅ Seed 003: Extra applications added for core TS villages.');
};
