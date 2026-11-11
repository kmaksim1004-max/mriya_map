/**
 * Mriya Map — Інтерактивна карта Землі
 * Повнофункціональна карта у стилі Google Maps
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- КОНФІГУРАЦІЯ ШАРІВ КАРТИ ---
  const TILE_LAYERS = {
    standard: {
      name: 'Карта',
      thumbClass: 'standard-thumb',
      layer: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      })
    },
    satellite: {
      name: 'Супутник',
      thumbClass: 'satellite-thumb',
      layer: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19
      })
    },
    hybrid: {
      name: 'Гібрид',
      thumbClass: 'hybrid-thumb',
      layer: L.layerGroup([
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19
        }),
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19
        })
      ])
    },
    terrain: {
      name: 'Рельєф',
      thumbClass: 'terrain-thumb',
      layer: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
        maxZoom: 17
      })
    },
    dark: {
      name: 'Нічна',
      thumbClass: 'dark-thumb',
      layer: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      })
    }
  };

  // Додаткові накладання
  const labelsOverlay = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    pane: 'overlayPane'
  });

  // Пресети швидких міст
  const PRESET_PLACES = {
    'Київ, Україна': { lat: 50.4501, lon: 30.5234, zoom: 12, name: 'Київ', desc: 'Столиця України' },
    'Львів, Україна': { lat: 49.8397, lon: 24.0297, zoom: 13, name: 'Львів', desc: 'Культурна столиця України' },
    'Одеса, Україна': { lat: 46.4825, lon: 30.7233, zoom: 13, name: 'Одеса', desc: 'Перлина біля моря' },
    'Говерла, Карпати': { lat: 48.1603, lon: 24.5003, zoom: 14, name: 'Гора Говерла', desc: 'Найвища вершина України (2061 м)', layer: 'terrain' },
    'Париж, Франція': { lat: 48.8566, lon: 2.3522, zoom: 13, name: 'Париж', desc: 'Столиця Франції' },
    'Токіо, Японія': { lat: 35.6762, lon: 139.6503, zoom: 12, name: 'Токіо', desc: 'Столиця Японії' },
    'Нью-Йорк, США': { lat: 40.7128, lon: -74.0060, zoom: 12, name: 'Нью-Йорк', desc: 'Найбільше місто США' }
  };

  // --- ІНІЦІАЛІЗАЦІЯ КАРТИ ---
  let initialLat = 48.379433;
  let initialLng = 31.165580;
  let initialZoom = 6;
  let activeLayerKey = 'standard';

  // Перевірка URL hash
  if (window.location.hash) {
    const hashParts = window.location.hash.replace('#', '').split(',');
    if (hashParts.length >= 3) {
      const hLat = parseFloat(hashParts[0]);
      const hLng = parseFloat(hashParts[1]);
      const hZoom = parseInt(hashParts[2]);
      if (!isNaN(hLat) && !isNaN(hLng) && !isNaN(hZoom)) {
        initialLat = hLat;
        initialLng = hLng;
        initialZoom = hZoom;
      }
      if (hashParts[3] && TILE_LAYERS[hashParts[3]]) {
        activeLayerKey = hashParts[3];
      }
    }
  }

  const map = L.map('map', {
    center: [initialLat, initialLng],
    zoom: initialZoom,
    zoomControl: false,
    layers: [TILE_LAYERS[activeLayerKey].layer]
  });

  L.control.scale({ imperial: false, position: 'bottomright' }).addTo(map);

  let currentMarker = null;
  let measureMode = false;
  let measurePoints = [];
  let measureMarkers = [];
  let measureLine = null;
  let gridLinesLayer = null;

  // --- UI ЕЛЕМЕНТИ ---
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const searchSubmitBtn = document.getElementById('searchSubmitBtn');
  const layerTriggerBtn = document.getElementById('layerTriggerBtn');
  const layerPanel = document.getElementById('layerPanel');
  const closeLayerPanelBtn = document.getElementById('closeLayerPanelBtn');
  const activeLayerThumb = document.getElementById('activeLayerThumb');
  const toggleLabelsCheckbox = document.getElementById('toggleLabels');
  const toggleGridCheckbox = document.getElementById('toggleGrid');
  const myLocationBtn = document.getElementById('myLocationBtn');
  const measureBtn = document.getElementById('measureBtn');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const measureBanner = document.getElementById('measureBanner');
  const measureDistanceText = document.getElementById('measureDistanceText');
  const clearMeasureBtn = document.getElementById('clearMeasureBtn');
  const closeMeasureBtn = document.getElementById('closeMeasureBtn');
  const placeCard = document.getElementById('placeCard');
  const closePlaceCardBtn = document.getElementById('closePlaceCardBtn');
  const placeTitle = document.getElementById('placeTitle');
  const placeSubtitle = document.getElementById('placeSubtitle');
  const placeCoords = document.getElementById('placeCoords');
  const placeZoom = document.getElementById('placeZoom');
  const copyCoordsBtn = document.getElementById('copyCoordsBtn');
  const shareLinkBtn = document.getElementById('shareLinkBtn');
  const centerPlaceBtn = document.getElementById('centerPlaceBtn');
  const cursorCoords = document.getElementById('cursorCoords');
  const zoomLevel = document.getElementById('zoomLevel');
  const toast = document.getElementById('toast');

  // Оновлення мініатюри
  function updateActiveThumbnail(key) {
    activeLayerThumb.className = 'layer-thumbnail ' + TILE_LAYERS[key].thumbClass;
  }
  updateActiveThumbnail(activeLayerKey);

  // --- ПЕРЕМИКАННЯ ШАРІВ ---
  function setBaseLayer(layerKey) {
    if (!TILE_LAYERS[layerKey] || activeLayerKey === layerKey) return;
    
    map.removeLayer(TILE_LAYERS[activeLayerKey].layer);
    map.addLayer(TILE_LAYERS[layerKey].layer);
    activeLayerKey = layerKey;

    document.querySelectorAll('.layer-item').forEach(item => {
      item.classList.toggle('active', item.dataset.layer === layerKey);
    });

    updateActiveThumbnail(layerKey);
    updateUrlHash();
    showToast(`Шар змінено: ${TILE_LAYERS[layerKey].name}`);
  }

  document.querySelectorAll('.layer-item').forEach(item => {
    item.addEventListener('click', () => {
      setBaseLayer(item.dataset.layer);
    });
  });

  layerTriggerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    layerPanel.classList.toggle('hidden');
  });

  closeLayerPanelBtn.addEventListener('click', () => {
    layerPanel.classList.add('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!layerPanel.contains(e.target) && !layerTriggerBtn.contains(e.target)) {
      layerPanel.classList.add('hidden');
    }
  });

  // Накладання підписів
  toggleLabelsCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
      if (!map.hasLayer(labelsOverlay)) map.addLayer(labelsOverlay);
    } else {
      if (map.hasLayer(labelsOverlay)) map.removeLayer(labelsOverlay);
    }
  });

  // Координатна сітка
  toggleGridCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
      drawGraticule();
    } else if (gridLinesLayer) {
      map.removeLayer(gridLinesLayer);
      gridLinesLayer = null;
    }
  });

  function drawGraticule() {
    if (gridLinesLayer) map.removeLayer(gridLinesLayer);
    const lines = [];
    for (let lat = -80; lat <= 80; lat += 20) {
      lines.push([[lat, -180], [lat, 180]]);
    }
    for (let lng = -180; lng <= 180; lng += 30) {
      lines.push([[-85, lng], [85, lng]]);
    }
    gridLinesLayer = L.polyline(lines, {
      color: '#1a73e8',
      weight: 1,
      opacity: 0.4,
      dashArray: '4, 4'
    }).addTo(map);
  }

  // --- ЗУМ ТА СТАТУС ---
  zoomInBtn.addEventListener('click', () => map.zoomIn());
  zoomOutBtn.addEventListener('click', () => map.zoomOut());

  map.on('zoomend', () => {
    zoomLevel.textContent = `Зум: ${map.getZoom()}`;
    updateUrlHash();
  });

  map.on('mousemove', (e) => {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    cursorCoords.textContent = `${Math.abs(lat).toFixed(6)}° ${latDir}, ${Math.abs(lng).toFixed(6)}° ${lngDir}`;
  });

  map.on('moveend', () => {
    updateUrlHash();
  });

  function updateUrlHash() {
    const center = map.getCenter();
    const zoom = map.getZoom();
    const hash = `${center.lat.toFixed(5)},${center.lng.toFixed(5)},${zoom},${activeLayerKey}`;
    history.replaceState(null, '', '#' + hash);
  }

  // --- КЛІК ПО КАРТІ (ІНСПЕКТОР ТОЧКИ) ---
  map.on('click', (e) => {
    if (measureMode) {
      addMeasurePoint(e.latlng);
      return;
    }
    inspectLocation(e.latlng.lat, e.latlng.lng);
  });

  function inspectLocation(lat, lng, customTitle = null, customSubtitle = null) {
    if (currentMarker) {
      map.removeLayer(currentMarker);
    }

    currentMarker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'custom-map-pin',
        html: '<div style="background:#ea4335;width:24px;height:24px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })
    }).addTo(map);

    placeCard.classList.remove('hidden');
    placeCoords.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    placeZoom.textContent = map.getZoom();

    if (customTitle) {
      placeTitle.textContent = customTitle;
      placeSubtitle.textContent = customSubtitle || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } else {
      placeTitle.textContent = 'Обране місце';
      placeSubtitle.textContent = 'Визначаємо адресу...';
      
      // Reverse Geocoding
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        headers: { 'Accept-Language': 'uk, en' }
      })
      .then(res => res.json())
      .then(data => {
        if (data && data.display_name) {
          const parts = data.display_name.split(', ');
          placeTitle.textContent = parts[0] || 'Точка на карті';
          placeSubtitle.textContent = parts.slice(1, 4).join(', ');
        } else {
          placeSubtitle.textContent = 'Точка на місцевості';
        }
      })
      .catch(() => {
        placeSubtitle.textContent = 'Немає детальної інформації про адресу';
      });
    }
  }

  closePlaceCardBtn.addEventListener('click', () => {
    placeCard.classList.add('hidden');
    if (currentMarker) {
      map.removeLayer(currentMarker);
      currentMarker = null;
    }
  });

  centerPlaceBtn.addEventListener('click', () => {
    if (currentMarker) {
      map.panTo(currentMarker.getLatLng());
    }
  });

  copyCoordsBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(placeCoords.textContent).then(() => {
      showToast('Координати скопійовано!');
    });
  });

  shareLinkBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      showToast('Посилання на це місце скопійовано!');
    });
  });

  // --- ПОШУК (NOMINATIM / КООРДИНАТИ) ---
  let searchDebounceTimeout = null;

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim();
    clearSearchBtn.classList.toggle('hidden', query.length === 0);

    clearTimeout(searchDebounceTimeout);
    if (query.length < 2) {
      searchResults.classList.add('hidden');
      searchResults.innerHTML = '';
      return;
    }

    searchDebounceTimeout = setTimeout(() => {
      performSearch(query);
    }, 350);
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.classList.add('hidden');
    searchResults.classList.add('hidden');
    searchResults.innerHTML = '';
    searchInput.focus();
  });

  searchSubmitBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) executeDirectSearch(query);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const query = searchInput.value.trim();
      if (query) executeDirectSearch(query);
    }
  });

  function performSearch(query) {
    // Перевірка чи введені координати напряму (наприклад "50.45, 30.52")
    const coordMatch = query.match(/^([+-]?\d+(\.\d+)?)[,\s]+([+-]?\d+(\.\d+)?)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lon = parseFloat(coordMatch[3]);
      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        renderSuggestions([{
          lat: lat,
          lon: lon,
          display_name: `Координати: ${lat.toFixed(5)}, ${lon.toFixed(5)}`
        }]);
        return;
      }
    }

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6&addressdetails=1`, {
      headers: { 'Accept-Language': 'uk, en' }
    })
    .then(res => res.json())
    .then(data => {
      renderSuggestions(data);
    })
    .catch(err => {
      console.error('Помилка пошуку:', err);
    });
  }

  function renderSuggestions(items) {
    if (!items || items.length === 0) {
      searchResults.innerHTML = '<div class="search-result-item"><div class="result-texts"><span class="result-name">Нічого не знайдено</span></div></div>';
      searchResults.classList.remove('hidden');
      return;
    }

    searchResults.innerHTML = '';
    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'search-result-item';
      
      const parts = item.display_name.split(', ');
      const mainName = parts[0];
      const subName = parts.slice(1, 4).join(', ');

      div.innerHTML = `
        <div class="result-icon">📍</div>
        <div class="result-texts">
          <span class="result-name">${escapeHtml(mainName)}</span>
          <span class="result-address">${escapeHtml(subName)}</span>
        </div>
      `;

      div.addEventListener('click', () => {
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        goToLocation(lat, lon, 14, mainName, subName);
        searchResults.classList.add('hidden');
      });

      searchResults.appendChild(div);
    });

    searchResults.classList.remove('hidden');
  }

  function executeDirectSearch(query) {
    searchResults.classList.add('hidden');
    // Перевірка пресетів
    if (PRESET_PLACES[query]) {
      const p = PRESET_PLACES[query];
      if (p.layer) setBaseLayer(p.layer);
      goToLocation(p.lat, p.lon, p.zoom, p.name, p.desc);
      return;
    }

    // Пошук через API
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
      headers: { 'Accept-Language': 'uk, en' }
    })
    .then(res => res.json())
    .then(data => {
      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        const parts = item.display_name.split(', ');
        goToLocation(lat, lon, 14, parts[0], parts.slice(1, 4).join(', '));
      } else {
        showToast('Локацію не знайдено');
      }
    })
    .catch(() => {
      showToast('Помилка підключення до сервісу пошуку');
    });
  }

  function goToLocation(lat, lon, zoom = 14, title = null, subtitle = null) {
    map.flyTo([lat, lon], zoom, { duration: 1.5 });
    inspectLocation(lat, lon, title, subtitle);
  }

  // Швидкі чіпи
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.dataset.query;
      searchInput.value = q;
      clearSearchBtn.classList.remove('hidden');
      executeDirectSearch(q);
    });
  });

  // --- ГЕОЛОКАЦІЯ ---
  myLocationBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      showToast('Геолокація не підтримується цим браузером');
      return;
    }

    showToast('Визначаємо ваше місцезнаходження...');
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const accuracy = pos.coords.accuracy;

      map.flyTo([lat, lon], 15, { duration: 1.5 });

      if (window.userLocationCircle) {
        map.removeLayer(window.userLocationCircle);
      }

      window.userLocationCircle = L.circle([lat, lon], {
        radius: accuracy,
        color: '#1a73e8',
        fillColor: '#1a73e8',
        fillOpacity: 0.15,
        weight: 1
      }).addTo(map);

      inspectLocation(lat, lon, 'Моє місцезнаходження', `Точність: близько ${Math.round(accuracy)} м`);
    }, (err) => {
      showToast('Не вдалося отримати доступ до геолокації');
    }, {
      enableHighAccuracy: true,
      timeout: 10000
    });
  });

  // --- ВИМІРЮВАННЯ ВІДСТАНЕЙ (ЛІНІЙКА) ---
  measureBtn.addEventListener('click', () => {
    toggleMeasureMode(!measureMode);
  });

  function toggleMeasureMode(enable) {
    measureMode = enable;
    measureBtn.classList.toggle('active', measureMode);
    measureBanner.classList.toggle('hidden', !measureMode);

    if (measureMode) {
      map.getContainer().style.cursor = 'crosshair';
      showToast('Клікайте на карті, щоб додати точки вимірювання');
    } else {
      map.getContainer().style.cursor = '';
      clearMeasure();
    }
  }

  function addMeasurePoint(latlng) {
    measurePoints.push(latlng);

    const marker = L.circleMarker(latlng, {
      radius: 5,
      color: '#fff',
      fillColor: '#1a73e8',
      fillOpacity: 1,
      weight: 2
    }).addTo(map);
    measureMarkers.push(marker);

    if (measurePoints.length > 1) {
      if (!measureLine) {
        measureLine = L.polyline(measurePoints, {
          color: '#1a73e8',
          weight: 3,
          dashArray: '6, 6'
        }).addTo(map);
      } else {
        measureLine.setLatLngs(measurePoints);
      }
    }

    updateMeasureDistance();
  }

  function updateMeasureDistance() {
    let totalMeters = 0;
    for (let i = 0; i < measurePoints.length - 1; i++) {
      totalMeters += measurePoints[i].distanceTo(measurePoints[i + 1]);
    }

    if (totalMeters >= 1000) {
      measureDistanceText.textContent = `${(totalMeters / 1000).toFixed(2)} км`;
    } else {
      measureDistanceText.textContent = `${Math.round(totalMeters)} м`;
    }
  }

  function clearMeasure() {
    measurePoints = [];
    measureMarkers.forEach(m => map.removeLayer(m));
    measureMarkers = [];
    if (measureLine) {
      map.removeLayer(measureLine);
      measureLine = null;
    }
    measureDistanceText.textContent = '0.00 км';
  }

  clearMeasureBtn.addEventListener('click', clearMeasure);
  closeMeasureBtn.addEventListener('click', () => toggleMeasureMode(false));

  // --- ПОВНИЙ ЕКРАН ---
  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        showToast('Повноекранний режим недоступний');
      });
    } else {
      document.exitFullscreen();
    }
  });

  // --- ТОСТ-ПОВІДОМЛЕННЯ ---
  let toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 2800);
  }

  function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
  }
});
