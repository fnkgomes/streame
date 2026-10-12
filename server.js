/**
 * Streame - Node.js / Express Backend & Player Engine
 * Complete with Embed Endpoints, Stream Providers, Fallback Logic, and postMessage SDK support.
 * Optimized for Vercel Serverless deployment.
 */

const express = require('express');
const path = require('path');
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

// Fallback to static index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Local listening vs Vercel Serverless Export
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Streame server running locally on port ${PORT}`);
    });
}

// CRUCIAL FOR VERCEL DEPLOYMENT:
module.exports = app;