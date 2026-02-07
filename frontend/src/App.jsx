import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import VideoDetails from './pages/VideoDetails.jsx';
import PlaylistDetails from './pages/PlaylistDetails.jsx';
import Channel from './pages/Channel.jsx';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/videos/:id" element={<VideoDetails />} />
        <Route path="/playlists/:id" element={<PlaylistDetails />} />
        <Route path="/channels/:id" element={<Channel />} />
      </Routes>
    </Layout>
  );
}
