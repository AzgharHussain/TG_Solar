const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'postgres' // connect to default db first
  });

  try {
    await client.connect();
    console.log('Connected to remote postgres database successfully!');
    
    // Check if database exists
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'ts_gram_surya_darshan'");
    if (res.rowCount === 0) {
      console.log("Database 'ts_gram_surya_darshan' does not exist. Creating it...");
      await client.query("CREATE DATABASE ts_gram_surya_darshan");
      console.log("Database 'ts_gram_surya_darshan' created successfully!");
    } else {
      console.log("Database 'ts_gram_surya_darshan' already exists!");
    }
  } catch (err) {
    console.error('Error connecting or creating database:', err);
  } finally {
    await client.end();
  }
}

run();
