import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const dbName = process.env.DB_NAME || 'recipe_box';
const client = new pg.Client({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: dbName,
  password: process.env.DB_PASSWORD || undefined,
  port: Number(process.env.DB_PORT || 5432)
});

function looksLikeImage(url){
  return typeof url === 'string' && /\.(jpe?g|png|gif|webp|svg|avif)(?:\?|$)/i.test(url);
}

async function resolveOg(url){
  try{
    const controller = new AbortController();
    const timeout = setTimeout(()=>controller.abort(), 7000);
    const resp = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'RecipeBox/1.0' } });
    clearTimeout(timeout);
    if(!resp.ok) return null;
    const html = await resp.text();
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    const linkMatch = html.match(/<link[^>]+rel=["']image_src["'][^>]*href=["']([^"']+)["']/i);
    const candidate = (ogMatch && ogMatch[1]) || (linkMatch && linkMatch[1]);
    if(candidate){
      try{
        const base = new URL(url);
        return new URL(candidate, base).toString();
      }catch(e){
        return candidate;
      }
    }
  }catch(e){
    console.warn('resolveOg failed for', url, e.message);
  }
  return null;
}

async function main(){
  await client.connect();
  try{
    const { rows } = await client.query('SELECT id, image_url, title FROM recipes WHERE image_url IS NOT NULL');
    for(const r of rows){
      const { id, image_url, title } = r;
      if(!image_url) continue;
      if(looksLikeImage(image_url)){
        console.log(`#${id} '${title}': already direct image -> ${image_url}`);
        continue;
      }
      console.log(`#${id} '${title}': resolving ${image_url}`);
      const resolved = await resolveOg(image_url);
      if(resolved){
        await client.query('UPDATE recipes SET image_url=$1 WHERE id=$2', [resolved, id]);
        console.log(`  -> updated to ${resolved}`);
      } else {
        console.log('  -> no image found, leaving as-is');
      }
    }
  }finally{
    await client.end();
  }
}

main().catch(err=>{
  console.error(err);
  process.exit(1);
});
