/**
 * Migration: 003 - Land parcels, applications, SHG, complaints
 */
exports.up = async function(knex) {
  // Land parcels
  await knex.schema.createTable('land_parcels', (t) => {
    t.increments('id');
    t.integer('village_id').references('id').inTable('villages').onDelete('CASCADE').notNullable();
    t.string('survey_number', 50);
    t.decimal('extent_acres', 10, 2);
    t.enu('land_use', ['fallow', 'agricultural', 'wasteland', 'government']).defaultTo('fallow');
    t.string('owner_name');
    t.string('owner_contact', 15);
    t.text('geojson_polygon');
    t.decimal('distance_from_village', 10, 2);
    t.decimal('grid_distance', 10, 2);
    t.enu('status', ['identified', 'contacted', 'negotiation', 'agreed', 'signed', 'installed']).defaultTo('identified');
    t.date('status_date');
    t.text('status_notes');
    t.decimal('plant_capacity_mw', 10, 2);
    t.date('tender_floated_date');
    t.string('vendor_selected');
    t.date('installation_start');
    t.date('installation_completion');
    t.date('commissioning_date');
    t.string('lease_duration');
    t.decimal('lease_amount', 12, 2);
    t.timestamps(true, true);
  });

  // Land parcel documents
  await knex.schema.createTable('land_parcel_docs', (t) => {
    t.increments('id');
    t.integer('land_parcel_id').references('id').inTable('land_parcels').onDelete('CASCADE');
    t.string('doc_type');
    t.string('file_url').notNullable();
    t.string('file_name');
    t.timestamps(true, true);
  });

  // Applications (rooftop + pump)
  await knex.schema.createTable('applications', (t) => {
    t.increments('id');
    t.string('application_id', 20).unique().notNullable();
    t.enu('type', ['rooftop', 'pump']).notNullable();
    t.integer('household_id').references('id').inTable('households');
    t.integer('farmer_id').references('id').inTable('farmers');
    t.integer('village_id').references('id').inTable('villages').notNullable();
    t.enu('status', ['submitted', 'surveyed', 'approved', 'rejected', 'installed']).defaultTo('submitted');
    t.date('submitted_date');
    t.date('site_visit_date');
    t.text('site_visit_notes');
    t.date('approval_date');
    t.text('rejection_reason');
    t.date('installation_date');
    t.decimal('requested_hp', 5, 1);
    t.decimal('subsidy_central_pct', 5, 2).defaultTo(30);
    t.decimal('subsidy_state_pct', 5, 2).defaultTo(30);
    t.decimal('total_cost', 12, 2);
    t.decimal('beneficiary_contribution', 12, 2);
    t.string('vendor_id');
    t.text('approval_comments');
    t.timestamps(true, true);
  });

  // Application documents
  await knex.schema.createTable('application_docs', (t) => {
    t.increments('id');
    t.integer('application_id').references('id').inTable('applications').onDelete('CASCADE');
    t.string('doc_type');
    t.string('file_url');
    t.timestamps(true, true);
  });

  // SHG (Self Help Groups)
  await knex.schema.createTable('shg', (t) => {
    t.increments('id');
    t.string('shg_id', 20).unique().notNullable();
    t.integer('village_id').references('id').inTable('villages').onDelete('CASCADE');
    t.string('name').notNullable();
    t.date('registration_date');
    t.integer('member_count').defaultTo(0);
    t.string('bank_account', 20);
    t.string('bank_name');
    t.string('ifsc', 11);
    t.string('contact_name');
    t.string('contact_mobile', 15);
    t.specificType('wards_covered', 'text[]');
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });

  // SHG assets
  await knex.schema.createTable('shg_assets', (t) => {
    t.increments('id');
    t.integer('shg_id').references('id').inTable('shg').onDelete('CASCADE');
    t.enu('asset_type', ['common_plant', 'street_lights', 'water_supply', 'other']);
    t.string('asset_description');
    t.date('assignment_date');
    t.decimal('revenue_share_pct', 5, 2);
    t.string('agreement_doc_url');
    t.timestamps(true, true);
  });

  // SHG collections
  await knex.schema.createTable('shg_collections', (t) => {
    t.increments('id');
    t.integer('shg_id').references('id').inTable('shg').onDelete('CASCADE');
    t.string('month_year', 10);
    t.decimal('amount', 12, 2);
    t.enu('payment_method', ['cash', 'upi', 'bank_transfer']).defaultTo('cash');
    t.string('receipt_no', 30);
    t.text('notes');
    t.timestamps(true, true);
  });

  // SHG expenses
  await knex.schema.createTable('shg_expenses', (t) => {
    t.increments('id');
    t.integer('shg_id').references('id').inTable('shg').onDelete('CASCADE');
    t.string('category');
    t.string('description');
    t.decimal('amount', 12, 2);
    t.date('expense_date');
    t.string('bill_doc_url');
    t.timestamps(true, true);
  });

  // Maintenance complaints
  await knex.schema.createTable('complaints', (t) => {
    t.increments('id');
    t.string('ticket_id', 20).unique().notNullable();
    t.integer('village_id').references('id').inTable('villages').notNullable();
    t.enu('asset_type', ['rooftop', 'pump', 'land_plant', 'street_light', 'other']).notNullable();
    t.integer('asset_id');
    t.string('category');
    t.text('description');
    t.string('photo_url');
    t.enu('urgency', ['high', 'medium', 'low']).defaultTo('medium');
    t.enu('status', ['open', 'in_progress', 'resolved', 'closed']).defaultTo('open');
    t.string('technician_name');
    t.string('technician_mobile', 15);
    t.date('assigned_date');
    t.date('expected_resolution_date');
    t.text('resolution_notes');
    t.string('after_repair_photo_url');
    t.integer('customer_feedback_rating');
    t.date('resolved_date');
    t.timestamps(true, true);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('complaints');
  await knex.schema.dropTableIfExists('shg_expenses');
  await knex.schema.dropTableIfExists('shg_collections');
  await knex.schema.dropTableIfExists('shg_assets');
  await knex.schema.dropTableIfExists('shg');
  await knex.schema.dropTableIfExists('application_docs');
  await knex.schema.dropTableIfExists('applications');
  await knex.schema.dropTableIfExists('land_parcel_docs');
  await knex.schema.dropTableIfExists('land_parcels');
};
