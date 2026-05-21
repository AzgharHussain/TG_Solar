/**
 * Migration: 004 - Notifications, SMS logs, audit logs
 */
exports.up = async function(knex) {
  // SMS logs
  await knex.schema.createTable('sms_logs', (t) => {
    t.increments('id');
    t.string('recipient_mobile', 15).notNullable();
    t.text('message').notNullable();
    t.enu('status', ['sent', 'failed', 'pending']).defaultTo('pending');
    t.string('template_key', 50);
    t.integer('related_id');
    t.string('related_type', 30);
    t.string('provider_message_id');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // In-app notifications
  await knex.schema.createTable('notifications', (t) => {
    t.increments('id');
    t.integer('user_id').references('id').inTable('users');
    t.integer('village_id').references('id').inTable('villages');
    t.string('title').notNullable();
    t.text('message').notNullable();
    t.string('type', 30);
    t.string('link_url');
    t.boolean('is_read').defaultTo(false);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // SMS templates
  await knex.schema.createTable('sms_templates', (t) => {
    t.increments('id');
    t.string('template_key', 50).unique().notNullable();
    t.string('name');
    t.text('message_en').notNullable();
    t.text('message_te');
    t.text('message_hi');
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });

  // Audit logs
  await knex.schema.createTable('audit_logs', (t) => {
    t.increments('id');
    t.integer('user_id').references('id').inTable('users');
    t.string('action', 50).notNullable();
    t.string('entity_type', 50);
    t.integer('entity_id');
    t.text('details_json');
    t.string('ip_address', 45);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Maintenance schedules
  await knex.schema.createTable('maintenance_schedules', (t) => {
    t.increments('id');
    t.integer('village_id').references('id').inTable('villages');
    t.enu('asset_type', ['rooftop', 'pump', 'land_plant', 'street_light']).notNullable();
    t.integer('asset_id');
    t.string('task_description');
    t.date('scheduled_date');
    t.boolean('is_completed').defaultTo(false);
    t.date('completed_date');
    t.string('technician_name');
    t.timestamps(true, true);
  });

  // Schemes
  await knex.schema.createTable('schemes', (t) => {
    t.increments('id');
    t.string('name').notNullable();
    t.string('code', 20).unique();
    t.enu('type', ['rooftop', 'pump', 'land_plant']).notNullable();
    t.decimal('central_subsidy_pct', 5, 2).defaultTo(30);
    t.decimal('state_subsidy_pct', 5, 2).defaultTo(30);
    t.text('eligibility_criteria');
    t.text('required_documents');
    t.date('valid_from');
    t.date('valid_until');
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });

  // Vendors
  await knex.schema.createTable('vendors', (t) => {
    t.increments('id');
    t.string('name').notNullable();
    t.string('registration_no', 30);
    t.string('contact_person');
    t.string('mobile', 15);
    t.string('email');
    t.text('service_areas');
    t.decimal('rating', 3, 1).defaultTo(0);
    t.boolean('is_blacklisted').defaultTo(false);
    t.string('blacklist_reason');
    t.integer('total_installations').defaultTo(0);
    t.integer('complaint_count').defaultTo(0);
    t.timestamps(true, true);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('vendors');
  await knex.schema.dropTableIfExists('schemes');
  await knex.schema.dropTableIfExists('maintenance_schedules');
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('sms_templates');
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('sms_logs');
};
