import express from 'express';
import cors from 'cors';
const router = express.Router();

const allowedOrigins = [
  'https://jyjessence.vercel.app',
  'https://frontend-jyjessence.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isVercelPreviewFrontend = /^https?:\/\/frontend-jyjessence-.*\.vercel\.app$/.test(origin);
    const isVercelPreviewMain = /^https?:\/\/jyjessence-.*\.vercel\.app$/.test(origin);
    if (allowedOrigins.includes(origin) || isVercelPreviewFrontend || isVercelPreviewMain) {
      return callback(null, true);
    }
    return callback(new Error('Origen no permitido por CORS'));
  },
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400
};

router.use(cors(corsOptions));
router.options('*', cors(corsOptions));

router.get('/enums', (req, res) => {
  res.json({
    CategoriaPerfume: [
      "ExtraitDeParfum",
      "Parfum",
      "EauDeParfum",
      "EauDeToilette",
      "EauFraiche",
      "Elixir"
    ],
    Genero: [
      "Male",
      "Female",
      "Unisex"
    ],
    Role: [
      "USER",
      "ADMIN"
    ]
  });
});

export default router;
