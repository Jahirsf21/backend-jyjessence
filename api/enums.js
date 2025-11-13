import express from 'express';
const router = express.Router();

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
