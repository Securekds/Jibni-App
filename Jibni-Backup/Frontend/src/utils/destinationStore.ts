// Simple global store for destination data (bypasses event system)
let destinationData: any = null;

export const setDestinationData = (data: any) => {
  console.log('[DEST_STORE] Setting destination data:', data);
  destinationData = data;
};

export const getDestinationData = () => {
  const data = destinationData;
  console.log('[DEST_STORE] Getting destination data:', data);
  // Clear after getting to prevent re-triggering
  destinationData = null;
  return data;
};

export const clearDestinationData = () => {
  console.log('[DEST_STORE] Clearing destination data');
  destinationData = null;
};
