import { del, get } from './apiClient';

const MOCK_JOBS_STORAGE_KEY = 'frontend_mock_processing_jobs_v1';

const nowIso = () => new Date().toISOString();

const readMockJobs = () => {
  try {
    const raw = localStorage.getItem(MOCK_JOBS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_error) {
    return [];
  }
};

const writeMockJobs = (jobs) => {
  localStorage.setItem(MOCK_JOBS_STORAGE_KEY, JSON.stringify(jobs));
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const evolveMockJob = (job) => {
  if (job.status === 'completed' || job.status === 'failed') {
    return job;
  }

  const elapsedSec = (Date.now() - new Date(job.createdAt).getTime()) / 1000;
  const updatedJob = { ...job, updatedAt: nowIso() };

  if (elapsedSec < 8) {
    updatedJob.status = 'queued';
    updatedJob.progress = 5;
    return updatedJob;
  }

  if (elapsedSec < 25) {
    updatedJob.status = 'running';
    updatedJob.progress = clamp(Math.round(((elapsedSec - 8) / 17) * 100), 10, 95);
    return updatedJob;
  }

  updatedJob.status = 'completed';
  updatedJob.progress = 100;
  if (!updatedJob.sessionId) {
    updatedJob.sessionId = `sess-local-${updatedJob.id}`;
  }
  return updatedJob;
};

const evolveAndPersistMockJobs = () => {
  const evolved = readMockJobs().map(evolveMockJob);
  writeMockJobs(evolved);
  return evolved;
};

export const createMockJob = (input = {}) => {
  const id = `job-local-${Date.now()}`;
  const job = {
    id,
    status: 'queued',
    progress: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    input,
  };
  const jobs = [job, ...readMockJobs()];
  writeMockJobs(jobs);
  return job;
};

export const getMockJobsSnapshot = () => evolveAndPersistMockJobs();

export const listJobs = async () => {
  try {
    const data = await get('/jobs');
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.jobs)) return data.jobs;
    return [];
  } catch (_error) {
    return evolveAndPersistMockJobs();
  }
};

export const getJob = async (jobId) => {
  try {
    return await get(`/jobs/${jobId}`);
  } catch (_error) {
    const jobs = evolveAndPersistMockJobs();
    return jobs.find((job) => job.id === jobId) ?? null;
  }
};

export const cancelJob = async (jobId) => {
  await del(`/jobs/${jobId}`);
};

export const pollJobUntilTerminal = async (
  jobId,
  { intervalMs = 3000, timeoutMs = 15 * 60 * 1000 } = {}
) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const job = await getJob(jobId);
    if (!job) return null;
    if (job.status === 'completed' || job.status === 'failed') {
      return job;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
};
