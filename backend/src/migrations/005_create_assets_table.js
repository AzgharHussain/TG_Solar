// backend/src/migrations/005_create_assets_table.js

exports.up = async function (knex) {
  // ── ASSETS ──────────────────────────────────────────────────────────────────
  await knex.schema.createTable('assets', (t) => {
    t.increments('id').primary();
    t.string('asset_code', 30).notNullable().unique();

    // Ownership
    t.integer('village_id').unsigned().notNullable()
      .references('id').inTable('villages').onDelete('CASCADE');
    t.integer('household_id').unsigned().nullable()
      .references('id').inTable('households').onDelete('SET NULL');
    t.integer('farmer_id').unsigned().nullable()
      .references('id').inTable('farmers').onDelete('SET NULL');
    t.integer('land_parcel_id').unsigned().nullable()
      .references('id').inTable('land_parcels').onDelete('SET NULL');

    // Identity
    t.enu('asset_type', [
      'rooftop', 'pump', 'land_plant', 'inverter', 'battery', 'meter', 'other',
    ]).notNullable().defaultTo('other');
    t.string('name', 200).notNullable();
    t.string('make', 100).nullable();
    t.string('model', 100).nullable();
    t.string('serial_no', 100).nullable();

    // Technical
    t.decimal('capacity_kw', 10, 3).nullable();
    t.date('installation_date').nullable();

    // Warranty / AMC
    t.date('warranty_expiry').nullable();
    t.date('amc_start').nullable();
    t.date('amc_end').nullable();
    t.string('vendor_name', 200).nullable();

    // Status
    t.enu('status', ['active', 'inactive', 'under_repair', 'decommissioned'])
      .notNullable().defaultTo('active');

    // Location
    t.decimal('location_lat', 10, 7).nullable();
    t.decimal('location_lng', 10, 7).nullable();

    // Misc
    t.text('notes').nullable();
    t.boolean('is_deleted').defaultTo(false);
    t.timestamp('deleted_at').nullable();
    t.timestamps(true, true);
  });

  // ── ASSET INSPECTIONS ────────────────────────────────────────────────────────
  await knex.schema.createTable('asset_inspections', (t) => {
    t.increments('id').primary();
    t.integer('asset_id').unsigned().notNullable()
      .references('id').inTable('assets').onDelete('CASCADE');

    t.date('inspection_date').notNullable();
    t.string('inspector_name', 200).notNullable();
    t.enu('condition', ['good', 'fair', 'poor']).notNullable().defaultTo('good');
    t.text('findings').nullable();
    t.text('action_taken').nullable();
    t.string('next_inspection_due', 50).nullable(); // e.g. "6 months"

    t.timestamps(true, true);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('asset_inspections');
  await knex.schema.dropTableIfExists('assets');
};
