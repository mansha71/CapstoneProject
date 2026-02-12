import JobStatusCard from './JobStatusCard';
import EmptyState from './EmptyState';

const JobList = ({ jobs, onCancel }) => {
  if (!jobs.length) {
    return (
      <EmptyState
        title="No processing jobs yet"
        description="Imported sessions will appear here while they are queued and running."
      />
    );
  }

  return (
    <div className="jobs-grid">
      {jobs.map((job) => (
        <JobStatusCard key={job.id} job={job} onCancel={onCancel} />
      ))}
    </div>
  );
};

export default JobList;
