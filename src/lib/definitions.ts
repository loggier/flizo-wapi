export type Instance = {
  instanceName: string;
  apiKey: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'CREATED';
};
