const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

pool.on('error', (err) => {
  // Idle clients get dropped by the provider routinely (Neon in particular
  // closes idle connections aggressively) - pg already removes the errored
  // client from the pool and issues a fresh one on the next query, so this
  // is recoverable. Exiting the process here was killing the whole server
  // (and every in-flight request, including the admin panel's parallel
  // products/users/orders load) on what's normally a harmless event.
  console.error('PostgreSQL pool error (recovered):', err.message);
});

module.exports = pool;
