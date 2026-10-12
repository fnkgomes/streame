/**
 * Streame / FrameXTV Engine - Optimized for Vercel Serverless
 */

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// API de Catálogo
app.get('/api/media', (req, res) => {
    res.json({
        success: true,
        results: [
            {
                id: "550",
                title: "Fight Club",
                year: "1999",
                rating: "8.8",
                type: "movie",
                poster: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80"
            },
            {
                id: "1396",
                title: "Breaking Bad",
                year: "2008",
                rating: "9.5",
                type: "tv",
                poster: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80"
            },
            {
                id: "1368337",
                title: "The Odyssey",
                year: "2026",
                rating: "8.9",
                type: "movie",
                poster: "https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&w=600&q=80"
            }
        ]
    });
});

// Rota de Embed do Player (Evita 404 na Vercel)
app.get('/embed/:tmdbId', (req, res) => {
    const { tmdbId } = req.params;
    
    // URL do player extrator espelho (padrão de embeds abertos)
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
        <a href="/" class="bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg text-xs border border-zinc-700 backdrop-blur transition flex items-center space-x-1.5">
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

// Fallback para o Frontend Principal
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;