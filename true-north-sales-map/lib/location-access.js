/** Request location without relying on Safari's Permissions API state. */
export function locationAccessMessage(error){
 if(error?.code===1)return 'Location is blocked. On iPhone, enable Location Services for Safari Websites and allow Location in this site’s Safari Website Settings. Then reload once and tap Clock In again.';
 if(error?.code===3)return 'Location took too long to arrive. Move where GPS or Wi-Fi is available, then tap Clock In again.';
 return 'Your device could not provide a location. Check Location Services and your connection, then try Clock In again.';
}
export function requestLocation({geo=globalThis.navigator?.geolocation,secure=globalThis.isSecureContext!==false}={}){
 if(!secure)return Promise.reject(Error('Location requires the secure HTTPS version of this app.'));
 if(!geo)return Promise.reject(Error('Location is unavailable in this browser. Open the app directly in Safari or Chrome.'));
 return new Promise((resolve,reject)=>{
  const success=position=>resolve({lat:position.coords.latitude,lng:position.coords.longitude,accuracy:position.coords.accuracy});
  const failure=error=>reject(Object.assign(Error(locationAccessMessage(error)),{code:error?.code}));
  try{
   geo.getCurrentPosition(success,error=>{
    if(error?.code===1){failure(error);return;}
    // A coarse fix can succeed when high-accuracy GPS is slow or unavailable.
    try{geo.getCurrentPosition(success,failure,{enableHighAccuracy:false,maximumAge:10000,timeout:15000});}catch(error){failure(error);}
   },{enableHighAccuracy:true,maximumAge:5000,timeout:25000});
  }catch(error){failure(error);}
 });
}
