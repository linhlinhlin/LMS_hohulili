import { HealthStatus } from '../../domain/types';

const READY_AI_SERVICE_STATUSES = new Set(['available', 'configured', 'ready']);

export function isAiHealthReady(health: Pick<HealthStatus, 'status' | 'aiServiceStatus'> | null | undefined): boolean {
  const apiStatus = health?.status?.trim().toLowerCase();
  const aiServiceStatus = health?.aiServiceStatus?.trim().toLowerCase();

  return apiStatus === 'healthy' && READY_AI_SERVICE_STATUSES.has(aiServiceStatus ?? '');
}
