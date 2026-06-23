const fs = require('fs');
const path = require('path');

// 1. Simple parser for .env file
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found at:', envPath);
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  envContent.split(/\r?\n/).forEach(line => {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || !line.includes('=')) return;
    const [key, ...valueParts] = line.split('=');
    env[key.trim()] = valueParts.join('=').trim();
  });
  return env;
}

const env = loadEnv();
console.log('Parsed .env variables:');
console.log('- POSTGRES_DB:', env.POSTGRES_DB);
console.log('- POSTGRES_USER:', env.POSTGRES_USER);
console.log('- POSTGRES_PASSWORD:', env.POSTGRES_PASSWORD ? '****' : '(not set)');
console.log('- DATABASE_URL:', env.DATABASE_URL);
console.log('- PORT:', env.PORT);
console.log('--------------------------------------------------');

// Load pg from backend node_modules
const { Client } = require(path.join(__dirname, 'backend', 'node_modules', 'pg'));

async function testConnection(configName, connectionConfig) {
  console.log(`Testing connection using configuration: ${configName}...`);
  const client = new Client(connectionConfig);
  try {
    await client.connect();
    console.log(`✅ Success! Connected using ${configName}.`);
    const res = await client.query('SELECT current_database(), current_user, version();');
    console.log('Database Info:');
    console.log(' - Database:', res.rows[0].current_database);
    console.log(' - User:', res.rows[0].current_user);
    console.log(' - Version:', res.rows[0].version.split(',')[0]);
    await client.end();
    return true;
  } catch (err) {
    console.error(`❌ Failed connecting using ${configName}:`, err.message);
    try {
      await client.end();
    } catch (_) {}
    return false;
  }
}

async function runTests() {
  // Test 1: Literal DATABASE_URL from .env
  let urlParsed = env.DATABASE_URL;
  await testConnection('Literal DATABASE_URL from .env', { connectionString: urlParsed });

  // Test 2: Localhost translated DATABASE_URL (if host is 'db')
  if (urlParsed && urlParsed.includes('@db:')) {
    const localUrl = urlParsed.replace('@db:', '@127.0.0.1:');
    console.log('\n--- Retrying with host "127.0.0.1" (local machine) instead of docker "db" ---');
    await testConnection('Localhost translated DATABASE_URL', { connectionString: localUrl });
  }

  // Test 3: Credentials from POSTGRES_* env variables on localhost
  if (env.POSTGRES_USER && env.POSTGRES_PASSWORD && env.POSTGRES_DB) {
    console.log('\n--- Testing connection with individual POSTGRES_* environment credentials on localhost ---');
    const localCredsConfig = {
      host: '127.0.0.1',
      port: 5432,
      user: env.POSTGRES_USER,
      password: env.POSTGRES_PASSWORD,
      database: env.POSTGRES_DB,
    };
    await testConnection('Individual POSTGRES_* variables on localhost', localCredsConfig);
  }
}

runTests();
