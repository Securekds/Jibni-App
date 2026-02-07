import PubSub from 'pubsub-js'


const usePubSub = ()=>{
  /**
   * 
   * @param {string} name 
   * @param {function} callback : (name, payload)=>{}
   * @returns 
   */
  const on = (name:string, callback:(e:any, params:any)=>void) => {
    console.log('[PUBSUB] Subscribing to event:', name);
    const token = PubSub.subscribe(name, (eventName, data) => {
      console.log('[PUBSUB] Event received:', eventName, 'data:', data);
      callback(eventName, data);
    });
    // token will be used later to unsubscribe
    return token
  }

  const off = (token: any)=>{
    PubSub.unsubscribe(token);
  }

  const publish = (name: string, payload = {}) => {
    console.log('[PUBSUB] Publishing event:', name, 'with payload:', payload);
    PubSub.publish(name, payload);
  }

  const EVENTS = {
    destination_address_selected: "destination_address_selected", 
    address_choosed_from_map: "address_choosed_from_map", 
    mission_accepted:"mission_accepted",
    mission_expired: "mission_expired", 
    mission_rejected: "mission_rejected",
    driver_accepted: "driver_accepted", // New: Detailed driver acceptance with info
    driver_location_update: "driver_location_update", // New: Real-time driver location updates
  }
  
  return {on,off, publish, EVENTS}
}

export default usePubSub
