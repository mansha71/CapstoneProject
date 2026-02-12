import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <section className="page-shell home-page">
      <div className="page-header-row">
        <div>
          <h1>Choose Workflow</h1>
          <p>Select how you want to analyze instructor performance.</p>
        </div>
      </div>

      <div className="page-grid home-workflow-grid">
        <article className="page-panel home-workflow-card">
          <h2>Post-Processing</h2>
          <p className="helper-text">
            Upload recordings, track processing jobs, and review finalized analytics on completed sessions.
          </p>
          <div className="row-actions">
            <Link to="/sessions" className="primary-link">Go to Sessions</Link>
            <Link to="/sessions/import" className="secondary-link">Import Recording</Link>
          </div>
        </article>

        <article className="page-panel home-workflow-card">
          <h2>Live Analysis</h2>
          <p className="helper-text">
            Start operational live runs for central camera + gaze overlay monitoring.
          </p>
          <div className="row-actions">
            <Link to="/live" className="primary-link">Start Live Workflow</Link>
          </div>
        </article>
      </div>
    </section>
  );
};

export default HomePage;
