import express from 'express';
import { nanoid } from 'nanoid';

const router = express.Router();
const playlists = new Map();

router.post('/', (req, res) => {
  const { name, videoIds = [] } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Playlist name is required.' });
  }
  const id = nanoid();
  const playlist = { id, name, videoIds, shareId: nanoid(10) };
  playlists.set(id, playlist);
  res.status(201).json(playlist);
});

router.get('/:id', (req, res) => {
  const playlist = playlists.get(req.params.id);
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found.' });
  }
  res.json(playlist);
});

router.get('/share/:shareId', (req, res) => {
  const playlist = [...playlists.values()].find((item) => item.shareId === req.params.shareId);
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found.' });
  }
  res.json(playlist);
});

export default router;
