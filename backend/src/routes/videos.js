import express from 'express';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { getSignedPlaybackUrl } from '../services/hls.js';
import { saveVideoRecord, videoStore } from '../services/videoStore.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('video'), async (req, res, next) => {
  try {
    const { title, visibility = 'unlisted', passphrase } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: 'Video file is required.' });
    }

    const video = saveVideoRecord({
      id: nanoid(),
      title: title || req.file.originalname,
      uploadPath: req.file.path,
      visibility,
      passphrase: passphrase || null
    });

    res.status(201).json(video);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req, res) => {
  const video = videoStore.get(req.params.id);
  if (!video) {
    return res.status(404).json({ error: 'Video not found.' });
  }
  res.json(video);
});

router.post('/:id/playback', (req, res) => {
  const video = videoStore.get(req.params.id);
  if (!video) {
    return res.status(404).json({ error: 'Video not found.' });
  }

  if (video.visibility === 'passphrase' && video.passphrase !== req.body.passphrase) {
    return res.status(403).json({ error: 'Passphrase required.' });
  }

  const playbackUrl = getSignedPlaybackUrl(video.id);
  res.json({ playbackUrl });
});

export default router;
