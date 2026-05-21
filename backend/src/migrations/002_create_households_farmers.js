/**
 * Migration: 002 - Create household and farmer tables
 */
exports.up = async function(knex) {
  // Households
  await knex.schema.createTable('households', (t) => {
    t.increments('id');
    t.string('household_id', 20).unique().notNullable();
    t.integer('village_id').references('id').inTable('villages').onDelete('CASCADE').notNullable();
    t.string('head_name').notNullable();
    t.string('mobile', 15);
    t.string('aadhaar', 12);
    t.string('ward_no', 5);
    t.string('house_no', 20).notNullable();
    t.integer('family_members').defaultTo(1);
    t.string('bpl_card_no', 30);
    t.string('consumer_no', 30);
    t.decimal('avg_monthly_bill', 10, 2);
    t.enu('roof_type', ['flat', 'sloped', 'tiled', 'thatched']).defaultTo('flat');
    t.decimal('roof_length', 10, 2);
    t.decimal('roof_width', 10, 2);
    t.decimal('roof_area', 10, 2);
    t.decimal('recommended_capacity', 10, 2);
    t.decimal('slope_factor', 5, 2).defaultTo(1.0);
    t.decimal('latitude', 10, 7);
    t.decimal('longitude', 10, 7);
    t.enu('solar_status', ['not_applied', 'applied', 'installed']).defaultTo('not_applied');
    t.date('installation_date');
    t.decimal('installed_capacity', 10, 2);
    t.string('vendor_name');
    t.text('internal_notes');
    t.boolean('is_deleted').defaultTo(false);
    t.timestamp('deleted_at');
    t.string('deleted_reason');
    t.timestamps(true, true);
  });

  // Household photos
  await knex.schema.createTable('household_photos', (t) => {
    t.increments('id');
    t.integer('household_id').references('id').inTable('households').onDelete('CASCADE');
    t.enu('photo_type', ['house_front', 'roof', 'electricity_bill', 'installation', 'other']);
    t.string('file_url').notNullable();
    t.string('file_name');
    t.timestamps(true, true);
  });

  // Farmers
  await knex.schema.createTable('farmers', (t) => {
    t.increments('id');
    t.string('farmer_id', 20).unique().notNullable();
    t.integer('village_id').references('id').inTable('villages').onDelete('CASCADE').notNullable();
    t.string('name').notNullable();
    t.string('mobile', 15).notNullable();
    t.string('aadhaar', 12);
    t.string('survey_number', 50);
    t.decimal('land_extent', 10, 2);
    t.string('sy_no_block', 50);
    t.enu('current_pump_type', ['diesel', 'electric', 'none']).defaultTo('none');
    t.decimal('current_pump_hp', 5, 1);
    t.enu('water_source', ['borewell', 'open_well', 'canal', 'tank']).defaultTo('borewell');
    t.specificType('crops', 'text[]');
    t.enu('irrigation_need', ['year_round', 'seasonal', 'rain_fed']).defaultTo('seasonal');
    t.decimal('latitude', 10, 7);
    t.decimal('longitude', 10, 7);
    t.enu('pump_status', ['no_pump', 'diesel', 'electric', 'applied', 'installed']).defaultTo('no_pump');
    t.date('installation_date');
    t.decimal('installed_hp', 5, 1);
    t.string('vendor_name');
    t.text('internal_notes');
    t.boolean('is_deleted').defaultTo(false);
    t.timestamps(true, true);
  });

  // Farmer documents
  await knex.schema.createTable('farmer_documents', (t) => {
    t.increments('id');
    t.integer('farmer_id').references('id').inTable('farmers').onDelete('CASCADE');
    t.enu('doc_type', ['pahani', 'passbook', 'aadhaar', 'installation', 'other']);
    t.string('file_url').notNullable();
    t.string('file_name');
    t.timestamps(true, true);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('farmer_documents');
  await knex.schema.dropTableIfExists('farmers');
  await knex.schema.dropTableIfExists('household_photos');
  await knex.schema.dropTableIfExists('households');
};
