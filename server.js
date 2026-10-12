/**
 * Streame Engine - Powered by TMDB & Fallback Engine
 */

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Catálogo de segurança (fallback caso a API do TMDB falhe ou não tenha chave)
const FALLBACK_MEDIA = [
    { id: "550", title: "Fight Club", year: "1999", rating: "8.8", type: "movie", poster: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg" },
    { id: "1396", title: "Breaking Bad", year: "2008", rating: "9.5", type: "tv", poster: "https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg" },
    { id: "1368337", title: "The Odyssey", year: "2026", rating: "8.9", type: "movie", poster: "https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&w=600&q=80" },
    { id: "27205", title: "Inception", year: "2010", rating: "8.8", type: "movie", poster: "https://image.tmdb.org/t/p/w500/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg" },
    { id: "157336", title: "Interstellar", year: "2014", rating: "8.7", type: "movie", poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg" }
];

app.get('/api/media', async (req, res) => {
    try {
        if (!TMDB_API_KEY) {
            return res.json({ success: true, results: FALL_BACK_MEDIA || FALLBACK_MEDIA });
        }

        const response = await fetch(`https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_API_KEY}&language=pt-BR`);
        const data = await response.json();

        if (!data.results) {
            return res.json({ success: true, results: FALLBACK_MEDIA });
        }

        const results = data.results.map(item => ({
            id: item.id.toString(),
            title: item.title || item.name || 'Sem Título',
            year: (item.release_date || item.first_air_date || '2026').split('-')[0],
            rating: item.vote_average ? item.vote_average.toFixed(1) : '8.0',
            type: item.media_type || 'movie',
            poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80'
        }));

        res.json({ success: true, results });
    } catch (error) {
        // Em caso de qualquer erro na API externa, retorna o catálogo de fallback para nunca travar a tela
        res.json({ success: true, results: FALLBACK_MEDIA });
    }
});

// Rota de Embed do Player
app.get('/embed/:tmdbId/:season?/:episode?', (req, res) => {
    const { tmdbId, season, episode } = req.params;
    
    // Suporte a filmes e séries (episódios)
    let embedTarget = `https://vidsrc.to/embed/movie/${tmdbId}`;
    if (season && episode) {
        embedTarget = `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`;
    }

    res.send(`<!DOCTYPE html>
<html lang="en" class="dark h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Player | Streame</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background-color: #000; margin: 0; height: 100vh; overflow: hidden; font-family: system-ui, sans-serif; }
    </style>
</head>
<body class="h-full flex flex-col items-center justify-center">
    <div class="absolute top-4 left-4 z-20">
        <a href="/" class="bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg text-xs border border-zinc-700 backdrop-blur transition flex items-center space-x-1.5 shadow-lg">
            <span>← Voltar ao Catálogo</span>
        </a>
    </div>
    <iframe 
        src="${embedTarget}" 
        class="w-full h-full border-0" 
        allowfullscreen 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
    </iframe>
</body>
</html>`);
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Streame server running on port ${PORT}`));
}

module.exports = app;