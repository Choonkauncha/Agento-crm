/** True indexed 3D sphere mesh. Input/output levels come from Gemini audio, never random animation. */
export function mountCoachOrb(canvas){
 const stage=canvas.closest('.tnCoachOrbStage');let state='idle',input=0,output=0,energy=0,frame=0,dead=false;
 const setState=value=>{state=value;stage?.setAttribute('data-voice-state',value);};
 const setLevels=levels=>{if(Number.isFinite(levels?.input))input=Math.max(0,Math.min(1,levels.input));if(Number.isFinite(levels?.output))output=Math.max(0,Math.min(1,levels.output));};
 const gl=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'low-power'});
 const fallback=()=>{canvas.hidden=true;stage?.classList.add('tnCoachOrbFallback');return {setState,setLevels,dispose(){dead=true;}};};
 if(!gl)return fallback();
 const resources=[];let program,solid,wire,triangleCount,lineCount;
 try{
  const shader=(type,source)=>{const s=gl.createShader(type);resources.push(['shader',s]);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Mesh shader failed');return s;};
  program=gl.createProgram();
  gl.attachShader(program,shader(gl.VERTEX_SHADER,`attribute vec3 position;uniform float time;uniform float energy;varying vec3 normal;varying vec3 world;
  void main(){vec3 p=position;float pulse=1.+energy*.17+energy*.055*sin(p.y*14.+time*3.)*cos(p.x*13.-time*2.);p*=pulse;
  float a=time*.14,c=cos(a),s=sin(a);mat3 rotation=mat3(c,0.,s,0.,1.,0.,-s,0.,c);p=rotation*p;normal=normalize(rotation*position);world=p;
  float perspective=2.9/(3.3-p.z);gl_Position=vec4(p.xy*perspective*.86,-p.z*.12,1.);}`));
  gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`precision mediump float;uniform float wirePass;uniform float energy;uniform float speaking;varying vec3 normal;varying vec3 world;
  void main(){vec3 n=normalize(normal);float light=max(0.,dot(n,normalize(vec3(-.5,.8,1.))));float rim=pow(1.-abs(n.z),2.);
  vec3 base=mix(vec3(.01,.12,.22),vec3(.04,.62,.65),light);base=mix(base,vec3(.06,.31,.64),speaking*.35);base+=rim*vec3(.05,.32,.5);
  vec3 line=mix(vec3(.22,.82,.87),vec3(.46,.65,1.),speaking);gl_FragColor=wirePass>.5?vec4(line*(.65+energy*.35),.38+energy*.4):vec4(base,1.);}`));
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Mesh program failed');
  const vertices=[],triangles=[],lines=[],rows=26,cols=40;
  for(let row=0;row<=rows;row++){const phi=Math.PI*row/rows;for(let col=0;col<=cols;col++){const theta=2*Math.PI*col/cols;vertices.push(Math.sin(phi)*Math.cos(theta),Math.cos(phi),Math.sin(phi)*Math.sin(theta));}}
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const a=row*(cols+1)+col,b=a+cols+1;triangles.push(a,b,a+1,b,b+1,a+1);lines.push(a,b,a,a+1,a,b+1);}
  const vertex=gl.createBuffer();resources.push(['buffer',vertex]);gl.bindBuffer(gl.ARRAY_BUFFER,vertex);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
  gl.useProgram(program);const attribute=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,3,gl.FLOAT,false,0,0);
  solid=gl.createBuffer();wire=gl.createBuffer();resources.push(['buffer',solid],['buffer',wire]);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,solid);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(triangles),gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,wire);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(lines),gl.STATIC_DRAW);triangleCount=triangles.length;lineCount=lines.length;
 }catch{for(const [kind,item] of resources)kind==='buffer'?gl.deleteBuffer(item):gl.deleteShader(item);if(program)gl.deleteProgram(program);return fallback();}
 const uniforms=Object.fromEntries(['time','energy','speaking','wirePass'].map(name=>[name,gl.getUniformLocation(program,name)]));
 gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function render(now){
  if(dead)return;frame=requestAnimationFrame(render);if(document.hidden)return;
  const size=Math.max(1,Math.min(512,Math.round(canvas.getBoundingClientRect().width*Math.min(devicePixelRatio||1,2))));
  if(canvas.width!==size||canvas.height!==size){canvas.width=size;canvas.height=size;gl.viewport(0,0,size,size);}
  const target=['idle','paused','error'].includes(state)?0:Math.max(input,output);
  energy+=(target-energy)*.22;
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);
  gl.uniform1f(uniforms.time,reduced?0:now*.001);gl.uniform1f(uniforms.energy,energy);gl.uniform1f(uniforms.speaking,state==='speaking'?1:0);
  gl.uniform1f(uniforms.wirePass,0);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1,1);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,solid);gl.drawElements(gl.TRIANGLES,triangleCount,gl.UNSIGNED_SHORT,0);gl.disable(gl.POLYGON_OFFSET_FILL);
  gl.uniform1f(uniforms.wirePass,1);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,wire);gl.drawElements(gl.LINES,lineCount,gl.UNSIGNED_SHORT,0);
 }
 frame=requestAnimationFrame(render);
 return {setState,setLevels,dispose(){dead=true;cancelAnimationFrame(frame);for(const [kind,item] of resources)kind==='buffer'?gl.deleteBuffer(item):gl.deleteShader(item);gl.deleteProgram(program);}};
}
