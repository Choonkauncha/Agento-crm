import {createOrbMesh,projectOrbVertex} from '../lib/orb-mesh.js';

/** A rotating 3D triangle mesh. Deformation is driven by measured mic/playback energy. */
export function mountCoachOrb(canvas){
 const stage=canvas.closest('.tnCoachOrbStage');
 let lastFrame=0;
 let state='idle',input=0,output=0,inputAt=0,outputAt=0,energy=0,frame=0,dead=false,gl=null,program=null,software=null;
 const mesh=createOrbMesh(),resources=[];
 const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
 const setState=value=>{state=value;stage?.setAttribute('data-voice-state',value);};
 const setLevels=levels=>{
  const now=performance.now();
  if(Number.isFinite(levels?.input)){input=Math.max(0,Math.min(1,levels.input));inputAt=now;}
  if(Number.isFinite(levels?.output)){output=Math.max(0,Math.min(1,levels.output));outputAt=now;}
 };
 function releaseGpu(){for(const [kind,item]of resources)kind==='buffer'?gl?.deleteBuffer(item):gl?.deleteShader(item);resources.length=0;if(program)gl?.deleteProgram(program);program=null;}
 function softwareRenderer(){
  releaseGpu();gl?.getExtension('WEBGL_lose_context')?.loseContext();gl=null;
  // A canvas with an allocated WebGL context cannot also allocate a 2D context.
  const replacement=canvas.ownerDocument.createElement('canvas');replacement.setAttribute('aria-hidden','true');canvas.replaceWith(replacement);canvas=replacement;
  software=canvas.getContext('2d');
  stage?.setAttribute('data-orb-renderer',software?'software-3d':'unavailable');
  stage?.classList.toggle('tnCoachOrbFallback',!software);
 }
 let solid,wire,points,triangleCount,lineCount,uniforms;
 try{
  gl=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'low-power'});
  if(!gl)throw Error('WebGL unavailable');
  const debug=gl.getExtension('WEBGL_debug_renderer_info');
  if(debug&&/swiftshader|llvmpipe/i.test(String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL))))throw Error('Use the efficient software mesh on emulated GPUs');
  const shader=(type,source)=>{const item=gl.createShader(type);resources.push(['shader',item]);gl.shaderSource(item,source);gl.compileShader(item);if(!gl.getShaderParameter(item,gl.COMPILE_STATUS))throw Error('Shader unavailable');return item;};
  program=gl.createProgram();
  gl.attachShader(program,shader(gl.VERTEX_SHADER,`attribute vec3 position;uniform float time;uniform float energy;uniform float pixels;varying vec3 normal;varying float depth;
   void main(){float radius=1.+energy*.15+energy*.08*sin(position.y*9.+time*4.)*cos(position.x*8.-time*3.);float a=time*.18,c=cos(a),s=sin(a),ct=cos(.3),st=sin(.3);mat3 rotation=mat3(c,0.,-s,0.,1.,0.,s,0.,c)*mat3(1.,0.,0.,0.,ct,st,0.,-st,ct);vec3 p=rotation*position*radius;normal=normalize(rotation*position);depth=p.z;float perspective=2.9/(3.6-p.z);gl_Position=vec4(p.xy*perspective*.78,-p.z*.15,1.);gl_PointSize=pixels*(1.3+energy*1.8);}`));
  gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`precision mediump float;uniform float pass;uniform float energy;uniform float speaking;varying vec3 normal;varying float depth;
   void main(){float light=max(0.,dot(normalize(normal),normalize(vec3(-.4,.6,1.))));vec3 cyan=vec3(.13,.9,.96),blue=vec3(.32,.56,1.);vec3 color=mix(cyan,blue,speaking);if(pass<.5){gl_FragColor=vec4(mix(vec3(.015,.07,.14),color*.36,light),.78);}else{float front=.25+.75*max(0.,normal.z);gl_FragColor=vec4(color*(.7+energy*.3),front*(pass>1.5?.9:.65));}}`));
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('WebGL program unavailable');
  const buffer=(target,data)=>{const item=gl.createBuffer();resources.push(['buffer',item]);gl.bindBuffer(target,item);gl.bufferData(target,data,gl.STATIC_DRAW);return item;};
  points=buffer(gl.ARRAY_BUFFER,new Float32Array(mesh.vertices.flat()));gl.useProgram(program);
  const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,3,gl.FLOAT,false,0,0);
  solid=buffer(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(mesh.triangles.flat()));wire=buffer(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(mesh.edges.flat()));
  triangleCount=mesh.triangles.length*3;lineCount=mesh.edges.length*2;
  uniforms=Object.fromEntries(['time','energy','speaking','pass','pixels'].map(name=>[name,gl.getUniformLocation(program,name)]));
  gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  stage?.setAttribute('data-orb-renderer','webgl');stage?.classList.remove('tnCoachOrbFallback');
 }catch{softwareRenderer();}
 const lost=event=>{event.preventDefault();if(!dead)softwareRenderer();};canvas.addEventListener('webglcontextlost',lost,{once:true});
 function render(now){
  if(dead)return;frame=requestAnimationFrame(render);if(document.hidden||now-lastFrame<30)return;lastFrame=now;
  const dpr=Math.min(globalThis.devicePixelRatio||1,2),size=Math.max(1,Math.min(384,Math.round(canvas.getBoundingClientRect().width*dpr)));
  if(canvas.width!==size||canvas.height!==size){canvas.width=size;canvas.height=size;gl?.viewport(0,0,size,size);}
  const live=!['idle','paused','error'].includes(state);
  const target=live?Math.max(now-inputAt<180?input:0,now-outputAt<180?output:0):0;
  energy+=(target-energy)*(target>energy?.35:.12);
  if(Math.abs(Number(stage?.style.getPropertyValue('--orb-energy')||0)-energy)>.01)stage?.style.setProperty('--orb-energy',energy.toFixed(3));
  const time=reduced?0:now*.001;
  if(gl){
   gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);
   gl.uniform1f(uniforms.time,time);gl.uniform1f(uniforms.energy,energy);gl.uniform1f(uniforms.speaking,state==='speaking'?1:0);gl.uniform1f(uniforms.pixels,dpr);
   gl.uniform1f(uniforms.pass,0);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1,1);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,solid);gl.drawElements(gl.TRIANGLES,triangleCount,gl.UNSIGNED_SHORT,0);gl.disable(gl.POLYGON_OFFSET_FILL);
   gl.uniform1f(uniforms.pass,1);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,wire);gl.drawElements(gl.LINES,lineCount,gl.UNSIGNED_SHORT,0);
   gl.uniform1f(uniforms.pass,2);gl.drawArrays(gl.POINTS,0,mesh.vertices.length);
  }else if(software){
   const ctx=software;ctx.clearRect(0,0,size,size);
   const projected=mesh.vertices.map(vertex=>projectOrbVertex(vertex,time,energy,0));
   const color=state==='speaking'?'114,164,255':'65,223,235';
   const screen=point=>[size/2+point.x*size/2,size/2-point.y*size/2];
   const faces=mesh.triangles.map(face=>({face,z:face.reduce((sum,i)=>sum+projected[i].z,0)/3})).sort((a,b)=>a.z-b.z);
   for(const {face,z}of faces){ctx.beginPath();face.forEach((i,j)=>{const [x,y]=screen(projected[i]);if(j)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.closePath();ctx.fillStyle=`rgba(8,28,48,${z>0?.8:.35})`;ctx.fill();ctx.strokeStyle=`rgba(${color},${.15+Math.max(0,z)*.55+energy*.12})`;ctx.lineWidth=dpr*.65;ctx.stroke();}
   for(const point of projected){if(point.z<0)continue;const [x,y]=screen(point);ctx.beginPath();ctx.arc(x,y,dpr*(.7+energy),0,Math.PI*2);ctx.fillStyle=`rgba(${color},${.45+point.z*.4})`;ctx.fill();}
  }
 }
 frame=requestAnimationFrame(render);
 return {setState,setLevels,dispose(){dead=true;cancelAnimationFrame(frame);canvas.removeEventListener('webglcontextlost',lost);releaseGpu();}};
}
