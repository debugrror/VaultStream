export default function Home() {
  return (
    <section className="page">
      <h1>Your private video hub</h1>
      <p>
        Upload unlisted videos, protect them with passphrases, and share playlists with one
        URL.
      </p>
      <div className="grid">
        <div className="card">
          <h2>Quick actions</h2>
          <ul>
            <li>Register or sign in</li>
            <li>Upload a new video</li>
            <li>Create a playlist</li>
          </ul>
        </div>
        <div className="card">
          <h2>Recent uploads</h2>
          <p>Connect the API to load the latest videos.</p>
        </div>
      </div>
    </section>
  );
}
