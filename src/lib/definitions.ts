export type InstanceStatus = 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'CREATED' | 'CLOSED';

export type Instance = {
  instanceName: string;
  apiKey: string;
  status: InstanceStatus;
  channel?: string;
  number?: string;
  owner?: string; // JID from API
};

// Represents the structure from the /instance/fetchInstances endpoint
export type ApiInstance = {
  name: string;
  connectionStatus: 'open' | 'close' | 'connecting';
  ownerJid: string;
  // Add other fields from the API as needed
}
