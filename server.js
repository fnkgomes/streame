/**
 * Streame / FrameXTV Engine - Dynamic TMDB & Extractor Integration
 * Optimized for Vercel Serverless deployment.
 */

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Rota de Embed Dinâmica com Extratores Reais (Estilo FrameXTV)
app.get('/embed/:tmdbId/:season?/:episode?', (req, res) => {
    const { tmdbId, season, episode } = req.params;
    const query = req.query;
    const server = (query.server || 'barbarian').toLowerCase();

    // Mapeamento dos servidores para players/extratores de terceiros (padrão utilizado por embeds abertos)
    // Você pode substituir pelos endpoints dos extratores que preferir (ex: vidsrc, embed.su, etc.)
    let targetEmbedUrl = '';

    if (season && episode) {
        // É uma Série / Episódio
        targetEmbedUrl = `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`;
    } else {
        // É um Filme
        targetEmbedUrl = `https://vidsrc.to/embed/movie/${tmdbId}`;
    }

    // Retorna um iframe fluido que carrega o player do extrator escolhido mantendo a sua identidade visual
    res.send(`<!DOCTYPE html>
<html lang="en" class="dark h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stream Player | FrameXTV Engine</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background-color: #000; margin: 0; height: 100vh; overflow: hidden; }
    </style>
</head>
<body class="h-full flex items-center justify-center">
    <iframe 
        src="${targetEmbedUrl}" 
        class="w-full h-full border-0" 
        allowfullscreen 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
    </iframe>
</body>
</html>`);
});

// Fallback para a Interface Principal
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Stream engine running on port ${PORT}`));
}

module.exports = app;