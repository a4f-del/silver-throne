/* Silver Throne — step34: static release smoke for GitHub Pages/PWA.
 * node dev/test-beta-release-assets.js
 * No network, no account credentials and no game-save mutation. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
const worker=fs.readFileSync(path.join(root,'sw.js'),'utf8');
function srcAttrs(tag){return Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*["']([^"']*)["']/g)].map(m=>[m[1].toLowerCase(),m[2]]));}
function local(url){
 if(!url||/^(?:[a-z]+:)?\/\//i.test(url)||/^(?:data:|#)/i.test(url))return null;
 const pathname=decodeURIComponent(url.split(/[?#]/)[0]);
 assert(pathname&&!pathname.startsWith('/')&&!pathname.split('/').includes('..'),'Unsafe local path: '+url);
 const full=path.join(root,pathname);
 assert(fs.existsSync(full),'Missing web asset: '+url);
 assert(fs.statSync(full).isFile(),'Expected file asset: '+url);
 return {url,pathname,full};
}
const scripts=[...html.matchAll(/<script\b[^>]*\bsrc=["'][^"']+["'][^>]*><\/script>/gi)].map(m=>srcAttrs(m[0]).src).filter(Boolean);
const links=[...html.matchAll(/<link\b[^>]*>/gi)].map(m=>srcAttrs(m[0]));
const assets=scripts.concat(links.filter(a=>['stylesheet','manifest','icon','apple-touch-icon'].includes(a.rel)).map(a=>a.href));
const installed=assets.map(local).filter(Boolean);
const names=installed.map(x=>x.pathname);
assert(names.length>=45,'Release unexpectedly omits most scripts/assets');
assert.equal(new Set(names).size,names.length,'Duplicate local scripts/CSS would cause double initialization');
for(const a of installed){
 if(/\.(?:js|css)$/i.test(a.pathname))
  assert(/\?v=\d{4}\.\d{2}\.\d{2}-\d+/.test(a.url),
   'Cache-busting missing for '+a.pathname);
 if(a.pathname.endsWith('.js'))new Function(fs.readFileSync(a.full,'utf8'));
}
for(const img of manifest.icons||[])local(img.src);
assert(manifest.start_url==='./'&&manifest.scope==='./');
assert(manifest.display==='standalone'&&manifest.orientation==='any');
assert(html.includes('name="viewport"'));
assert(html.includes('viewport-fit=cover'));
assert(worker.includes("r.method !== 'GET' || u.origin !== self.location.origin"),
 'Service worker must not intercept Supabase or third-party requests');
assert(worker.includes("caches.match(r, { ignoreSearch: r.mode === 'navigate' })"),
 'Offline navigation must use existing cache fallback');
for(const name of ['fierarie-filtre.js','bresle-cosmetice.js','lume.js','tron.js','cont.js']){
 assert(names.includes(name),'Critical module missing: '+name);
}
const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
for(const t of inline)if(t[1].trim())new Function(t[1]);
console.log('OK: '+installed.length+' local web assets, '+(manifest.icons||[]).length+
 ' PWA icons, '+scripts.length+' scripts, no duplicates/missing files, cache-busting and JS syntax.');
