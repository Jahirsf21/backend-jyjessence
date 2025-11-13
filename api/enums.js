export default function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({
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
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
