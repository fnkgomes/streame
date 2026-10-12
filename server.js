/**
 * Streame Engine - Express Backend & Vercel Serverless Ready
 */

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Catálogo de fallback embutido para garantir que NUNCA fique travado no loading
const STATIC_CATALOG = [
    { id: "550", title: "Fight Club", year: "1999", rating: "8.8", type: "movie", poster: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg" },
    { id: "1396", title: "Breaking Bad", year: "2008", rating: "9.5", type: "tv", poster: "https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg" },
    { id: "27205", title: "Inception", year: "2010", rating: "8.8", type: "movie", poster: "https://image.tmdb.org/t/p/w500/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg" },
    { id: "157336", title: "Interstellar", year: "2014", rating: "8.7", type: "movie", poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg" }
];

// API de Catálogo
app.get('/api/media', async (req, res) => {
    try {
        if (!TMDB_API_KEY) {
            return res.json({ success: true, results: STATIC_CATALOG });
        }

        const response = await fetch(`https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_API_KEY}&language=pt-BR`);
        const data = await response.json();

        if (!data.results) {
            return res.json({ success: true, results: STATIC_CATALOG });
        }

        const results = data.results.map(item => ({
            id: item.id.toString(),
            title: item.title || item.name || 'Sem Título',
            year: (item.release_date || item.first_air_date || '2026').split('-')[0],
            rating: item.vote_average ? item.vote_average.toFixed(1) : '8.0',
            type: item.media_type || 'movie',
            poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg'
        }));

        res.json({ success: true, results });
    } catch (error) {
        res.json({ success: true, results: STATIC_CATALOG });
    }
});

// Rota de Embed do Player
app.get('/embed/:tmdbId/:season?/:episode?', (req, res) => {
    const { tmdbId, season, episode } = req.params;
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
    <iframe src="${embedTarget}" class="w-full h-full border-0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
</body>
</html>`);
});

// Página Inicial renderizada diretamente pelo Express (Garante que nunca dê erro de arquivo estático)
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Streame - Portal de Streaming</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script> tailwind.config = { darkMode: 'class' } </script>
    <style> body { background-color: #09090b; color: #f4f4f5; font-family: system-ui, sans-serif; } </style>
</head>
<body class="min-h-screen flex flex-col">
    <header class="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div class="flex items-center space-x-2">
                <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white">ST</div>
                <span class="font-bold text-lg text-white tracking-wider">Stream<span class="text-indigo-500">e</span></span>
            </div>
        </div>
    </header>
    <main class="flex-grow max-w-7xl w-full mx-auto px-4 py-8 space-y-8">
        <h2 class="text-lg font-bold text-white flex items-center"><i class="fa-solid fa-fire text-indigo-500 mr-2"></i> Tendências e Filmes Populares</h2>
        <div id="media-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div class="text-zinc-500 text-xs col-span-full py-10 text-center">Carregando catálogo...</div>
        </div>
    </main>
    <footer class="border-t border-zinc-800 bg-zinc-950 py-8 text-center text-xs text-zinc-500">
        <p>&copy; 2026 Streame. All rights reserved.</p>
    </footer>
    <script>
        async function loadCatalog() {
            try {
                const res = await fetch('/api/media');
                const data = await res.json();
                if(data.success && data.results.length > 0) {
                    const grid = document.getElementById('media-grid');
                    grid.innerHTML = data.results.map(m => \`
                        <div onclick="window.location.href='/embed/\${m.id}'" class="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden group cursor-pointer transition transform hover:-translate-y-1">
                            <div class="relative aspect-[2/3] bg-zinc-950 overflow-hidden">
                                <img src="\${m.poster}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" alt="\${m.title}">
                                <div class="absolute top-2 right-2 bg-black/70 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono text-amber-400">★ \${m.rating}</div>
                            </div>
                            <div class="p-3 space-y-1">
                                <h3 class="text-xs font-bold text-white truncate">\${m.title}</h3>
                                <p class="text-[10px] text-zinc-400">\${m.year} • <span class="uppercase">\${m.type}</span></p>
                            </div>
                        </div>
                    \`).join('');
                }
            } catch(e) { console.error("Erro:", e); }
        }
        loadCatalog();
    </script>
</body>
</html>`);
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;