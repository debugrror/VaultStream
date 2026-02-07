export default function VideoDetails() {
  return (
    <section className="page">
      <h1>Video playback</h1>
      <div className="video-shell">
        <div className="video-placeholder">HLS Player goes here</div>
        <div className="video-meta">
          <h2>Video title</h2>
          <p>Unlisted • Passphrase protected</p>
          <button className="secondary">Share link</button>
        </div>
      </div>
    </section>
  );
}
