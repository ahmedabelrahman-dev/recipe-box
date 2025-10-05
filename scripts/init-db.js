import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const DB_NAME = process.env.DB_NAME || 'recipe_box';
const SCHEMA_FILE = path.join(process.cwd(), 'db', 'schema.sql');

function runCommand(cmd, args, opts = {}){
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', ...opts });
    p.on('close', code => code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`)));
    p.on('error', reject);
  });
}

async function applySchemaWithPg(clientConfig){
  const schema = fs.readFileSync(SCHEMA_FILE, 'utf8');
  const client = new pg.Client(clientConfig);
  await client.connect();
  try{
    // split statements and run sequentially to avoid multi-statement issues
    const statements = schema.split(/;\s*\n/).map(s => s.trim()).filter(Boolean);
    for(const stmt of statements){
      await client.query(stmt);
    }
  }finally{
    await client.end();
  }
}

async function main(){
  if(!fs.existsSync(SCHEMA_FILE)){
    console.error('Schema file not found at', SCHEMA_FILE);
    process.exit(1);
  }

  console.log(`Attempting to create database "${DB_NAME}" (if it does not exist)...`);

  // First try system tools
  try{
    await runCommand('createdb', [DB_NAME]);
    console.log('Database created or already exists. Trying to apply schema with psql...');
    await runCommand('psql', ['-d', DB_NAME, '-f', SCHEMA_FILE]);
    console.log('Schema applied successfully via psql.');
    return;
  }catch(err){
    console.warn('System utilities (createdb/psql) not available or failed:', err.message);
  }

  // Fallback: use pg client to create DB and run schema
  const adminDb = process.env.DB_ADMIN_DB || 'postgres';
  const clientConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: adminDb,
    password: process.env.DB_PASSWORD || undefined,
    port: Number(process.env.DB_PORT || 5432)
  };

  const adminClient = new pg.Client(clientConfig);
  try{
    await adminClient.connect();
    const exists = await adminClient.query('SELECT 1 FROM pg_database WHERE datname=$1', [DB_NAME]);
    if(exists.rowCount === 0){
      console.log(`Database "${DB_NAME}" does not exist. Creating...`);
      await adminClient.query(`CREATE DATABASE "${DB_NAME}"`);
      console.log('Database created.');
    }else{
      console.log('Database already exists.');
    }
  }catch(err){
    console.error('Failed to create database via pg client:', err.message);
    console.error('You may need to run the script with a Postgres superuser or use system createdb/psql.');
    process.exit(1);
  }finally{
    try{ await adminClient.end(); }catch(e){}
  }

  // Apply schema by connecting to the target DB
  try{
    const targetConfig = {...clientConfig, database: DB_NAME };
    await applySchemaWithPg(targetConfig);
    console.log('Schema applied successfully via pg client.');
  }catch(err){
    console.error('Failed to apply schema via pg client:', err.message);
    process.exit(1);
  }
}

main();
