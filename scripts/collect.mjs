import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {parseListings,parseDetail,stableId,classify} from '../lib/boletin-parser.mjs';
const file='public/data/opportunities.json';let previous={items:[],sync:{}};try{previous=JSON.parse(await readFile(file,'utf8'))}catch{}
const now=new Date().toISOString(),feed='https://bogota.gov.co/boletin-de-oferta-internacional/';
async function read(url){const u=new URL(url);if(u.protocol!=='https:'||u.hostname!=='bogota.gov.co')throw Error('Origen no permitido');const r=await fetch(url,{signal:AbortSignal.timeout(30000),headers:{'User-Agent':'BogotaOfertaTracker/3.0'}});if(!r.ok)throw Error(`HTTP ${r.status}`);return r.text()}
const candidates=new Map(),warnings=[];
for(let page=1;page<=4;page++){try{for(const o of parseListings(await read(feed+(page>1?'?page='+page:''))))candidates.set(o.url,o)}catch(e){warnings.push(String(e))}}
if(!candidates.size)throw Error('La fuente no devolvió oportunidades. Se conserva la última edición.');
const items=new Map(previous.items.map(o=>[o.id,o]));let updated=0;
for(const row of candidates.values()){try{const detail=parseDetail(await read(row.url),row.title),id=stableId(row.url),old=items.get(id);items.set(id,{...row,...detail,id,title:row.title,type:classify(row.title,row.category),org:detail.org||'Consultar oferente',audience:detail.audience||'Comunidad',deadline:detail.deadline||row.deadline,opening:'',funding:detail.funding||'Consultar convocatoria',status:'Por revisar',owner:'',notes:'',selected:false,verified:false,live:true,firstSeen:old?.firstSeen||now,lastChecked:now,sourceUrl:row.url});updated++}catch(e){warnings.push(row.title+': '+e)}}
if(!updated)throw Error('No se pudieron leer las fichas. Se conserva la última edición.');
await mkdir('public/data',{recursive:true});await writeFile(file,JSON.stringify({items:[...items.values()],sync:{state:'ok',lastSuccess:now,updated,warnings}},null,2));console.log(`${updated} fichas actualizadas; ${warnings.length} avisos`);
