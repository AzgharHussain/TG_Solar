/**
 * Migration: 001 - Create base geography tables
 */
exports.up = async function(knex) {
  // States
  await knex.schema.createTable('states', (t) => {
    t.increments('id');
    t.string('name').notNullable();
    t.string('code', 10);
    t.timestamps(true, true);
  });

  // Districts
  await knex.schema.createTable('districts', (t) => {
    t.increments('id');
    t.integer('state_id').references('id').inTable('states').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('code', 10);
    t.timestamps(true, true);
  });

  // Mandals
  await knex.schema.createTable('mandals', (t) => {
    t.increments('id');
    t.integer('district_id').references('id').inTable('districts').onDelete('CASCADE');
    t.string('name').notNullable();
    t.timestamps(true, true);
  });

  // Villages
  await knex.schema.createTable('villages', (t) => {
    t.increments('id');
    t.integer('mandal_id').references('id').inTable('mandals').onDelete('CASCADE');
    t.integer('district_id').references('id').inTable('districts').onDelete('CASCADE');
    t.integer('state_id').references('id').inTable('states').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('village_code', 20);
    t.integer('total_household_target').defaultTo(0);
    t.integer('total_farmer_target').defaultTo(0);
    t.decimal('land_plant_target_mw', 10, 2).defaultTo(2.0);
    t.text('boundary_geojson');
    t.string('logo_url');
    t.decimal('latitude', 10, 7);
    t.decimal('longitude', 10, 7);
    t.timestamps(true, true);
  });

  // Users
  await knex.schema.createTable('users', (t) => {
    t.increments('id');
    t.string('username', 50).unique().notNullable();
    t.string('password_hash').notNullable();
    t.string('full_name').notNullable();
    t.string('mobile', 15).unique();
    t.enu('role', ['sarpanch', 'mandal', 'district', 'state', 'admin']).notNullable();
    t.integer('village_id').references('id').inTable('villages');
    t.integer('mandal_id').references('id').inTable('mandals');
    t.integer('district_id').references('id').inTable('districts');
    t.integer('state_id').references('id').inTable('states');
    t.boolean('is_active').defaultTo(true);
    t.string('preferred_language', 5).defaultTo('en');
    t.timestamp('last_login_at');
    t.timestamps(true, true);
  });

  // Login history
  await knex.schema.createTable('login_history', (t) => {
    t.increments('id');
    t.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
    t.string('ip_address', 45);
    t.string('user_agent');
    t.boolean('success').defaultTo(true);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('login_history');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('villages');
  await knex.schema.dropTableIfExists('mandals');
  await knex.schema.dropTableIfExists('districts');
  await knex.schema.dropTableIfExists('states');
};
