import { Link } from 'react-router-dom';

export default function Layout({ children }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="logo">VaultStream</div>
        <nav className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/channels/me">My Channel</Link>
        </nav>
        <button className="primary">Upload</button>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
