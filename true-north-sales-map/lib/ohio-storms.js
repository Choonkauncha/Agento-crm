import {parseSpcCsv} from './storm-maps.js';
export async function recentOhioStorms({days=3,fetchImpl=fetch,now=new Date()}={}){
 const reportDay=new Date(now);if(reportDay.getUTCHours()<12)reportDay.setUTCDate(reportDay.getUTCDate()-1);
 const jobs=[],pages=new Map();
 const pageFor=(url)=>{if(!pages.has(url))pages.set(url,(async()=>{const r=await fetchImpl(url,{signal:AbortSignal.timeout(4000)});if(!r.ok)throw Error('unavailable');const html=await r.text();if(!html.includes('TAB_Rpts_Filtered'))throw Error('invalid page');return html;})());return pages.get(url);};
 for(let i=0;i<days;i++){
  const day=new Date(reportDay);day.setUTCDate(day.getUTCDate()-i);const date=day.toISOString().slice(0,10),key=date.slice(2).replaceAll('-','');
  for(const kind of ['hail','wind','torn'])jobs.push({date,kind,url:`https://www.spc.noaa.gov/climo/reports/${i===0?'today':i===1?'yesterday':key+'_rpts'}_filtered_${kind}.csv`,page:`https://origin-west-www-spc.woc.noaa.gov/climo/reports/${key}_rpts.html`});
 }
 const sources=await Promise.all(jobs.map(async job=>{
  try{
   let r,sourceUrl=job.url;
   const pull=url=>fetchImpl(url,{headers:{'user-agent':'True North Restorations Field Map','accept':'text/csv'},signal:AbortSignal.timeout(4000)});
   try{r=await pull(sourceUrl);}catch{}
   if(!r?.ok){sourceUrl=job.url.replace('www.spc.noaa.gov','origin-west-www-spc.woc.noaa.gov');try{r=await pull(sourceUrl);}catch{r=null;}}
   let rows;
   if(r?.ok){const text=await r.text();if(/^Time,/i.test(text.trim()))rows=parseSpcCsv(text,job.kind);}
   if(!rows){const html=await pageFor(job.page);rows=parseSpcReportPage(html,job.kind);sourceUrl=job.page;}
   const reports=rows.filter(row=>row.state.toUpperCase()==='OH').map(row=>{
    const date=new Date(job.date+'T12:00:00Z');const time=row.time.padStart(4,'0');
    if(Number(time.slice(0,2))<12)date.setUTCDate(date.getUTCDate()+1);
    date.setUTCHours(Number(time.slice(0,2)),Number(time.slice(2)),0,0);
    return {...row,measure:row.kind==='hail'?Number(row.measure)/100:row.measure,capturedAt:date.toISOString(),source:sourceUrl};
   });return {...job,ok:true,reports};
  }catch{return {...job,ok:false,reports:[]};}
 }));
 let warnings=[],warningsAvailable=false;
 try{const r=await fetchImpl('https://api.weather.gov/alerts/active?area=OH',{headers:{'user-agent':'True North Restorations Field Map',accept:'application/geo+json'},signal:AbortSignal.timeout(7000)});if(!r.ok)throw Error();const d=await r.json();warningsAvailable=true;warnings=(d.features||[]).filter(f=>/Tornado|Thunderstorm|Wind|Hail/i.test(f.properties?.event||'')).map(f=>({event:f.properties.event,area:f.properties.areaDesc,issued:f.properties.sent,expires:f.properties.expires,source:f.properties['@id']||'https://api.weather.gov/alerts/active?area=OH'}));}catch{}
 const reports=sources.flatMap(source=>source.reports).sort((a,b)=>b.capturedAt.localeCompare(a.capturedAt));
 return {state:'OH',updatedAt:now.toISOString(),days,period:'SPC report days run 12:00 UTC to 11:59 UTC the following day.',reports:reports.slice(0,100),reportCount:reports.length,warnings,warningsAvailable,coverage:sources.map(({reports,...source})=>source),partial:sources.some(source=>!source.ok)||!warningsAvailable,notice:'Preliminary NOAA reports; missing feeds are unavailable, not evidence of no storms. Hail size is inches; wind speed is mph or UNK. Storm reports and warnings do not establish roof damage.'};
}

export function parseSpcReportPage(html,kind){
 const text=html.split(/id=["']TAB_Rpts_Filtered["']/)[1];if(!text)throw Error('Filtered reports unavailable');
 let current='';const rows=[];
 const clean=value=>value.replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").trim();
 for(const match of text.split('</div>')[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)){
  const row=match[1];if(/<th/i.test(row)&&/Reports/i.test(row)){if(/Tornado Reports/i.test(row))current='torn';else if(/Hail Reports/i.test(row))current='hail';else if(/Wind Reports/i.test(row))current='wind';}
  if(current!==kind)continue;
  const cols=[...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>clean(m[1]));
  if(cols.length!==8||!/^\d{3,4}$/.test(cols[0]))continue;
  const lat=Number(cols[5])/100,lng=-Math.abs(Number(cols[6]))/100;
  if(!Number.isFinite(lat)||!Number.isFinite(lng))continue;
  rows.push({kind,time:cols[0],measure:cols[1],location:cols[2],county:cols[3],state:cols[4],lat,lng,comments:cols[7]});
 }
 return rows;
}
