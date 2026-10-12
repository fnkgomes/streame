/**
 * Streame - Node.js / Express Backend & Player Engine
 * Complete with Embed Endpoints, Stream Providers, Fallback Logic, and postMessage SDK support.
 * Optimized for Vercel Serverless deployment.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Mock database / catalog for sample TMDB IDs
const MOCK_MEDIA = {
    // Movie: Fight Club (TMDB ID: 550)
    "550": {
        title: "Fight Club (1999)",
        type: "movie",
        backdrop: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1920&q=80",
        streams: {
            barbarian: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            archer: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
            goblin: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
            pekka: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4"
        },
        subtitles: [
            { label: "English (CC)", lang: "en" },
            { label: "Portuguese (BR)", lang: "pt-BR" },
            { label: "Spanish", lang: "es" }
        ]
    },
    // TV Show: Breaking Bad (TMDB ID: 1396)
    "1396": {
        title: "Breaking Bad",
        type: "tv",
        backdrop: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80",
        seasons: {
            "1": {
                "1": {
                    title: "S01E01 - Pilot",
                    streams: {
                        barbarian: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
                        archer: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                        goblin: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
                        pekka: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                    }
                },
                "2": {
                    title: "S01E02 - Cat's in the Bag...",
                    streams: {
                        barbarian: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
                        archer: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
                        goblin: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
                        pekka: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
                    }
                }
            }
        },
        subtitles: [
            { label: "English", lang: "en" },
            { label: "Spanish", lang: "es" }
        ]
    }
};

// Provider status telemetry
const providersStatus = {
    barbarian: { name: "Barbarian I", latency: "14ms", uptime: "99.99%", status: "operational", load: "34%" },
    archer: { name: "Archer II", latency: "22ms", uptime: "99.95%", status: "operational", load: "48%" },
    goblin: { name: "Goblin III", latency: "45ms", uptime: "98.80%", status: "degraded", load: "89%" },
    pekka: { name: "P.E.K.K.A IV", latency: "12ms", uptime: "100%", status: "operational", load: "21%" }
};

app.get('/api/providers', (req, res) => {
    res.json({ success: true, timestamp: new Date().toISOString(), providers: providersStatus });
});

// Embed Player Route (Movie or TV Episode)
app.get('/embed/:tmdbId/:season?/:episode?', (req, res) => {
    const { tmdbId, season, episode } = req.params;
    const query = req.query;

    let media = MOCK_MEDIA[tmdbId];
    if (!media) {
        media = {
            title: `Media Stream #${tmdbId}`,
            type: season ? "tv" : "movie",
            backdrop: query.poster || "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1920&q=80",
            streams: {
                barbarian: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                archer: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
                goblin: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
                pekka: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4"
            },
            subtitles: [{ label: "English", lang: "en" }]
        };
    }

    let episodeTitle = media.title;
    let streamUrls = media.streams;

    if (season && episode && media.seasons && media.seasons[season] && media.seasons[season][episode]) {
        const epData = media.seasons[season][episode];
        episodeTitle = `${media.title} - ${epData.title}`;
        streamUrls = epData.streams;
    } else if (season && episode) {
        episodeTitle = `${media.title} - S${season}E${episode}`;
    }

    const customTitle = query.title || episodeTitle;
    const autoplay = query.autoplay === '1' ? 'true' : 'false';
    const muted = query.muted === '1' ? 'true' : 'false';
    const startTime = parseFloat(query.t || query.start || 0);
    const initialSpeed = parseFloat(query.speed || 1.0);
    const showControls = query.controls !== '0';
    const requestedProvider = (query.server || query.provider || 'barbarian').toLowerCase();
    const posterImg = query.poster || media.backdrop;

    res.send(`<!DOCTYPE html>
<html lang="en" class="dark h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${customTitle} | Streame Player</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: { extend: { colors: { brand: { 500: '#6366f1', 600: '#4f46e5' } } } }
        }
    </script>
    <style>
        body { background-color: #09090b; color: #f4f4f5; font-family: system-ui, -apple-system, sans-serif; user-select: none; }
        input[type="range"] { accent-color: #6366f1; }
        .glow { box-shadow: 0 0 25px rgba(99, 102, 241, 0.3); }
    </style>
</head>
<body class="h-full flex flex-col overflow-hidden relative m-0 p-0">

    <div id="player-container" class="relative w-full h-full flex items-center justify-center bg-black group overflow-hidden">
        
        <div id="poster-overlay" class="absolute inset-0 bg-cover bg-center z-20 transition-opacity duration-700 flex flex-col items-center justify-center cursor-pointer" style="background-image: url('${posterImg}');">
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
            <div class="relative z-10 flex flex-col items-center p-6 text-center">
                <div class="w-20 h-20 rounded-full bg-indigo-600/90 hover:bg-indigo-500 flex items-center justify-center text-white text-3xl shadow-2xl glow transition transform hover:scale-110 mb-4">
                    <i class="fa-solid fa-play ml-1"></i>
                </div>
                <h1 class="text-xl md:text-2xl font-bold text-white tracking-wide drop-shadow">${customTitle}</h1>
                <p class="text-xs text-zinc-400 mt-1 uppercase tracking-widest font-mono">Powered by Streame Engine</p>
            </div>
        </div>

        <video id="video-element" class="w-full h-full object-contain" preload="metadata" playsinline>
            <source id="video-source" src="${streamUrls[requestedProvider] || streamUrls.barbarian}" type="video/mp4">
            Your browser does not support the video tag.
        </video>

        <div id="top-bar" class="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-10 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div class="flex items-center space-x-3">
                <div class="w-3 h-3 rounded-full bg-indigo-500 animate-pulse"></div>
                <span class="text-sm font-semibold text-white tracking-wide drop-shadow">${customTitle}</span>
            </div>
            <div class="flex items-center space-x-2 bg-zinc-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-zinc-800 text-xs font-mono text-indigo-400">
                <i class="fa-solid fa-server mr-1"></i>
                <span id="active-provider-badge">${requestedProvider.toUpperCase()}</span>
            </div>
        </div>

        ${showControls ? `
        <div id="controls-bar" class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-10 flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            
            <div class="w-full flex items-center mb-3 group/prog cursor-pointer">
                <div id="progress-container" class="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden relative group-hover/prog:h-2.5 transition-all">
                    <div id="buffered-bar" class="absolute top-0 left-0 bottom-0 bg-zinc-600 w-0"></div>
                    <div id="played-bar" class="absolute top-0 left-0 bottom-0 bg-indigo-500 w-0"></div>
                </div>
            </div>

            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <button id="play-pause-btn" class="text-white hover:text-indigo-400 text-lg transition">
                        <i class="fa-solid fa-play" id="play-icon"></i>
                    </button>
                    <div class="flex items-center space-x-2 group/vol">
                        <button id="mute-btn" class="text-white hover:text-indigo-400 text-sm transition">
                            <i class="fa-solid fa-volume-high" id="volume-icon"></i>
                        </button>
                        <input type="range" id="volume-slider" min="0" max="1" step="0.05" value="${muted ? 0 : 1}" class="w-16 md:w-24 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer">
                    </div>
                    <div class="text-xs font-mono text-zinc-400">
                        <span id="current-time">00:00</span> / <span id="duration">00:00</span>
                    </div>
                </div>

                <div class="flex items-center space-x-3">
                    <div class="relative">
                        <select id="provider-select" class="bg-zinc-900/90 text-zinc-200 text-xs border border-zinc-700 rounded px-2 py-1 focus:outline-none focus:border-indigo-500">
                            <option value="barbarian" ${requestedProvider === 'barbarian' ? 'selected' : ''}>Barbarian I</option>
                            <option value="archer" ${requestedProvider === 'archer' ? 'selected' : ''}>Archer II</option>
                            <option value="goblin" ${requestedProvider === 'goblin' ? 'selected' : ''}>Goblin III</option>
                            <option value="pekka" ${requestedProvider === 'pekka' ? 'selected' : ''}>P.E.K.K.A IV</option>
                        </select>
                    </div>

                    <button id="speed-btn" class="text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2 py-1 rounded transition">
                        ${initialSpeed}x
                    </button>

                    <button id="fullscreen-btn" class="text-white hover:text-indigo-400 text-sm transition">
                        <i class="fa-solid fa-expand"></i>
                    </button>
                </div>
            </div>
        </div>` : ''}

        <div id="toast" class="absolute top-16 right-4 bg-zinc-900/90 border border-zinc-700 text-zinc-200 px-4 py-2 rounded-lg text-xs shadow-xl transform translate-x-32 opacity-0 transition-all duration-300 z-30">
            <span id="toast-msg">Server switched</span>
        </div>
    </div>

    <script>
        const video = document.getElementById('video-element');
        const posterOverlay = document.getElementById('poster-overlay');
        const playPauseBtn = document.getElementById('play-pause-btn');
        const playIcon = document.getElementById('play-icon');
        const muteBtn = document.getElementById('mute-btn');
        const volumeIcon = document.getElementById('volume-icon');
        const volumeSlider = document.getElementById('volume-slider');
        const currentTimeEl = document.getElementById('current-time');
        const durationEl = document.getElementById('duration');
        const progressContainer = document.getElementById('progress-container');
        const playedBar = document.getElementById('played-bar');
        const bufferedBar = document.getElementById('buffered-bar');
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        const providerSelect = document.getElementById('provider-select');
        const speedBtn = document.getElementById('speed-btn');
        const activeProviderBadge = document.getElementById('active-provider-badge');
        const toast = document.getElementById('toast');

        const streamSources = ${JSON.stringify(streamUrls)};
        let currentProvider = '${requestedProvider}';
        let isStarted = false;

        video.muted = ${muted};
        video.playbackRate = ${initialSpeed};
        if (${startTime} > 0) {
            video.currentTime = ${startTime};
        }

        function showToast(msg) {
            document.getElementById('toast-msg').innerText = msg;
            toast.classList.remove('translate-x-32', 'opacity-0');
            setTimeout(() => {
                toast.classList.add('translate-x-32', 'opacity-0');
            }, 2500);
        }

        function formatTime(seconds) {
            if (isNaN(seconds)) return "00:00";
            const m = Math.floor(seconds / 60);
            const s = Math.floor(seconds % 60);
            return (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
        }

        function startPlayback() {
            if (!isStarted) {
                isStarted = true;
                posterOverlay.style.opacity = '0';
                setTimeout(() => posterOverlay.style.display = 'none', 700);
            }
            video.play().then(() => {
                if (playIcon) playIcon.className = "fa-solid fa-pause";
                parent.postMessage({ event: 'streame:play' }, '*');
            }).catch(err => console.log("Autoplay blocked:", err));
        }

        posterOverlay.addEventListener('click', startPlayback);

        if (${autoplay}) {
            setTimeout(startPlayback, 300);
        }

        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => {
                if (video.paused) {
                    startPlayback();
                } else {
                    video.pause();
                    if (playIcon) playIcon.className = "fa-solid fa-play";
                    parent.postMessage({ event: 'streame:pause' }, '*');
                }
            });
        }

        video.addEventListener('timeupdate', () => {
            currentTimeEl.innerText = formatTime(video.currentTime);
            durationEl.innerText = formatTime(video.duration);
            const percent = (video.currentTime / video.duration) * 100;
            if (playedBar) playedBar.style.width = percent + '%';

            parent.postMessage({
                event: 'streame:timeupdate',
                currentTime: video.currentTime,
                duration: video.duration,
                percent: percent
            }, '*');
        });

        video.addEventListener('progress', () => {
            if (video.buffered.length > 0 && video.duration > 0) {
                const bufferedEnd = video.buffered.end(video.buffered.length - 1);
                const buffPercent = (bufferedEnd / video.duration) * 100;
                if (bufferedBar) bufferedBar.style.width = buffPercent + '%';
            }
        });

        if (progressContainer) {
            progressContainer.addEventListener('click', (e) => {
                const rect = progressContainer.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                video.currentTime = pos * video.duration;
            });
        }

        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                video.volume = e.target.value;
                video.muted = (e.target.value == 0);
                updateVolumeIcon();
            });
        }

        if (muteBtn) {
            muteBtn.addEventListener('click', () => {
                video.muted = !video.muted;
                volumeSlider.value = video.muted ? 0 : video.volume;
                updateVolumeIcon();
            });
        }

        function updateVolumeIcon() {
            if (video.muted || video.volume === 0) {
                volumeIcon.className = "fa-solid fa-volume-xmark";
            } else if (video.volume < 0.5) {
                volumeIcon.className = "fa-solid fa-volume-low";
            } else {
                volumeIcon.className = "fa-solid fa-volume-high";
            }
        }

        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen();
                } else {
                    document.exitFullscreen();
                }
            });
        }

        function switchProvider(providerName) {
            if (!streamSources[providerName]) {
                showToast("Provider unavailable, falling back to Barbarian I");
                providerName = 'barbarian';
            }
            currentProvider = providerName;
            if (activeProviderBadge) activeProviderBadge.innerText = providerName.toUpperCase();
            if (providerSelect) providerSelect.value = providerName;

            const currentTime = video.currentTime;
            const wasPlaying = !video.paused;

            video.src = streamSources[providerName];
            video.currentTime = currentTime;
            if (wasPlaying) {
                video.play();
            }
            showToast("Switched stream to " + providerName.toUpperCase());
            parent.postMessage({ event: 'streame:providerChange', provider: providerName }, '*');
        }

        if (providerSelect) {
            providerSelect.addEventListener('change', (e) => {
                switchProvider(e.target.value);
            });
        }

        const speeds = [1, 1.25, 1.5, 2, 0.5];
        if (speedBtn) {
            speedBtn.addEventListener('click', () => {
                let currentIdx = speeds.indexOf(video.playbackRate);
                let nextIdx = (currentIdx + 1) % speeds.length;
                video.playbackRate = speeds[nextIdx];
                speedBtn.innerText = speeds[nextIdx] + 'x';
                showToast("Playback speed: " + speeds[nextIdx] + 'x');
            });
        }

        window.addEventListener('message', (event) => {
            const data = event.data;
            if (!data || !data.action) return;

            switch (data.action) {
                case 'play':
                    startPlayback();
                    break;
                case 'pause':
                    video.pause();
                    if (playIcon) playIcon.className = "fa-solid fa-play";
                    break;
                case 'seek':
                    if (typeof data.time === 'number') video.currentTime = data.time;
                    break;
                case 'seekBy':
                    if (typeof data.seconds === 'number') video.currentTime += data.seconds;
                    break;
                case 'setVolume':
                    if (typeof data.volume === 'number') {
                        video.volume = Math.max(0, Math.min(1, data.volume));
                        if (volumeSlider) volumeSlider.value = video.volume;
                        video.muted = (video.volume === 0);
                        updateVolumeIcon();
                    }
                    break;
                case 'mute':
                    video.muted = true;
                    if (volumeSlider) volumeSlider.value = 0;
                    updateVolumeIcon();
                    break;
                case 'setProvider':
                    if (data.provider) switchProvider(data.provider.toLowerCase());
                    break;
            }
        });
    </script>
</body>
</html>`);
});

// Serve Frontend Developer Portal & Interactive Playground
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ensure public directory and index.html exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}

const frontendHtml = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Streame - Ultra-Fast Stream Embeds & SDK Portal</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        brand: { 500: '#6366f1', 600: '#4f46e5', 900: '#312e81' }
                    }
                }
            }
        }
    </script>
    <style>
        body { background-color: #09090b; color: #f4f4f5; font-family: system-ui, -apple-system, sans-serif; }
        .glow { box-shadow: 0 0 30px rgba(99, 102, 241, 0.25); }
        code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #18181b; }
        ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #52525b; }
    </style>
</head>
<body class="min-h-screen flex flex-col selection:bg-indigo-500 selection:text-white">

    <header class="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div class="flex items-center space-x-3">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-black text-lg glow">
                    ST
                </div>
                <div>
                    <span class="font-bold text-lg tracking-tight text-white">Stream<span class="text-indigo-400">e</span></span>
                    <span class="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full">v2.4 Engine</span>
                </div>
            </div>
            <nav class="hidden md:flex items-center space-x-6 text-sm text-zinc-400">
                <a href="#playground" class="hover:text-white transition">Playground</a>
                <a href="#docs" class="hover:text-white transition">Documentation</a>
                <a href="#sdk" class="hover:text-white transition">SDK & postMessage</a>
                <a href="#infrastructure" class="hover:text-white transition">Infrastructure</a>
            </nav>
            <div class="flex items-center space-x-3">
                <a href="#playground" class="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-lg text-xs transition shadow-lg shadow-indigo-600/30">
                    <i class="fa-solid fa-play mr-1.5"></i> Launch Embed
                </a>
            </div>
        </div>
    </header>

    <section class="py-16 md:py-24 border-b border-zinc-800/60 bg-gradient-to-b from-indigo-950/20 via-zinc-950 to-zinc-950 relative overflow-hidden">
        <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-transparent to-transparent pointer-events-none"></div>
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-indigo-400 mb-6">
                <i class="fa-solid fa-bolt text-amber-400"></i>
                <span>Ultra-fast, clean, and responsive HTML5 stream embeds</span>
            </div>
            <h1 class="text-4xl md:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
                High-Performance Video Embeds for <span class="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Movies & TV Shows</span>
            </h1>
            <p class="mt-6 text-base md:text-lg text-zinc-400 max-w-2xl mx-auto">
                Easily integrate high-bitrate video streams into any web app, CMS, or streaming portal using standard IFrames or JavaScript postMessage controls.
            </p>
        </div>
    </section>

    <main class="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20">

        <section id="playground" class="scroll-mt-24">
            <div class="flex flex-col md:flex-row md:items-end justify-between mb-8">
                <div>
                    <h2 class="text-2xl font-bold text-white tracking-tight flex items-center">
                        <i class="fa-solid fa-code text-indigo-400 mr-3"></i> Interactive Embed Playground
                    </h2>
                    <p class="text-sm text-zinc-400 mt-1">Configure player parameters, test TMDB IDs, and preview live streams instantly.</p>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div class="lg:col-span-5 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-5">
                    <h3 class="text-sm font-semibold text-zinc-200 uppercase tracking-wider flex items-center justify-between">
                        <span>Configuration</span>
                        <button onclick="resetConfig()" class="text-xs text-indigo-400 hover:underline normal-case">Reset Defaults</button>
                    </h3>

                    <div class="space-y-4">
                        <div>
                            <label class="block text-xs font-medium text-zinc-400 mb-1.5">TMDB ID / Media Item</label>
                            <select id="cfg-tmdb" onchange="updatePlayground()" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500">
                                <option value="550">550 - Fight Club (Movie)</option>
                                <option value="1396">1396 - Breaking Bad (TV Show)</option>
                                <option value="9999">9999 - Custom Sample Stream</option>
                            </select>
                        </div>

                        <div id="tv-selectors" class="grid grid-cols-2 gap-3 hidden">
                            <div>
                                <label class="block text-xs font-medium text-zinc-400 mb-1.5">Season</label>
                                <select id="cfg-season" onchange="updatePlayground()" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500">
                                    <option value="1">Season 1</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-zinc-400 mb-1.5">Episode</label>
                                <select id="cfg-episode" onchange="updatePlayground()" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500">
                                    <option value="1">Episode 1 (Pilot)</option>
                                    <option value="2">Episode 2</option>
                                </select>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-medium text-zinc-400 mb-1.5">Extraction Server</label>
                                <select id="cfg-server" onchange="updatePlayground()" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500">
                                    <option value="barbarian">Barbarian I</option>
                                    <option value="archer">Archer II</option>
                                    <option value="goblin">Goblin III</option>
                                    <option value="pekka">P.E.K.K.A IV</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-zinc-400 mb-1.5">Playback Speed</label>
                                <select id="cfg-speed" onchange="updatePlayground()" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500">
                                    <option value="1">1.0x (Normal)</option>
                                    <option value="1.25">1.25x</option>
                                    <option value="1.5">1.5x</option>
                                    <option value="2">2.0x</option>
                                    <option value="0.5">0.5x</option>
                                </select>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-medium text-zinc-400 mb-1.5">Autoplay</label>
                                <select id="cfg-autoplay" onchange="updatePlayground()" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500">
                                    <option value="1">1 (Enabled)</option>
                                    <option value="0" selected>0 (Disabled)</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-zinc-400 mb-1.5">Muted</label>
                                <select id="cfg-muted" onchange="updatePlayground()" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500">
                                    <option value="0">0 (Unmuted)</option>
                                    <option value="1">1 (Muted)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-medium text-zinc-400 mb-1.5">Custom Overlay Title (Optional)</label>
                            <input type="text" id="cfg-title" oninput="updatePlayground()" placeholder="e.g. Special Edition Stream" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500">
                        </div>
                    </div>
                </div>

                <div class="lg:col-span-7 flex flex-col space-y-6">
                    <div class="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex flex-col shadow-xl">
                        <div class="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800 text-xs text-zinc-400">
                            <span class="flex items-center font-mono">
                                <span class="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                                Live IFrame Preview
                            </span>
                            <span id="preview-url-label" class="font-mono text-zinc-500 truncate max-w-[280px]">/embed/550</span>
                        </div>
                        <div class="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-zinc-800">
                            <iframe id="live-iframe" src="/embed/550" class="w-full h-full border-0" allowfullscreen title="Streame Stream Player"></iframe>
                        </div>
                    </div>

                    <div class="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-3">
                        <div class="flex items-center justify-between">
                            <h4 class="text-xs font-semibold uppercase tracking-wider text-zinc-300">Generated IFrame Snippet</h4>
                            <button onclick="copySnippet()" class="text-xs text-indigo-400 hover:text-indigo-300 flex items-center">
                                <i class="fa-regular fa-copy mr-1.5"></i> Copy Code
                            </button>
                        </div>
                        <pre id="code-snippet" class="bg-zinc-950 p-3.5 rounded-xl text-xs font-mono text-indigo-300 border border-zinc-800/80 overflow-x-auto leading-relaxed">&lt;iframe
  src="https://streame.vercel.app/embed/550?autoplay=0&muted=0"
  width="100%"
  height="100%"
  frameborder="0"
  allowfullscreen
&gt;&lt;/iframe&gt;</pre>
                    </div>
                </div>
            </div>
        </section>

        <section id="sdk" class="scroll-mt-24">
            <div class="mb-8">
                <h2 class="text-2xl font-bold text-white tracking-tight flex items-center">
                    <i class="fa-solid fa-terminal text-indigo-400 mr-3"></i> SDK & postMessage Tester
                </h2>
                <p class="text-sm text-zinc-400 mt-1">Test sending control actions to the iframe and view real-time telemetry events.</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div class="lg:col-span-6 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-6">
                    <h3 class="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Send postMessage Commands</h3>
                    
                    <div class="grid grid-cols-2 gap-3">
                        <button onclick="sendSdkAction({ action: 'play' })" class="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium py-2.5 px-4 rounded-xl border border-zinc-700 transition flex items-center justify-center">
                            <i class="fa-solid fa-play text-indigo-400 mr-2"></i> Play
                        </button>
                        <button onclick="sendSdkAction({ action: 'pause' })" class="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium py-2.5 px-4 rounded-xl border border-zinc-700 transition flex items-center justify-center">
                            <i class="fa-solid fa-pause text-indigo-400 mr-2"></i> Pause
                        </button>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <button onclick="sendSdkAction({ action: 'seekBy', seconds: 10 })" class="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium py-2.5 px-4 rounded-xl border border-zinc-700 transition flex items-center justify-center">
                            <i class="fa-solid fa-forward text-indigo-400 mr-2"></i> Seek +10s
                        </button>
                        <button onclick="sendSdkAction({ action: 'seekBy', seconds: -10 })" class="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium py-2.5 px-4 rounded-xl border border-zinc-700 transition flex items-center justify-center">
                            <i class="fa-solid fa-backward text-indigo-400 mr-2"></i> Seek -10s
                        </button>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <button onclick="sendSdkAction({ action: 'setVolume', volume: 0.2 })" class="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium py-2.5 px-4 rounded-xl border border-zinc-700 transition flex items-center justify-center">
                            <i class="fa-solid fa-volume-low text-indigo-400 mr-2"></i> Volume 20%
                        </button>
                        <button onclick="sendSdkAction({ action: 'mute' })" class="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium py-2.5 px-4 rounded-xl border border-zinc-700 transition flex items-center justify-center">
                            <i class="fa-solid fa-volume-xmark text-indigo-400 mr-2"></i> Mute Player
                        </button>
                    </div>

                    <div>
                        <label class="block text-xs font-medium text-zinc-400 mb-2">Switch Extraction Provider via SDK</label>
                        <div class="grid grid-cols-4 gap-2">
                            <button onclick="sendSdkAction({ action: 'setProvider', provider: 'barbarian' })" class="bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 text-indigo-200 text-xs py-2 rounded-lg transition font-mono">Barbarian</button>
                            <button onclick="sendSdkAction({ action: 'setProvider', provider: 'archer' })" class="bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 text-indigo-200 text-xs py-2 rounded-lg transition font-mono">Archer</button>
                            <button onclick="sendSdkAction({ action: 'setProvider', provider: 'goblin' })" class="bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 text-indigo-200 text-xs py-2 rounded-lg transition font-mono">Goblin</button>
                            <button onclick="sendSdkAction({ action: 'setProvider', provider: 'pekka' })" class="bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 text-indigo-200 text-xs py-2 rounded-lg transition font-mono">P.E.K.K.A</button>
                        </div>
                    </div>
                </div>

                <div class="lg:col-span-6 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 flex flex-col">
                    <div class="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
                        <h3 class="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center">
                            <i class="fa-solid fa-satellite-dish text-indigo-400 mr-2"></i> Telemetry & Event Log
                        </h3>
                        <button onclick="clearConsole()" class="text-xs text-zinc-500 hover:text-zinc-300">Clear Console</button>
                    </div>
                    <div id="console-log" class="bg-zinc-950 border border-zinc-800/80 rounded-xl p-4 h-64 overflow-y-auto font-mono text-xs text-zinc-300 space-y-1.5">
                        <div class="text-zinc-500">[System] Initialized Streame postMessage listener. Ready for events...</div>
                    </div>
                </div>
            </div>
        </section>

        <section id="infrastructure" class="scroll-mt-24">
            <div class="mb-8 flex items-center justify-between">
                <div>
                    <h2 class="text-2xl font-bold text-white tracking-tight flex items-center">
                        <i class="fa-solid fa-server text-indigo-400 mr-3"></i> Extraction Providers & Infrastructure
                    </h2>
                    <p class="text-sm text-zinc-400 mt-1">Multi-tier stream extraction servers with automated fallback pipelines.</p>
                </div>
                <button onclick="fetchProviderStatus()" class="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs px-3.5 py-2 rounded-lg transition flex items-center">
                    <i class="fa-solid fa-rotate mr-1.5"></i> Refresh Status
                </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div class="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
                    <div class="flex items-center justify-between">
                        <span class="font-bold text-white text-sm">Barbarian I</span>
                        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    </div>
                    <p class="text-xs text-zinc-400">Multi-language subtitles & ultra-fast HLS stream decryption.</p>
                    <div class="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-500">
                        <span>Latency: 14ms</span>
                        <span>Uptime: 99.99%</span>
                    </div>
                </div>
                <div class="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
                    <div class="flex items-center justify-between">
                        <span class="font-bold text-white text-sm">Archer II</span>
                        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    </div>
                    <p class="text-xs text-zinc-400">Multi-audio tracks & 4K Ultra HD playback support.</p>
                    <div class="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-500">
                        <span>Latency: 22ms</span>
                        <span>Uptime: 99.95%</span>
                    </div>
                </div>
                <div class="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
                    <div class="flex items-center justify-between">
                        <span class="font-bold text-white text-sm">Goblin III</span>
                        <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    </div>
                    <p class="text-xs text-zinc-400">Fast automatic stream extraction mirror for popular titles.</p>
                    <div class="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-500">
                        <span>Latency: 45ms</span>
                        <span>Uptime: 98.80%</span>
                    </div>
                </div>
                <div class="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
                    <div class="flex items-center justify-between">
                        <span class="font-bold text-white text-sm">P.E.K.K.A IV</span>
                        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    </div>
                    <p class="text-xs text-zinc-400">High bitrate 1080p uncompressed stream server.</p>
                    <div class="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-500">
                        <span>Latency: 12ms</span>
                        <span>Uptime: 100%</span>
                    </div>
                </div>
            </div>
        </section>

        <section id="docs" class="scroll-mt-24 space-y-8">
            <div>
                <h2 class="text-2xl font-bold text-white tracking-tight flex items-center">
                    <i class="fa-solid fa-book text-indigo-400 mr-3"></i> Integration Guide & React Component
                </h2>
                <p class="text-sm text-zinc-400 mt-1">Ready-to-use code snippets for integrating Streame into your Node.js or React app.</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div class="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-3">
                    <div class="flex items-center justify-between">
                        <h3 class="text-xs font-semibold text-zinc-300 uppercase tracking-wider">React / Next.js Component</h3>
                        <button onclick="copyCodeBlock('react-snippet')" class="text-xs text-indigo-400 hover:underline">Copy Code</button>
                    </div>
                    <pre id="react-snippet" class="bg-zinc-950 p-4 rounded-xl text-xs font-mono text-indigo-300 border border-zinc-800/80 overflow-x-auto leading-relaxed">import React from 'react';

export function VideoPlayer({ tmdbId, season, episode }) {
  const embedUrl = season && episode
    ? \`/embed/\${tmdbId}/\${season}/\${episode}\`
    : \`/embed/\${tmdbId}\`;

  return (
    &lt;div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-zinc-800"&gt;
      &lt;iframe
        src={embedUrl}
        className="w-full h-full border-0"
        allowFullScreen
        title="Streame Stream Player"
      /&gt;
    &lt;/div&gt;
  );
}</pre>
                </div>

                <div class="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-3">
                    <div class="flex items-center justify-between">
                        <h3 class="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Node.js / Express Setup</h3>
                        <button onclick="copyCodeBlock('node-snippet')" class="text-xs text-indigo-400 hover:underline">Copy Code</button>
                    </div>
                    <pre id="node-snippet" class="bg-zinc-950 p-4 rounded-xl text-xs font-mono text-indigo-300 border border-zinc-800/80 overflow-x-auto leading-relaxed">const express = require('express');
const app = express();

app.get('/embed/:tmdbId', (req, res) => {
  const { tmdbId } = req.params;
  const { server = 'barbarian', autoplay = '1' } = req.query;
  
  res.redirect(\`/embed/\${tmdbId}?server=\${server}&autoplay=\${autoplay}\`);
});

app.listen(3000, () => console.log('Streame node running on port 3000'));</pre>
                </div>
            </div>
        </section>

    </main>

    <footer class="border-t border-zinc-800 bg-zinc-950 py-10 mt-20 text-center text-xs text-zinc-500">
        <p>&copy; 2026 Streame Infrastructure. All rights reserved. Built with Node.js & Express.</p>
    </footer>

    <script>
        function updatePlayground() {
            const tmdbId = document.getElementById('cfg-tmdb').value;
            const server = document.getElementById('cfg-server').value;
            const speed = document.getElementById('cfg-speed').value;
            const autoplay = document.getElementById('cfg-autoplay').value;
            const muted = document.getElementById('cfg-muted').value;
            const title = document.getElementById('cfg-title').value;

            const tvSelectors = document.getElementById('tv-selectors');
            if (tmdbId === '1396') {
                tvSelectors.classList.remove('hidden');
            } else {
                tvSelectors.classList.add('hidden');
            }

            let embedPath = \`/embed/\${tmdbId}\`;
            if (tmdbId === '1396') {
                const season = document.getElementById('cfg-season').value;
                const episode = document.getElementById('cfg-episode').value;
                embedPath = \`/embed/\${tmdbId}/\${season}/\${episode}\`;
            }

            const queryParams = new URLSearchParams();
            if (autoplay !== '0') queryParams.append('autoplay', autoplay);
            if (muted !== '0') queryParams.append('muted', muted);
            if (server !== 'barbarian') queryParams.append('server', server);
            if (speed !== '1') queryParams.append('speed', speed);
            if (title) queryParams.append('title', title);

            const queryString = queryParams.toString();
            const fullUrl = embedPath + (queryString ? '?' + queryString : '');

            document.getElementById('live-iframe').src = fullUrl;
            document.getElementById('preview-url-label').innerText = fullUrl;

            const snippet = \`<iframe\\n  src="https://streame.vercel.app\${fullUrl}"\\n  width="100%"\\n  height="100%"\\n  frameborder="0"\\n  allowfullscreen\\n&gt;&lt;/iframe>\`;
            document.getElementById('code-snippet').innerText = snippet;
        }

        function resetConfig() {
            document.getElementById('cfg-tmdb').value = '550';
            document.getElementById('cfg-server').value = 'barbarian';
            document.getElementById('cfg-speed').value = '1';
            document.getElementById('cfg-autoplay').value = '0';
            document.getElementById('cfg-muted').value = '0';
            document.getElementById('cfg-title').value = '';
            updatePlayground();
        }

        function copySnippet() {
            const code = document.getElementById('code-snippet').innerText;
            const textArea = document.createElement('textarea');
            textArea.value = code;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                alert('Copied iframe snippet to clipboard!');
            } catch (err) {
                console.error('Failed to copy', err);
            }
            document.body.removeChild(textArea);
        }

        function copyCodeBlock(elementId) {
            const code = document.getElementById(elementId).innerText;
            const textArea = document.createElement('textarea');
            textArea.value = code;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                alert('Copied code snippet to clipboard!');
            } catch (err) {
                console.error('Failed to copy', err);
            }
            document.body.removeChild(textArea);
        }

        function sendSdkAction(actionObj) {
            const iframe = document.getElementById('live-iframe');
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage(actionObj, '*');
                logToConsole(\`[SDK Sent] Action: \${actionObj.action} \${JSON.stringify(actionObj)}\`);
            }
        }

        function logToConsole(message) {
            const consoleLog = document.getElementById('console-log');
            const time = new Date().toLocaleTimeString();
            const div = document.createElement('div');
            div.className = "text-indigo-300 font-mono";
            div.innerText = \`[\${time}] \${message}\`;
            consoleLog.appendChild(div);
            consoleLog.scrollTop = consoleLog.scrollHeight;
        }

        function clearConsole() {
            document.getElementById('console-log').innerHTML = '<div class="text-zinc-500">[System] Console cleared.</div>';
        }

        window.addEventListener('message', (event) => {
            if (event.data && event.data.event) {
                if (event.data.event === 'streame:timeupdate') {
                    if (Math.random() < 0.1) {
                        logToConsole(\`[Telemetry] timeupdate: \${Math.floor(event.data.currentTime)}s / \${Math.floor(event.data.duration)}s (\${Math.floor(event.data.percent)}%)\`);
                    }
                } else {
                    logToConsole(\`[Telemetry Event] \${event.data.event} \${JSON.stringify(event.data)}\`);
                }
            }
        });

        async function fetchProviderStatus() {
            try {
                const res = await fetch('/api/providers');
                const data = await res.json();
                if (data.success) {
                    logToConsole('[Infrastructure] Refreshed provider telemetry status.');
                }
            } catch (e) {
                console.log('Error fetching status', e);
            }
        }
    </script>
</body>
</html>`;

fs.writeFileSync(path.join(publicDir, 'index.html'), frontendHtml);

// Local listening vs Vercel export
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Streame server running locally on port ${PORT}`);
    });
}

module.exports = app;