/**
 * Streame / FrameXTV - Powered by TMDB API & Vercel Serverless
 */

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Insira sua Chave de API do TMDB aqui ou configure como Variável de Ambiente na Vercel (TMDB_API_KEY)
const TMDB_API_KEY = process.env.TMDB_API_KEY || '81381f30d5122abb419c288a2bc2f593';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// API Proxy para buscar filmes populares diretamente do TMDB oficial
app.get('/api/media', async (req, res) => {
    try {
        if (!TMDB_API_KEY || TMDB_API_KEY.includes('SUA_CHAVE')) {
            return res.status(500).json({ success: false, error: "TMDB API Key não configurada no servidor." });
        }

        // Busca filmes populares do TMDB
        const response = await fetch(`https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_API_KEY}&language=pt-BR`);
        const data = await response.json();

        const results = data.results.map(item => ({
            id: item.id.toString(),
            title: item.title || item.name || 'Sem Título',
            year: (item.release_date || item.first_air_date || '2026').split('-')[0],
            rating: item.vote_average ? item.vote_average.toFixed(1) : '8.0',
            type: item.media_type || 'movie',
            poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
            backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : ''
        }));

        res.json({ success: true, results });
    } catch (error) {
        console.error("Erro ao buscar TMDB:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Rota de Embed que garante a reprodução via extrator universal vidsrc
app.get('/embed/:tmdbId', (req, res) => {
    const { tmdbId } = req.params;
    const embedTarget = `https://vidsrc.to/embed/movie/${tmdbId}`;

    res.send(`<!DOCTYPE html>
<html lang="en" class="dark h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stream Player | FrameXTV</title>
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

// Fallback universal para o frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;