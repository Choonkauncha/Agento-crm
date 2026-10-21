/** Indexed spherical triangle geometry shared by GPU and software renderers. */
export function createOrbMesh(rows=18,cols=28){
 const vertices=[],triangles=[],edges=[];
 for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){
  const phi=Math.PI*row/rows,theta=2*Math.PI*(col+(row%2)*.5)/cols;
  vertices.push([Math.sin(phi)*Math.cos(theta),Math.cos(phi),Math.sin(phi)*Math.sin(theta)]);
 }
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  const a=row*(cols+1)+col,b=a+cols+1;
  triangles.push([a,b,a+1],[b,b+1,a+1]);edges.push([a,b],[a,a+1],[a,b+1]);
 }
 return {vertices,triangles,edges};
}
export function projectOrbVertex(vertex,time,input=0,output=0){
 const [x,y,z]=vertex,energy=Math.max(input,output);
 const radius=1+energy*.15+energy*.08*Math.sin(y*9+time*4)*Math.cos(x*8-time*3);
 const a=time*.18,c=Math.cos(a),s=Math.sin(a),tilt=.3,ct=Math.cos(tilt),st=Math.sin(tilt);
 const ty=y*ct-z*st,tz=y*st+z*ct;
 const px=(x*c+tz*s)*radius,py=ty*radius,pz=(-x*s+tz*c)*radius;
 const perspective=2.9/(3.6-pz);
 return {x:px*perspective*.78,y:py*perspective*.78,z:pz};
}
