export default function Channel() {
  return (
    <section className="page">
      <h1>Channel</h1>
      <div className="channel-card">
        <div>
          <h2>Creator Name</h2>
          <p>Unlisted videos • 3 playlists</p>
        </div>
        <button className="secondary">Edit channel</button>
      </div>
      <div className="grid">
        <div className="card">Channel video</div>
        <div className="card">Channel video</div>
        <div className="card">Channel video</div>
      </div>
    </section>
  );
}
