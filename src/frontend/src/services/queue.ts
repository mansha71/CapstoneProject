import { get, post } from './apiClient';

export const getQueueHealth = async () => {
  return await get('/queue/health');
};

export const recoverQueue = async () => {
  return await post('/queue/recover', {});
};

