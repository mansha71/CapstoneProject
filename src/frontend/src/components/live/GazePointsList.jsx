const formatValue = (value) => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return value.toFixed(3);
  return String(value);
};

const GazePointsList = ({ points }) => {
  return (
    <section className="live-side-card">
      <h3 className="live-panel-title">Gaze Points</h3>
      {!points.length ? (
        <p className="helper-text">No gaze points received yet.</p>
      ) : (
        <div className="live-gaze-points-table-wrap">
          <table className="live-gaze-points-table">
            <thead>
              <tr>
                <th>tMs</th>
                <th>participantId</th>
                <th>x</th>
                <th>y</th>
                <th>confidence</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((point, index) => (
                <tr key={`${point.participantId}-${point.tMs}-${index}`}>
                  <td>{point.tMs}</td>
                  <td>{point.participantId}</td>
                  <td>{formatValue(point.x)}</td>
                  <td>{formatValue(point.y)}</td>
                  <td>{formatValue(point.confidence)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default GazePointsList;
