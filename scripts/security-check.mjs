// Never print matching values. Checks tracked files plus public build output.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const failures = new Set();
const secrets = new Set();
const names = /^(SUPABASE_SERVICE_ROLE_KEY|INTERNAL_KEY|TURNSTILE_SECRET_KEY|CLOUDFLARE_API_TOKEN|SESSION_SECRET|DATABASE_URL)$/;
for (const [name, value] of Object.entries(process.env)) if (names.test(name) && value && value.length >= 16) secrets.add(value);
for (const file of ['.dev.vars', '.env', '.env.local', '.env.production']) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*(?:export\s+)?([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && names.test(m[1])) {
      const value = m[2].replace(/^(['"])(.*)\1$/, '$2');
      if (value.length >= 16) secrets.add(value);
    }
  }
}
// Cloudflare's documented always-pass test secret is deliberately public.
secrets.delete('1x0000000000000000000000000000000AA');
function check(file, publicAsset = false) {
  if (!existsSync(file) || !statSync(file).isFile()) return;
  const text = readFileSync(file, 'utf8');
  if (publicAsset && [...secrets].some(s => text.includes(s))) failures.add(file + ': private environment value');
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) failures.add(file + ': private key');
  for (const token of text.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) ?? []) {
    try { if (JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).role === 'service_role') failures.add(file + ': service-role JWT'); } catch {}
  }
  if (/sb_secret_[A-Za-z0-9_-]{20,}/.test(text)) failures.add(file + ': Supabase secret key');
}
for (const file of tracked) {
  if (/(^|\/)(\.dev\.vars(?:\..*)?|\.env(?:\..*)?)$/.test(file) && !/\.(example|sample|template)$/.test(file)) failures.add(file + ': tracked environment file');
  check(file, true);
}
function walk(dir) { if (!existsSync(dir)) return; for (const entry of readdirSync(dir, { withFileTypes: true })) { const path = join(dir, entry.name); if (entry.isDirectory()) walk(path); else if (entry.isFile()) check(path, true); } }
for (const dir of ['out', '.next/static', '.open-next/assets']) walk(dir);
if (failures.size) { console.error([...failures].join('\n')); process.exit(1); }
console.log('Secret checks passed (tracked files and available public build assets).');
