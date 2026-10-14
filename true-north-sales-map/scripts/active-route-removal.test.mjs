import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {reviseBuiltRoute} from '../lib/route-edit.js';
const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const fn=source.slice(source.indexOf('function reviseBuiltStops(){'),source.indexOf('async function optimizeAndDrawRoute'));
const lead=id=>({id,lat:40,lng:-82});
function run(ids,index,remove){
 const stops=ids.map(lead), elements={};
 const state={routeStops:stops,selected:new Set(ids.filter(id=>id!==remove)),leadsById:new Map(stops.map(x=>[x.id,x])),navigating:true,navIndex:index,currentLocation:{lat:40,lng:-82}};
 const calls=[];
 const ctx=vm.createContext({state,navLegToken:0,reviseBuiltRoute,routeBuildKey:()=> 'updated',invalidateBuiltRoute:()=>{state.navigating=false;state.routeStops=[];},endNavigation:()=>{state.navigating=false;},clearNavLayers:()=>{},showNavVisuals:()=>{},loadNavLeg:(here,next)=>calls.push(next.id),drawRoutePreview:()=>{},renderRouteStops:()=>{},publishRouteState:()=>{},$:(id)=>elements[id]??=( {textContent:''})});
 vm.runInContext(fn+'; reviseBuiltStops();',ctx);return {state,calls,ctx};
}
let r=run(['a','b','c'],1,'a');assert.equal(r.state.routeStops[r.state.navIndex].id,'b');assert.deepEqual(r.calls,['b']);
r=run(['a','b','c'],1,'b');assert.equal(r.state.routeStops[r.state.navIndex].id,'c');assert.deepEqual(r.calls,['c']);assert.equal(r.ctx.navLegToken,1);
r=run(['a','b','c'],1,'c');assert.equal(r.state.routeStops[r.state.navIndex].id,'b');
r=run(['a','b'],1,'b');assert.equal(r.state.navigating,false);
r=run(['a'],0,'a');assert.equal(r.state.navigating,false);assert.equal(r.state.routeStops.length,0);
console.log('Active navigation: removing prior/current/future/final stops passed');
