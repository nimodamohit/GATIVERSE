// Shared types foundation for GATIVERSE
export interface ServiceHealth {
  status: 'ok' | 'error';
  service: string;
  timestamp: string;
}
