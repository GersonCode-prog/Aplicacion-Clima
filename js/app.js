document.addEventListener('DOMContentLoaded', () => {
    const CONFIG = {
        apiKey: '83fae74e55f8457ca2b181358242105',
        baseUrl: 'https://api.weatherapi.com/v1',
        defaultCity: 'Guatemala',
        forecastDays: 7
    };

    const $ = selector => document.querySelector(selector);
    const root = document.documentElement;
    const app = $('.weather-app');
    const form = $('.search');
    const input = $('.location-input');
    const list = $('.suggestions');
    const statusEl = $('.status');
    const infoEl = $('.weather-info');
    const groundEl = $('.ground');
    const ridgeEl = $('.ridge');
    const unitButtons = document.querySelectorAll('.units button');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const store = {
        get(key) {
            try { return localStorage.getItem(key); } catch (e) { return null; }
        },
        set(key, value) {
            try { localStorage.setItem(key, value); } catch (e) { /* almacenamiento bloqueado */ }
        }
    };

    const state = {
        data: null,
        unit: store.get('clima.unit') === 'f' ? 'f' : 'c',
        request: null
    };

    /* ---------- Formato ---------- */

    const esc = text => String(text).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

    const temp = (celsius, fahrenheit) =>
        `${Math.round(state.unit === 'c' ? celsius : fahrenheit)}\u00B0`;

    const speed = (kph, mph) =>
        state.unit === 'c' ? `${Math.round(kph)} km/h` : `${Math.round(mph)} mph`;

    const distance = (km, miles) =>
        state.unit === 'c' ? `${Math.round(km)} km` : `${Math.round(miles)} mi`;

    // WeatherAPI entrega las fechas en hora local del lugar. Se arman a mediodia
    // para que la zona horaria del navegador no mueva el resultado al dia anterior.
    const parseDay = text => new Date(`${text}T12:00:00`);

    const toMinutes12 = text => {
        const match = /(\d+):(\d+)\s*(AM|PM)/i.exec(text || '');
        if (!match) return null;
        const hours = (Number(match[1]) % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0);
        return hours * 60 + Number(match[2]);
    };

    const formatMinutes = minutes => {
        if (minutes === null) return '\u2014';
        const hours = Math.floor(minutes / 60);
        return `${hours}:${String(minutes % 60).padStart(2, '0')}`;
    };

    const capitalize = text => text.charAt(0).toUpperCase() + text.slice(1);

    const uvLabel = uv => {
        if (uv < 3) return 'bajo';
        if (uv < 6) return 'moderado';
        if (uv < 8) return 'alto';
        if (uv < 11) return 'muy alto';
        return 'extremo';
    };

    /* ---------- Clima a iconos y cielo ---------- */

    const GROUPS = {
        fog: [1030, 1135, 1147],
        storm: [1087, 1273, 1276, 1279, 1282],
        snow: [1066, 1069, 1114, 1117, 1204, 1207, 1210, 1213, 1216, 1219, 1222, 1225, 1237, 1249, 1252, 1255, 1258, 1261, 1264]
    };

    function weatherKind(code) {
        if (code === 1000) return 'clear';
        if (code === 1003) return 'partly';
        if (code === 1006 || code === 1009) return 'cloudy';
        if (GROUPS.fog.includes(code)) return 'fog';
        if (GROUPS.storm.includes(code)) return 'storm';
        if (GROUPS.snow.includes(code)) return 'snow';
        return 'rain';
    }

    const CLOUD = '<path d="M7 18h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.1 9.1 4.5 4.5 0 0 0 7 18z"/>';
    const SMALL_CLOUD = '<path d="M7 16h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.1 7.1 4.5 4.5 0 0 0 7 16z"/>';
    const SUN_RAYS = 'M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8';
    const MOON = 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z';

    function icon(kind, isDay) {
        const shapes = {
            clear: isDay
                ? `<circle cx="12" cy="12" r="4.5"/><path d="${SUN_RAYS}"/>`
                : `<path d="${MOON}"/>`,
            partly: isDay
                ? '<circle cx="8" cy="8" r="3"/><path d="M8 1.5v1.2M1.5 8h1.2M3.4 3.4l.9.9M12.6 3.4l-.9.9"/><path d="M9 20h8a3.5 3.5 0 0 0 .5-7 4.8 4.8 0 0 0-9.2-.8A3.9 3.9 0 0 0 9 20z"/>'
                : '<path d="M12 6.5A4.5 4.5 0 0 1 6.5 2a4.8 4.8 0 1 0 5.5 4.5z"/><path d="M9 20h8a3.5 3.5 0 0 0 .5-7 4.8 4.8 0 0 0-9.2-.8A3.9 3.9 0 0 0 9 20z"/>',
            cloudy: CLOUD,
            fog: '<path d="M4 8h16M2.5 12h19M4 16h16M7 20h10"/>',
            rain: `${SMALL_CLOUD}<path d="M8.5 19l-1 2.5M12.5 19l-1 2.5M16.5 19l-1 2.5"/>`,
            storm: `${SMALL_CLOUD}<path d="M13 16.5l-2.5 3.2h3L11 23"/>`,
            snow: `${SMALL_CLOUD}<path d="M8 20h.01M12 19h.01M16 20h.01M10 22.5h.01M14 22.5h.01"/>`
        };
        return `<svg class="wx" viewBox="0 0 24 24" aria-hidden="true">${shapes[kind]}</svg>`;
    }

    function skyFor(code, isDay, nowMinutes, sunrise, sunset) {
        const kind = weatherKind(code);
        const period = isDay ? 'day' : 'night';
        if (kind === 'storm' || kind === 'snow' || kind === 'fog') return kind;
        if (kind === 'rain') return `rain-${period}`;
        if (kind === 'cloudy') return `cloudy-${period}`;
        const nearSun = edge => edge !== null && Math.abs(nowMinutes - edge) <= 45;
        if (nearSun(sunrise) || nearSun(sunset)) return 'dusk';
        return `clear-${period}`;
    }

    /* ---------- Consulta ---------- */

    function apiMessage(code) {
        if (code === 1006) return 'No encontramos esa ciudad. Revisa el nombre o elige una de las sugerencias.';
        if (code === 2006 || code === 2008 || code === 1002) return 'La clave de WeatherAPI no es v\u00E1lida o est\u00E1 desactivada. Revisa CONFIG.apiKey en js/app.js.';
        if (code === 2007) return 'Se agot\u00F3 la cuota mensual de WeatherAPI. Prueba con otra clave o espera al siguiente ciclo.';
        return 'WeatherAPI rechaz\u00F3 la consulta. Intenta de nuevo en unos minutos.';
    }

    async function fetchWeatherData(query) {
        if (state.request) state.request.abort();
        const controller = new AbortController();
        state.request = controller;

        app.classList.add('is-loading');
        app.setAttribute('aria-busy', 'true');
        statusEl.textContent = 'Consultando el clima\u2026';

        const params = new URLSearchParams({
            key: CONFIG.apiKey,
            q: query,
            days: CONFIG.forecastDays,
            lang: 'es',
            aqi: 'no',
            alerts: 'no'
        });

        try {
            const response = await fetch(`${CONFIG.baseUrl}/forecast.json?${params}`, { signal: controller.signal });
            const data = await response.json().catch(() => null);
            if (!response.ok || !data || data.error) {
                throw new Error(apiMessage(data && data.error ? data.error.code : null));
            }
            state.data = data;
            statusEl.textContent = '';
            render();
            store.set('clima.query', query);
            input.value = '';
        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error('Error al consultar el clima:', error);
            statusEl.textContent = error instanceof TypeError
                ? 'No hay conexi\u00F3n con el servicio del clima. Revisa tu internet e intenta de nuevo.'
                : error.message;
        } finally {
            if (state.request === controller) {
                state.request = null;
                app.classList.remove('is-loading');
                app.removeAttribute('aria-busy');
            }
        }
    }

    /* ---------- Render ---------- */

    function render() {
        const { location, current, forecast } = state.data;
        const days = forecast.forecastday;
        const today = days[0];
        const nowMinutes = (() => {
            const [hours, minutes] = location.localtime.split(' ')[1].split(':').map(Number);
            return hours * 60 + minutes;
        })();
        const sunrise = toMinutes12(today.astro.sunrise);
        const sunset = toMinutes12(today.astro.sunset);
        const isDay = current.is_day === 1;
        const code = current.condition.code;
        const sky = skyFor(code, isDay, nowMinutes, sunrise, sunset);

        root.dataset.sky = sky;
        setParticles(sky);

        const localDate = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' })
            .format(parseDay(location.localtime.split(' ')[0]));

        $('.location').textContent = location.name;
        $('.local-time').textContent =
            `${[location.region, location.country].filter(Boolean).join(', ')}. ${capitalize(localDate)}, ${formatMinutes(nowMinutes)}`;
        $('.temperature').textContent = temp(current.temp_c, current.temp_f);
        $('.description').textContent = current.condition.text;
        $('.icon').innerHTML = icon(weatherKind(code), isDay);
        $('.feels').textContent =
            `Se siente como ${temp(current.feelslike_c, current.feelslike_f)}. M\u00E1xima ${temp(today.day.maxtemp_c, today.day.maxtemp_f)}, m\u00EDnima ${temp(today.day.mintemp_c, today.day.mintemp_f)}.`;
        document.title = `${temp(current.temp_c, current.temp_f)} en ${location.name}`;

        displayForecast(days);
        displayDetails(current, today, sunrise, sunset);

        infoEl.hidden = false;
        groundEl.hidden = false;
        drawRidge();
    }

    function displayForecast(days) {
        const lows = days.map(d => d.day.mintemp_c);
        const highs = days.map(d => d.day.maxtemp_c);
        const low = Math.min(...lows);
        const span = Math.max(Math.max(...highs) - low, 1);

        $('.forecast-title').textContent = `Pr\u00F3ximos ${days.length} d\u00EDas`;
        $('.forecast').innerHTML = days.map((item, index) => {
            const { day } = item;
            const name = index === 0 ? 'Hoy'
                : index === 1 ? 'Ma\u00F1ana'
                : capitalize(new Intl.DateTimeFormat('es', { weekday: 'long' }).format(parseDay(item.date)));
            const left = ((day.mintemp_c - low) / span) * 100;
            const width = Math.max(((day.maxtemp_c - day.mintemp_c) / span) * 100, 4);
            const rain = Number(day.daily_chance_of_rain) || 0;
            return `
                <div class="forecast-item">
                    <span class="day-icon">${icon(weatherKind(day.condition.code), true)}</span>
                    <span class="day-text">
                        <span class="day-name">${esc(name)}</span>
                        ${rain >= 20 ? `<span class="day-rain">${rain}% de lluvia</span>` : ''}
                    </span>
                    <span class="day-desc">${esc(day.condition.text)}</span>
                    <span class="day-min">${temp(day.mintemp_c, day.mintemp_f)}</span>
                    <span class="range" aria-hidden="true"><span style="left:${left}%;width:${width}%"></span></span>
                    <span class="day-max">${temp(day.maxtemp_c, day.maxtemp_f)}</span>
                </div>`;
        }).join('');
    }

    function displayDetails(current, today, sunrise, sunset) {
        const rows = [
            ['Lluvia hoy', `${Number(today.day.daily_chance_of_rain) || 0}%`],
            ['Humedad', `${current.humidity}%`],
            ['Viento', `${speed(current.wind_kph, current.wind_mph)} ${current.wind_dir.replace(/W/g, 'O')}`],
            ['\u00CDndice UV', `${Math.round(current.uv)}, ${uvLabel(current.uv)}`],
            ['Visibilidad', distance(current.vis_km, current.vis_miles)],
            ['Amanecer', formatMinutes(sunrise)],
            ['Atardecer', formatMinutes(sunset)]
        ];
        $('.details').innerHTML = rows
            .map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`)
            .join('');
    }

    /* ---------- Horizonte de 24 horas ---------- */

    function nextHours(data) {
        const start = data.location.localtime_epoch - 3600;
        return data.forecast.forecastday
            .flatMap(day => day.hour)
            .filter(hour => hour.time_epoch > start)
            .slice(0, 25);
    }

    // Curva suave que pasa por todos los puntos.
    function curvePath(points) {
        let path = `M${points[0].x} ${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i - 1] || points[i];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[i + 2] || p2;
            const c1x = p1.x + (p2.x - p0.x) / 6;
            const c1y = p1.y + (p2.y - p0.y) / 6;
            const c2x = p2.x - (p3.x - p1.x) / 6;
            const c2y = p2.y - (p3.y - p1.y) / 6;
            path += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
        }
        return path;
    }

    function drawRidge() {
        if (!state.data || !ridgeEl.clientWidth) return;
        const hours = nextHours(state.data);
        if (hours.length < 2) { ridgeEl.innerHTML = ''; return; }

        const width = ridgeEl.clientWidth;
        const height = ridgeEl.clientHeight;
        const padding = parseFloat(getComputedStyle($('.hero')).paddingLeft) + 16;
        const top = 14;
        const bottom = height - 118;
        const values = hours.map(h => h.temp_c);
        const min = Math.min(...values);
        const span = Math.max(Math.max(...values) - min, 4);
        const step = (width - padding * 2) / (hours.length - 1);

        const points = hours.map((hour, i) => ({
            x: padding + step * i,
            y: bottom - ((hour.temp_c - min) / span) * (bottom - top)
        }));

        const edged = [{ x: -4, y: points[0].y }, ...points, { x: width + 4, y: points[points.length - 1].y }];
        const closed = `${curvePath(edged)} L${width + 4} ${height + 2} L-4 ${height + 2} Z`;
        const back = edged.map((p, i) => ({
            x: p.x,
            y: edged[Math.min(i + 3, edged.length - 1)].y - 24
        }));
        const backClosed = `${curvePath(back)} L${width + 4} ${height + 2} L-4 ${height + 2} Z`;

        const every = width < 560 ? 4 : width < 1100 ? 3 : 2;
        let labels = '';
        hours.forEach((hour, i) => {
            if (i % every !== 0) return;
            const x = points[i].x;
            const name = i === 0 ? 'Ahora' : `${Number(hour.time.split(' ')[1].split(':')[0])}:00`;
            const rain = Number(hour.chance_of_rain) || 0;
            labels += `
                <text class="ridge-temp" x="${x}" y="${height - 56}">${temp(hour.temp_c, hour.temp_f)}</text>
                <text class="ridge-hour" x="${x}" y="${height - 36}">${name}</text>
                ${rain >= 30 ? `<text class="ridge-rain" x="${x}" y="${height - 16}">${rain}%</text>` : ''}`;
        });

        const coolest = hours.reduce((x, y) => (y.temp_c < x.temp_c ? y : x));
        const warmest = hours.reduce((x, y) => (y.temp_c > x.temp_c ? y : x));
        ridgeEl.setAttribute('aria-label', `Temperatura de las pr\u00F3ximas 24 horas: de ${temp(coolest.temp_c, coolest.temp_f)} a ${temp(warmest.temp_c, warmest.temp_f)}.`);
        ridgeEl.innerHTML = `
            <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
                <path class="ridge-back" d="${backClosed}"/>
                <path class="ridge-front" d="${closed}"/>
                <circle class="ridge-now" cx="${points[0].x}" cy="${points[0].y}" r="7"/>
                ${labels}
            </svg>`;
    }

    if ('ResizeObserver' in window) {
        new ResizeObserver(drawRidge).observe(ridgeEl);
    } else {
        window.addEventListener('resize', drawRidge);
    }

    /* ---------- Lluvia, nieve y estrellas ---------- */

    const canvas = $('.particles');
    const ctx = canvas.getContext('2d');
    let particles = [];
    let particleMode = null;
    let frame = null;

    function setParticles(sky) {
        const mode = sky === 'storm' || sky.startsWith('rain') ? 'rain'
            : sky === 'snow' ? 'snow'
            : sky === 'clear-night' ? 'stars'
            : null;
        particleMode = mode;
        cancelAnimationFrame(frame);
        sizeCanvas();
        const area = canvas.clientWidth * canvas.clientHeight;
        const density = mode === 'rain' ? 9000 : mode === 'snow' ? 14000 : 7000;
        particles = mode ? Array.from({ length: Math.min(Math.round(area / density), 220) }, () => ({
            x: Math.random() * canvas.clientWidth,
            y: Math.random() * canvas.clientHeight,
            z: 0.4 + Math.random() * 0.6
        })) : [];
        drawParticles();
    }

    function sizeCanvas() {
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = canvas.clientWidth * ratio;
        canvas.height = canvas.clientHeight * ratio;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function drawParticles() {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        ctx.clearRect(0, 0, w, h);
        if (!particleMode) return;
        const still = reducedMotion.matches;

        particles.forEach(p => {
            if (particleMode === 'stars') {
                ctx.fillStyle = `rgba(255,255,255,${0.25 + p.z * 0.6})`;
                ctx.fillRect(p.x, p.y * 0.7, p.z * 1.7, p.z * 1.7);
            } else if (particleMode === 'rain') {
                ctx.strokeStyle = `rgba(210,230,245,${0.14 + p.z * 0.24})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - 2, p.y + 15 * p.z);
                ctx.stroke();
                p.y += 13 * p.z;
                p.x -= 1.6 * p.z;
            } else {
                ctx.fillStyle = `rgba(255,255,255,${0.5 + p.z * 0.45})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1.1 + p.z * 1.6, 0, Math.PI * 2);
                ctx.fill();
                p.y += 0.9 * p.z;
                p.x += Math.sin(p.y / 45) * 0.4;
            }
            if (p.y > h) { p.y = -18; p.x = Math.random() * w; }
            if (p.x < -5) p.x = w;
        });

        // Las estrellas no se mueven y, con movimiento reducido, nada se anima.
        if (particleMode !== 'stars' && !still) frame = requestAnimationFrame(drawParticles);
    }

    window.addEventListener('resize', () => {
        if (particleMode) {
            cancelAnimationFrame(frame);
            sizeCanvas();
            drawParticles();
        }
    });

    /* ---------- Sugerencias de ciudades ---------- */

    let suggestions = [];
    let activeIndex = -1;
    let suggestTimer = null;
    let suggestRequest = null;

    function closeSuggestions() {
        list.hidden = true;
        list.innerHTML = '';
        suggestions = [];
        activeIndex = -1;
        input.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
    }

    function showSuggestions(items) {
        suggestions = items;
        activeIndex = -1;
        if (!items.length) { closeSuggestions(); return; }
        list.innerHTML = items.map((item, i) => `
            <li role="option" id="suggestion-${i}" data-index="${i}" aria-selected="false">
                ${esc(item.name)}
                <small>${esc([item.region, item.country].filter(Boolean).join(', '))}</small>
            </li>`).join('');
        list.hidden = false;
        input.setAttribute('aria-expanded', 'true');
    }

    function highlight(index) {
        const options = list.querySelectorAll('li');
        options.forEach((option, i) => option.setAttribute('aria-selected', String(i === index)));
        activeIndex = index;
        if (index >= 0) input.setAttribute('aria-activedescendant', `suggestion-${index}`);
        else input.removeAttribute('aria-activedescendant');
    }

    function chooseSuggestion(index) {
        const item = suggestions[index];
        closeSuggestions();
        if (item) fetchWeatherData(`id:${item.id}`);
    }

    async function loadSuggestions(text) {
        if (suggestRequest) suggestRequest.abort();
        const controller = new AbortController();
        suggestRequest = controller;
        try {
            const params = new URLSearchParams({ key: CONFIG.apiKey, q: text });
            const response = await fetch(`${CONFIG.baseUrl}/search.json?${params}`, { signal: controller.signal });
            if (!response.ok) return;
            const items = await response.json();
            if (input.value.trim() === text) showSuggestions(items.slice(0, 5));
        } catch (error) {
            // Las sugerencias son opcionales: si fallan, la busqueda normal sigue funcionando.
        }
    }

    input.addEventListener('input', () => {
        clearTimeout(suggestTimer);
        const text = input.value.trim();
        if (text.length < 3) { closeSuggestions(); return; }
        suggestTimer = setTimeout(() => loadSuggestions(text), 250);
    });

    input.addEventListener('keydown', event => {
        if (list.hidden) return;
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            highlight((activeIndex + 1) % suggestions.length);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            highlight((activeIndex - 1 + suggestions.length) % suggestions.length);
        } else if (event.key === 'Enter' && activeIndex >= 0) {
            event.preventDefault();
            chooseSuggestion(activeIndex);
        } else if (event.key === 'Escape') {
            closeSuggestions();
        }
    });

    // mousedown para elegir antes de que el campo pierda el foco.
    list.addEventListener('mousedown', event => {
        const option = event.target.closest('li');
        if (!option) return;
        event.preventDefault();
        chooseSuggestion(Number(option.dataset.index));
    });

    input.addEventListener('blur', closeSuggestions);

    /* ---------- Controles ---------- */

    form.addEventListener('submit', event => {
        event.preventDefault();
        clearTimeout(suggestTimer);
        if (suggestRequest) suggestRequest.abort();
        closeSuggestions();
        const city = input.value.trim();
        if (city === '') {
            statusEl.textContent = 'Escribe el nombre de una ciudad para buscar.';
            input.focus();
            return;
        }
        fetchWeatherData(city);
    });

    $('.geo-button').addEventListener('click', () => {
        if (!navigator.geolocation) {
            statusEl.textContent = 'Este navegador no permite compartir la ubicaci\u00F3n. Busca la ciudad por su nombre.';
            return;
        }
        statusEl.textContent = 'Obteniendo tu ubicaci\u00F3n\u2026';
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => fetchWeatherData(`${coords.latitude},${coords.longitude}`),
            () => {
                statusEl.textContent = 'No se pudo obtener tu ubicaci\u00F3n. Revisa el permiso del navegador o busca la ciudad por su nombre.';
            },
            { timeout: 10000, maximumAge: 600000 }
        );
    });

    function syncUnitButtons() {
        unitButtons.forEach(button => {
            button.setAttribute('aria-pressed', String(button.dataset.unit === state.unit));
        });
    }

    unitButtons.forEach(button => {
        button.addEventListener('click', () => {
            state.unit = button.dataset.unit;
            store.set('clima.unit', state.unit);
            syncUnitButtons();
            if (state.data) render();
        });
    });

    /* ---------- Inicio ---------- */

    syncUnitButtons();
    fetchWeatherData(store.get('clima.query') || CONFIG.defaultCity);
});
