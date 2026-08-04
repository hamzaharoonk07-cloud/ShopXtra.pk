require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

// Neon's own driver keeps a WebSocket connection warm instead of doing a
// fresh TCP+TLS handshake per request like node-postgres does - that
// handshake was adding ~1s to every single API call (confirmed by direct
// timing). Only used when DATABASE_URL points at Neon; falls back to plain
// node-postgres for local/non-Neon setups (DB_HOST etc).
const pool = process.env.DATABASE_URL
  ? new (require('@neondatabase/serverless').Pool)({
      connectionString: process.env.DATABASE_URL,
    })
  : new (require('pg').Pool)({
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
