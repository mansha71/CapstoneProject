const formatTimestamp = (timestamp) => {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleTimeString();
};

const SessionControlsCard = ({
  status,
  connected,
  lastMessageAt,
}) => {
  return (
    <section className="live-side-card">
      <h3>Session Controls</h3>
      <p className="helper-text">Connected: {connected ? 'Yes' : 'No'}</p>
      <p className="helper-text">Status: {status}</p>
      <p className="helper-text">Last update: {formatTimestamp(lastMessageAt)}</p>
    </section>
  );
};

export default SessionControlsCard;
