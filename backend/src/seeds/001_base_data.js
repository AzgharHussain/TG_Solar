// backend/src/seeds/001_base_data.js
const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  // Clear in reverse order
  await knex('audit_logs').del();
  await knex('notifications').del();
  await knex('sms_logs').del();
  await knex('sms_templates').del();
  await knex('schemes').del();
  await knex('vendors').del();
  await knex('complaints').del();
  await knex('shg_expenses').del();
  await knex('shg_collections').del();
  await knex('shg_assets').del();
  await knex('shg').del();
  await knex('application_docs').del();
  await knex('applications').del();
  await knex('land_parcel_docs').del();
  await knex('land_parcels').del();
  await knex('farmer_documents').del();
  await knex('farmers').del();
  await knex('household_photos').del();
  await knex('households').del();
  await knex('login_history').del();
  await knex('users').del();
  await knex('villages').del();
  await knex('mandals').del();
  await knex('districts').del();
  await knex('states').del();

  // State: Telangana
  const [stateId] = await knex('states').insert({ name: 'Telangana', code: 'TS' }).returning('id');
  const sid = stateId.id || stateId;

  // Districts of Telangana
  const districtNames = [
    'Adilabad', 'Bhadradri Kothagudem', 'Hanumakonda', 'Hyderabad', 'Jagtial',
    'Jangaon', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar',
    'Khammam', 'Kumuram Bheem', 'Mahabubabad', 'Mahabubnagar', 'Mancherial',
    'Medak', 'Medchal-Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda',
    'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla',
    'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad',
    'Wanaparthy', 'Warangal', 'Yadadri Bhuvanagiri'
  ];

  const districtIds = {};
  for (const name of districtNames) {
    const [d] = await knex('districts').insert({ state_id: sid, name }).returning('id');
    districtIds[name] = d.id || d;
  }

  // Mandals for Siddipet district (Telangana)
  const siddipet = districtIds['Siddipet'];
  const mandalNames = ['Siddipet Urban', 'Gajwel', 'Dubbak', 'Husnabad', 'Cherial', 'Mulugu', 'Kondapak'];
  const mandalIds = {};
  for (const name of mandalNames) {
    const [m] = await knex('mandals').insert({ district_id: siddipet, name }).returning('id');
    mandalIds[name] = m.id || m;
  }

  // Villages in Siddipet Urban mandal (TS coordinates ~18.1°N, 78.85°E)
  const villageData = [
    { name: 'Ensanpally', code: 'SDP001', household_target: 480, farmer_target: 130, lat: 18.1170, lon: 78.8560 },
    { name: 'Mittapally', code: 'SDP002', household_target: 290, farmer_target: 85,  lat: 18.1450, lon: 78.8200 },
    { name: 'Tadkapally', code: 'SDP003', household_target: 350, farmer_target: 100, lat: 18.0800, lon: 78.8900 },
  ];

  const villageIds = {};
  for (const v of villageData) {
    const [vRow] = await knex('villages').insert({
      state_id: sid,
      district_id: siddipet,
      mandal_id: mandalIds['Siddipet Urban'],
      name: v.name,
      village_code: v.code,
      total_household_target: v.household_target,
      total_farmer_target: v.farmer_target,
      land_plant_target_mw: 2.0,
      latitude: v.lat,
      longitude: v.lon,
    }).returning('id');
    villageIds[v.name] = vRow.id || vRow;
  }

  const mainVillageId = villageIds['Ensanpally'];

  // Users
  const hash = await bcrypt.hash('Admin@123', 10);
  await knex('users').insert([
    {
      username: 'sarpanch_ram',
      password_hash: hash,
      full_name: 'Ramaiah Goud',
      mobile: '9876543210',
      role: 'sarpanch',
      village_id: mainVillageId,
      mandal_id: mandalIds['Siddipet Urban'],
      district_id: siddipet,
      state_id: sid,
      preferred_language: 'te',
    },
    {
      username: 'mpdo_siddipet',
      password_hash: hash,
      full_name: 'Suresh Kumar MPDO',
      mobile: '9876543211',
      role: 'mandal',
      mandal_id: mandalIds['Siddipet Urban'],
      district_id: siddipet,
      state_id: sid,
    },
    {
      username: 'collector_siddipet',
      password_hash: hash,
      full_name: 'IAS Collector Siddipet',
      mobile: '9876543212',
      role: 'district',
      district_id: siddipet,
      state_id: sid,
    },
    {
      username: 'state_admin',
      password_hash: hash,
      full_name: 'TSSPDCL State Officer',
      mobile: '9876543213',
      role: 'state',
      state_id: sid,
    },
    {
      username: 'admin',
      password_hash: hash,
      full_name: 'System Administrator',
      mobile: '9876543214',
      role: 'admin',
      state_id: sid,
    },
  ]);

  // Sample Households
  const householdStatuses = ['not_applied', 'not_applied', 'applied', 'applied', 'installed'];
  for (let i = 1; i <= 25; i++) {
    const status = householdStatuses[i % householdStatuses.length];
    const area = (20 + Math.random() * 30).toFixed(2);
    await knex('households').insert({
      household_id: `HH-SDP001-${String(i).padStart(4, '0')}`,
      village_id: mainVillageId,
      head_name: `Household Head ${i}`,
      mobile: `98765${String(i).padStart(5, '0')}`,
      ward_no: String((i % 10) + 1),
      house_no: `${(i % 5) + 1}-${i * 3}`,
      family_members: (i % 6) + 2,
      roof_type: ['flat', 'sloped', 'tiled'][i % 3],
      roof_length: (15 + i % 10).toFixed(2),
      roof_width: (10 + i % 8).toFixed(2),
      roof_area: area,
      recommended_capacity: (parseFloat(area) / 10).toFixed(2),
      avg_monthly_bill: (200 + i * 15).toFixed(2),
      solar_status: status,
      latitude:  18.1170 + (Math.random() - 0.5) * 0.02,
      longitude: 78.8560 + (Math.random() - 0.5) * 0.02,
      installation_date: status === 'installed' ? '2024-08-15' : null,
      installed_capacity: status === 'installed' ? 2.0 : null,
      vendor_name: status === 'installed' ? 'TS Solar Power Ltd' : null,
    });
  }

  // Sample Farmers
  const pumpStatuses = ['no_pump', 'diesel', 'applied', 'installed'];
  const crops = ['Paddy', 'Maize', 'Turmeric'];
  for (let i = 1; i <= 20; i++) {
    const status = pumpStatuses[i % pumpStatuses.length];
    await knex('farmers').insert({
      farmer_id: `FM-SDP001-${String(i).padStart(4, '0')}`,
      village_id: mainVillageId,
      name: `Farmer ${i} Goud`,
      mobile: `87654${String(i).padStart(5, '0')}`,
      survey_number: `123/${i}`,
      land_extent: (2.5 + i * 0.3).toFixed(2),
      current_pump_type: status === 'diesel' ? 'diesel' : 'none',
      current_pump_hp: 5,
      water_source: 'borewell',
      crops: [crops[i % 3]],
      irrigation_need: 'seasonal',
      pump_status: status,
      latitude:  18.1170 + (Math.random() - 0.5) * 0.03,
      longitude: 78.8560 + (Math.random() - 0.5) * 0.03,
      installation_date: status === 'installed' ? '2024-09-01' : null,
      installed_hp: status === 'installed' ? 5 : null,
      vendor_name: status === 'installed' ? 'AgroSolar Telangana' : null,
    });
  }

  // Sample Applications
  const households = await knex('households').where({ village_id: mainVillageId, solar_status: 'applied' }).select('id');
  for (let i = 0; i < households.length; i++) {
    await knex('applications').insert({
      application_id: `APP-RT-${String(i + 1).padStart(5, '0')}`,
      type: 'rooftop',
      household_id: households[i].id,
      village_id: mainVillageId,
      status: 'submitted',
      submitted_date: new Date(),
      subsidy_central_pct: 30,
      subsidy_state_pct: 30,
      total_cost: 120000,
      beneficiary_contribution: 48000,
    });
  }

  const farmersApplied = await knex('farmers').where({ village_id: mainVillageId, pump_status: 'applied' }).select('id');
  for (let i = 0; i < farmersApplied.length; i++) {
    await knex('applications').insert({
      application_id: `APP-PM-${String(i + 1).padStart(5, '0')}`,
      type: 'pump',
      farmer_id: farmersApplied[i].id,
      village_id: mainVillageId,
      status: 'submitted',
      submitted_date: new Date(),
      requested_hp: 5,
      subsidy_central_pct: 30,
      subsidy_state_pct: 30,
      total_cost: 350000,
      beneficiary_contribution: 140000,
    });
  }

  // Land Parcel (TS coordinates)
  await knex('land_parcels').insert({
    village_id: mainVillageId,
    survey_number: '456/A',
    extent_acres: 8.5,
    land_use: 'fallow',
    owner_name: 'Gram Panchayat',
    status: 'identified',
    geojson_polygon: JSON.stringify({
      type: 'Polygon',
      coordinates: [[[78.850, 18.112], [78.855, 18.112], [78.855, 18.117], [78.850, 18.117], [78.850, 18.112]]]
    }),
    plant_capacity_mw: 2.0,
    distance_from_village: 1.5,
    grid_distance: 0.8,
  });

  // SHG
  await knex('shg').insert({
    shg_id: 'SHG-SDP001-001',
    village_id: mainVillageId,
    name: 'Shakti Mahila Sangham',
    registration_date: '2022-06-15',
    member_count: 15,
    bank_account: '1234567890',
    bank_name: 'State Bank of India',
    ifsc: 'SBIN0020123',
    contact_name: 'Sujatha Devi',
    contact_mobile: '9912345678',
    wards_covered: ['1', '2', '3'],
  });

  // Complaints
  await knex('complaints').insert([
    {
      ticket_id: 'TKT-00001',
      village_id: mainVillageId,
      asset_type: 'rooftop',
      asset_id: 1,
      category: 'No generation',
      description: 'Solar panels not generating power since 2 days',
      urgency: 'high',
      status: 'open',
    },
    {
      ticket_id: 'TKT-00002',
      village_id: mainVillageId,
      asset_type: 'pump',
      asset_id: 1,
      category: 'Pump not working',
      description: 'Solar pump stopped working after rain',
      urgency: 'medium',
      status: 'in_progress',
      technician_name: 'Ramesh Chary',
    },
  ]);

  // SMS Templates (Telugu for TS)
  await knex('sms_templates').insert([
    { template_key: 'household_added',    name: 'Household Added',    message_en: 'Your family has been registered by Panchayat for the solar scheme. Contact Sarpanch for details.',             message_te: 'మీ కుటుంబం సోలార్ పథకానికి నమోదు చేయబడింది. వివరాలకు సర్పంచ్‌ని సంప్రదించండి.' },
    { template_key: 'rooftop_applied',    name: 'Rooftop Applied',    message_en: 'Solar application submitted on your behalf by Sarpanch. Your Application ID: {app_id}',                    message_te: 'సర్పంచ్ ద్వారా మీ సౌర దరఖాస్తు సమర్పించబడింది. దరఖాస్తు ID: {app_id}' },
    { template_key: 'rooftop_approved',   name: 'Rooftop Approved',   message_en: 'Your solar application {app_id} has been approved. Vendor will contact you soon.',                          message_te: 'మీ సౌర దరఖాస్తు {app_id} ఆమోదించబడింది. విక్రేత త్వరలో మిమ్మల్ని సంప్రదిస్తారు.' },
    { template_key: 'rooftop_installed',  name: 'Rooftop Installed',  message_en: 'Solar panels installed at your home. Congratulations! {capacity} kW system active.',                        message_te: 'మీ ఇంట్లో సోలార్ ప్యానెళ్లు స్థాపించబడ్డాయి. అభినందనలు!' },
    { template_key: 'pump_applied',       name: 'Pump Applied',       message_en: 'Solar pump application {app_id} submitted. TS-KUSUM Subsidy: 60% from Central+State Govt.',                message_te: 'సోలార్ పంప్ దరఖాస్తు {app_id} సమర్పించబడింది.' },
    { template_key: 'pump_approved',      name: 'Pump Approved',      message_en: 'Your solar pump application {app_id} approved. Vendor will contact soon.',                                  message_te: 'మీ సోలార్ పంప్ దరఖాస్తు ఆమోదించబడింది.' },
    { template_key: 'pump_installed',     name: 'Pump Installed',     message_en: 'Solar pump installed at your farm. {hp} HP pump now operational.',                                          message_te: 'మీ పొలంలో సోలార్ పంప్ స్థాపించబడింది.' },
    { template_key: 'complaint_raised',   name: 'Complaint Raised',   message_en: 'Complaint #{ticket_id} raised for your solar asset. Technician assigned.',                                  message_te: 'మీ సోలార్ ఆస్తికి ఫిర్యాదు #{ticket_id} నమోదు చేయబడింది.' },
    { template_key: 'complaint_resolved', name: 'Complaint Resolved', message_en: 'Your complaint #{ticket_id} has been resolved. Please share your feedback.',                                message_te: 'మీ ఫిర్యాదు #{ticket_id} పరిష్కరించబడింది.' },
  ]);

  // Schemes (TS-specific)
  await knex('schemes').insert([
    { name: 'PM Surya Ghar TS',     code: 'PMSGTS',     type: 'rooftop', central_subsidy_pct: 30, state_subsidy_pct: 30, eligibility_criteria: 'Residential households with own house in Telangana', valid_from: '2024-01-01', is_active: true },
    { name: 'TS-KUSUM',             code: 'TSKUSUM',    type: 'pump',    central_subsidy_pct: 30, state_subsidy_pct: 30, eligibility_criteria: 'Farmers with agricultural land and water source in TS', valid_from: '2023-01-01', is_active: true },
    { name: 'Telangana Haritha Surya', code: 'THS',     type: 'rooftop', central_subsidy_pct: 25, state_subsidy_pct: 40, eligibility_criteria: 'BPL/EWS households across Telangana State',        valid_from: '2024-06-01', is_active: true },
  ]);

  // Vendors (TS-registered)
  await knex('vendors').insert([
    { name: 'TS Solar Power Ltd',      registration_no: 'TSSPDCL-VND-001', contact_person: 'Anil Kumar',   mobile: '9988776655', email: 'info@tssolar.in',     service_areas: 'Siddipet, Medak, Hyderabad',          rating: 4.2, total_installations: 480 },
    { name: 'AgroSolar Telangana Ltd', registration_no: 'TSSPDCL-VND-002', contact_person: 'Prashanth Rao', mobile: '9977665544', email: 'contact@agrosolar.in',service_areas: 'All Telangana districts',             rating: 4.5, total_installations: 860 },
    { name: 'GreenEnergy TS Systems',  registration_no: 'TSSPDCL-VND-003', contact_person: 'Vijay Bhaskar', mobile: '9966554433', email: 'sales@greenenergy.in', service_areas: 'Warangal, Karimnagar, Siddipet',      rating: 3.9, total_installations: 310 },
  ]);

  console.log('✅ Telangana seed data inserted successfully!');
  console.log('Default credentials: username=sarpanch_ram / mpdo_siddipet / collector_siddipet / state_admin, password=Admin@123');
};
