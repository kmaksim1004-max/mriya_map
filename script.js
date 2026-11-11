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
        maxZoom: 19,
        crossOrigin: 'anonymous'
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
  let activeLayerKey = 'satellite';

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

  // Елементи роботи з територіями (полігонами)
  const areaDrawBtn = document.getElementById('areaDrawBtn');
  const areaBanner = document.getElementById('areaBanner');
  const areaPointsCount = document.getElementById('areaPointsCount');
  const finishAreaBtn = document.getElementById('finishAreaBtn');
  const clearAreaBtn = document.getElementById('clearAreaBtn');
  const closeAreaBtn = document.getElementById('closeAreaBtn');
  const pasteBanner = document.getElementById('pasteBanner');
  const pasteCenterBtn = document.getElementById('pasteCenterBtn');
  const cancelPasteBtn = document.getElementById('cancelPasteBtn');
  const polygonCard = document.getElementById('polygonCard');
  const closePolygonCardBtn = document.getElementById('closePolygonCardBtn');
  const polygonNameInput = document.getElementById('polygonNameInput');
  const polygonStatusTag = document.getElementById('polygonStatusTag');
  const polygonAreaText = document.getElementById('polygonAreaText');
  const polygonPerimeterText = document.getElementById('polygonPerimeterText');
  const copyPolygonBtn = document.getElementById('copyPolygonBtn');
  const pastePolygonBtn = document.getElementById('pastePolygonBtn');
  const fitPolygonBtn = document.getElementById('fitPolygonBtn');
  const polygonRotateSlider = document.getElementById('polygonRotateSlider');
  const polygonRotateValue = document.getElementById('polygonRotateValue');
  const rotateLeftBtn = document.getElementById('rotateLeftBtn');
  const rotateRightBtn = document.getElementById('rotateRightBtn');
  const rotateResetBtn = document.getElementById('rotateResetBtn');
  const polygonScaleSlider = document.getElementById('polygonScaleSlider');
  const polygonScaleValue = document.getElementById('polygonScaleValue');
  const scaleDownBtn = document.getElementById('scaleDownBtn');
  const scaleUpBtn = document.getElementById('scaleUpBtn');
  const scaleResetBtn = document.getElementById('scaleResetBtn');
  const deletePolygonBtn = document.getElementById('deletePolygonBtn');
  const polygonOpacitySlider = document.getElementById('polygonOpacitySlider');
  const polygonOpacityValue = document.getElementById('polygonOpacityValue');

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

  // --- КЛІК ПО КАРТІ (ІНСПЕКТОР ТОЧКИ, ЛІНІЙКА, МАЛЮВАННЯ ТА ВСТАВКА ТЕРИТОРІЙ) ---
  map.on('click', (e) => {
    if (pasteMode) {
      pastePolygonAt(e.latlng);
      return;
    }

    if (areaDrawMode) {
      addAreaDrawPoint(e.latlng);
      return;
    }

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

  // ==========================================
  // РОБОТА З ТЕРИТОРІЯМИ (ПОЛІГОНАМИ)
  // Створення, масштабування, обертання, копіювання та вставка
  // ==========================================

  let areaDrawMode = false;
  let areaDrawPoints = [];
  let areaDrawMarkers = [];
  let areaDrawLine = null;

  let polygons = [];
  let activePolygon = null;
  let polygonClipboard = null;
  let pasteMode = false;
  let activeHandles = [];
  let centerHandle = null;


  // Векторно-супутниковий оверлей для відображення вирізаного супутникового знімка території
  const TerritoryOverlay = L.Layer.extend({
    initialize: function(poly) {
      this.poly = poly;
      this._canvas = null;
      this._map = null;
    },
    onAdd: function(map) {
      this._map = map;
      this._canvas = L.DomUtil.create('canvas', 'territory-overlay-canvas');
      this._canvas.style.position = 'absolute';
      this._canvas.style.pointerEvents = 'none';
      map.getPanes().overlayPane.appendChild(this._canvas);
      map.on('viewreset move zoom zoomend', this.update, this);
      this.update();
    },
    onRemove: function(map) {
      if (this._canvas && this._canvas.parentNode) {
        this._canvas.parentNode.removeChild(this._canvas);
      }
      if (this._map) {
        this._map.off('viewreset move zoom zoomend', this.update, this);
      }
      this._canvas = null;
      this._map = null;
    },
    update: function() {
      if (!this._map || !this._canvas || !this.poly || !this.poly.sourceImage) return;

      const poly = this.poly;
      const currentCoords = computeTransformedLatLngs(poly);
      if (!currentCoords || currentCoords.length < 3) return;

      const bounds = L.latLngBounds(currentCoords);
      const nw = this._map.latLngToLayerPoint(bounds.getNorthWest());
      const se = this._map.latLngToLayerPoint(bounds.getSouthEast());

      const padding = 30;
      const w = Math.ceil(se.x - nw.x) + padding * 2;
      const h = Math.ceil(se.y - nw.y) + padding * 2;

      if (w <= 0 || h <= 0) return;

      const canvasOrigin = nw.subtract([padding, padding]);
      L.DomUtil.setPosition(this._canvas, canvasOrigin);
      this._canvas.width = w;
      this._canvas.height = h;

      const ctx = this._canvas.getContext('2d');
      ctx.clearRect(0, 0, w, h);

      // Кліпування по контуру полігону на екрані
      ctx.beginPath();
      currentCoords.forEach((latlng, idx) => {
        const pt = this._map.latLngToLayerPoint(latlng).subtract(canvasOrigin);
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.closePath();
      ctx.clip();

      // Масштабування відносно зуму захоплення знімка
      const currentZoom = this._map.getZoom();
      const zoomScale = Math.pow(2, currentZoom - poly.captureZoom);
      const latScale = Math.cos(poly.center.lat * Math.PI / 180) / Math.max(0.0001, Math.cos(poly.captureCenter.lat * Math.PI / 180));
      const effectiveScale = (poly.scale / 100) * zoomScale * latScale;

      const centerPt = this._map.latLngToLayerPoint(poly.center).subtract(canvasOrigin);

      ctx.save();
      ctx.translate(centerPt.x, centerPt.y);
      ctx.rotate((poly.rotation * Math.PI) / 180);
      ctx.scale(effectiveScale, effectiveScale);
      ctx.globalAlpha = poly.opacity !== undefined ? poly.opacity : 1.0;

      const sourceCenter = poly.sourceCenterInImg || { x: poly.sourceWidth / 2, y: poly.sourceHeight / 2 };
      ctx.drawImage(poly.sourceImage, -sourceCenter.x, -sourceCenter.y);
      ctx.restore();
    }
  });

  // Захоплення супутникового знімка всередині полігону
  async function capturePolygonImagery(poly) {
    const coords = computeTransformedLatLngs(poly);
    if (!coords || coords.length < 3) return;

    const bounds = L.latLngBounds(coords);
    const captureZoom = Math.min(18, Math.max(10, map.getZoom()));

    const nw = map.project(bounds.getNorthWest(), captureZoom);
    const se = map.project(bounds.getSouthEast(), captureZoom);

    const width = Math.max(10, Math.ceil(se.x - nw.x));
    const height = Math.max(10, Math.ceil(se.y - nw.y));

    const minTileX = Math.floor(nw.x / 256);
    const maxTileX = Math.floor(se.x / 256);
    const minTileY = Math.floor(nw.y / 256);
    const maxTileY = Math.floor(se.y / 256);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const tilePromises = [];
    for (let ty = minTileY; ty <= maxTileY; ty++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        const tileUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${captureZoom}/${ty}/${tx}`;
        const dx = tx * 256 - nw.x;
        const dy = ty * 256 - nw.y;

        const p = new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              ctx.drawImage(img, dx, dy);
            } catch (e) {}
            resolve();
          };
          img.onerror = () => resolve();
          img.src = tileUrl;
        });
        tilePromises.push(p);
      }
    }

    await Promise.all(tilePromises);

    const centerPt = map.project(poly.center, captureZoom);

    poly.sourceImage = canvas;
    poly.sourceWidth = width;
    poly.sourceHeight = height;
    poly.sourceCenterInImg = { x: centerPt.x - nw.x, y: centerPt.y - nw.y };
    poly.captureZoom = captureZoom;
    poly.captureCenter = { lat: poly.center.lat, lng: poly.center.lng };

    if (poly.imageOverlayLayer) {
      poly.imageOverlayLayer.update();
    }
  }

  // Увімкнення / вимкнення режиму створення території
  areaDrawBtn.addEventListener('click', () => {
    toggleAreaDrawMode(!areaDrawMode);
  });

  function toggleAreaDrawMode(enable) {
    areaDrawMode = enable;
    areaDrawBtn.classList.toggle('active', areaDrawMode);
    areaBanner.classList.toggle('hidden', !areaDrawMode);

    if (areaDrawMode) {
      map.doubleClickZoom.disable();
      if (measureMode) toggleMeasureMode(false);
      if (pasteMode) setPasteMode(false);
      deselectPolygon();
      map.getContainer().style.cursor = 'crosshair';
      showToast('Клікайте по карті для створення вершин. Для замикання: клікніть червону точку або двічі клікніть.');
    } else {
      map.doubleClickZoom.enable();
      map.getContainer().style.cursor = '';
      clearAreaDrawing();
    }
  }

  function addAreaDrawPoint(latlng) {
    // Якщо точок >= 3 і клік здійснено поблизу першої точки (у межах 25 екранних пікселів) — замикаємо
    if (areaDrawPoints.length >= 3) {
      const pClick = map.latLngToContainerPoint(latlng);
      const pFirst = map.latLngToContainerPoint(areaDrawPoints[0]);
      if (pClick.distanceTo(pFirst) <= 25) {
        finishPolygonDrawing();
        return;
      }
    }

    areaDrawPoints.push(latlng);

    const isFirst = areaDrawPoints.length === 1;
    const marker = L.circleMarker(latlng, {
      radius: isFirst ? 10 : 5,
      color: '#ffffff',
      fillColor: isFirst ? '#ea4335' : '#1a73e8',
      fillOpacity: 1,
      weight: isFirst ? 3 : 2
    }).addTo(map);

    if (isFirst) {
      marker.bindTooltip('Клікніть сюди для замикання контуру', { permanent: false, direction: 'top', offset: [0, -8] });
      marker.on('click', (e) => {
        if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
        if (areaDrawPoints.length >= 3) {
          finishPolygonDrawing();
        } else {
          showToast('Потрібно мінімум 3 точки для створення замкненої території');
        }
      });
    }

    areaDrawMarkers.push(marker);

    if (areaDrawPoints.length > 1) {
      if (!areaDrawLine) {
        areaDrawLine = L.polyline(areaDrawPoints, {
          color: '#1a73e8',
          weight: 2,
          dashArray: '6, 6'
        }).addTo(map);
      } else {
        areaDrawLine.setLatLngs(areaDrawPoints);
      }
    }

    areaPointsCount.textContent = `${areaDrawPoints.length} точок`;
  }

  function clearAreaDrawing() {
    areaDrawPoints = [];
    areaDrawMarkers.forEach(m => map.removeLayer(m));
    areaDrawMarkers = [];
    if (areaDrawLine) {
      map.removeLayer(areaDrawLine);
      areaDrawLine = null;
    }
    areaPointsCount.textContent = '0 точок';
  }

  map.on('dblclick', (e) => {
    if (areaDrawMode && areaDrawPoints.length >= 3) {
      if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
      finishPolygonDrawing();
    }
  });
  clearAreaBtn.addEventListener('click', clearAreaDrawing);
  closeAreaBtn.addEventListener('click', () => toggleAreaDrawMode(false));

  finishAreaBtn.addEventListener('click', () => {
    if (areaDrawPoints.length < 3) {
      showToast('Для створення території потрібно мінімум 3 точки');
      return;
    }
    finishPolygonDrawing();
  });

  // Завершення створення полігону
  function finishPolygonDrawing() {
    if (areaDrawPoints.length < 3) return;

    // Розрахунок початкового центру (центроїда)
    const center = calculatePolygonCentroid(areaDrawPoints);

    // Розрахунок локальних метричних зміщень від центру
    const baseOffsets = computeMetricOffsets(areaDrawPoints, center);

    const polyLayer = L.polygon(areaDrawPoints, {
      color: '#1a73e8',
      fillColor: '#1a73e8',
      fillOpacity: 0.15,
      weight: 2
    }).addTo(map);

    const polyId = 'poly_' + Date.now();
    const polyData = {
      id: polyId,
      name: `Територія ${polygons.length + 1}`,
      center: center,
      baseOffsets: baseOffsets,
      scale: 100,
      rotation: 0,
      color: '#1a73e8',
      opacity: 1.0,
      sourceImage: null,
      sourceWidth: 0,
      sourceHeight: 0,
      sourceCenterInImg: null,
      captureZoom: map.getZoom(),
      captureCenter: { lat: center.lat, lng: center.lng },
      layer: polyLayer,
      imageOverlayLayer: null
    };

    polyData.imageOverlayLayer = new TerritoryOverlay(polyData).addTo(map);

    polyLayer.on('click', (e) => {
      if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
      if (!areaDrawMode && !pasteMode && !measureMode) {
        selectPolygon(polyData);
      }
    });

    polygons.push(polyData);
    toggleAreaDrawMode(false);
    selectPolygon(polyData);

    capturePolygonImagery(polyData).then(() => {
      polyLayer.setStyle({ fillOpacity: 0.02 });
      if (polyData.imageOverlayLayer) {
        polyData.imageOverlayLayer.update();
      }
    });

    showToast('Територію створено! Супутниковий знімок всередині захоплено та готовий до копіювання.');
  }

  // Обчислення центроїда
  function calculatePolygonCentroid(latlngs) {
    let sumLat = 0;
    let sumLng = 0;
    latlngs.forEach(pt => {
      sumLat += pt.lat;
      sumLng += pt.lng;
    });
    return {
      lat: sumLat / latlngs.length,
      lng: sumLng / latlngs.length
    };
  }

  // Розрахунок локальних зміщень у метрах від центру
  function computeMetricOffsets(latlngs, center) {
    const cosLat = Math.cos(center.lat * Math.PI / 180);
    return latlngs.map(pt => ({
      dx: (pt.lng - center.lng) * 111320 * cosLat,
      dy: (pt.lat - center.lat) * 111320
    }));
  }

  // Обчислення трансформованих координат полігону
  function computeTransformedLatLngs(poly) {
    const s = poly.scale / 100;
    const rad = (poly.rotation * Math.PI) / 180;
    const cosR = Math.cos(rad);
    const sinR = Math.sin(rad);
    const cosLat = Math.max(0.0001, Math.cos(poly.center.lat * Math.PI / 180));

    return poly.baseOffsets.map(offset => {
      const xRot = s * (offset.dx * cosR - offset.dy * sinR);
      const yRot = s * (offset.dx * sinR + offset.dy * cosR);

      return L.latLng(
        poly.center.lat + (yRot / 111320),
        poly.center.lng + (xRot / (111320 * cosLat))
      );
    });
  }

  // Оновлення шару полігону та ручок
  function updatePolygonLayer(poly) {
    const newCoords = computeTransformedLatLngs(poly);
    poly.layer.setLatLngs(newCoords);
    if (poly.imageOverlayLayer) {
      poly.imageOverlayLayer.update();
    }
    updatePolygonMetricsDisplay(newCoords);

    if (activePolygon === poly) {
      updateHandlePositions(newCoords);
    }
  }

  // Розрахунок площі та периметру
  function calculateMetrics(coords) {
    let perimeter = 0;
    for (let i = 0; i < coords.length; i++) {
      const next = coords[(i + 1) % coords.length];
      perimeter += coords[i].distanceTo(next);
    }

    // Shoelace formula для площі у метрах
    let area = 0;
    const center = coords[0];
    const cosLat = Math.cos(center.lat * Math.PI / 180);
    const pts = coords.map(c => ({
      x: (c.lng - center.lng) * 111320 * cosLat,
      y: (c.lat - center.lat) * 111320
    }));

    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      area += pts[i].x * pts[j].y;
      area -= pts[j].x * pts[i].y;
    }
    area = Math.abs(area) / 2;

    return { area, perimeter };
  }

  function updatePolygonMetricsDisplay(coords) {
    const { area, perimeter } = calculateMetrics(coords);

    if (area >= 1000000) {
      polygonAreaText.textContent = `${(area / 1000000).toFixed(2)} км²`;
    } else if (area >= 10000) {
      polygonAreaText.textContent = `${(area / 10000).toFixed(2)} га`;
    } else {
      polygonAreaText.textContent = `${Math.round(area).toLocaleString()} м²`;
    }

    if (perimeter >= 1000) {
      polygonPerimeterText.textContent = `${(perimeter / 1000).toFixed(2)} км`;
    } else {
      polygonPerimeterText.textContent = `${Math.round(perimeter)} м`;
    }
  }

  // Виділення полігону
  function selectPolygon(poly) {
    deselectPolygon();
    activePolygon = poly;

    // Закриваємо картку місця якщо відкрита
    placeCard.classList.add('hidden');

    polygonNameInput.value = poly.name;
    polygonStatusTag.textContent = 'Активна територія';
    polygonRotateSlider.value = poly.rotation;
    polygonRotateValue.textContent = `${poly.rotation}°`;
    polygonScaleSlider.value = poly.scale;
    polygonScaleValue.textContent = `${poly.scale}%`;

    const opVal = Math.round((poly.opacity !== undefined ? poly.opacity : 1.0) * 100);
    polygonOpacitySlider.value = opVal;
    polygonOpacityValue.textContent = `${opVal}%`;

    // Палітра
    document.querySelectorAll('.color-dot').forEach(dot => {
      dot.classList.toggle('active', dot.dataset.color === poly.color);
    });

    polygonCard.classList.remove('hidden');

    const currentCoords = computeTransformedLatLngs(poly);
    updatePolygonMetricsDisplay(currentCoords);
    createHandles(poly, currentCoords);
  }

  function deselectPolygon() {
    removeHandles();
    activePolygon = null;
    polygonCard.classList.add('hidden');
  }

  closePolygonCardBtn.addEventListener('click', deselectPolygon);

  // Створення ручок для перетягування та візуалізації вершин
  function createHandles(poly, coords) {
    removeHandles();

    // Маркер центру для перетягування полігону
    const centerIcon = L.divIcon({
      className: 'polygon-center-handle',
      html: '<div style="background:#fff;border:2px solid ' + poly.color + ';width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 5px rgba(0,0,0,0.3);cursor:move;font-size:11px;font-weight:bold;color:' + poly.color + '">✥</div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    centerHandle = L.marker([poly.center.lat, poly.center.lng], {
      icon: centerIcon,
      draggable: true,
      zIndexOffset: 1000
    }).addTo(map);

    centerHandle.bindTooltip('Перетягніть для переміщення території', { direction: 'top', offset: [0, -10] });

    centerHandle.on('drag', (e) => {
      poly.center = { lat: e.latlng.lat, lng: e.latlng.lng };
      updatePolygonLayer(poly);
    });

    // Маркери вершин
    coords.forEach(pt => {
      const h = L.circleMarker(pt, {
        radius: 4,
        color: '#fff',
        fillColor: poly.color,
        fillOpacity: 1,
        weight: 2
      }).addTo(map);
      activeHandles.push(h);
    });
  }

  function updateHandlePositions(coords) {
    if (centerHandle && activePolygon) {
      centerHandle.setLatLng([activePolygon.center.lat, activePolygon.center.lng]);
    }
    coords.forEach((pt, i) => {
      if (activeHandles[i]) {
        activeHandles[i].setLatLng(pt);
      }
    });
  }

  function removeHandles() {
    if (centerHandle) {
      map.removeLayer(centerHandle);
      centerHandle = null;
    }
    activeHandles.forEach(h => map.removeLayer(h));
    activeHandles = [];
  }

  // Обертання території
  polygonRotateSlider.addEventListener('input', (e) => {
    if (!activePolygon) return;
    activePolygon.rotation = parseInt(e.target.value, 10);
    polygonRotateValue.textContent = `${activePolygon.rotation}°`;
    updatePolygonLayer(activePolygon);
  });

  rotateLeftBtn.addEventListener('click', () => {
    if (!activePolygon) return;
    let r = activePolygon.rotation - 15;
    if (r < -180) r += 360;
    activePolygon.rotation = r;
    polygonRotateSlider.value = r;
    polygonRotateValue.textContent = `${r}°`;
    updatePolygonLayer(activePolygon);
  });

  rotateRightBtn.addEventListener('click', () => {
    if (!activePolygon) return;
    let r = activePolygon.rotation + 15;
    if (r > 180) r -= 360;
    activePolygon.rotation = r;
    polygonRotateSlider.value = r;
    polygonRotateValue.textContent = `${r}°`;
    updatePolygonLayer(activePolygon);
  });

  rotateResetBtn.addEventListener('click', () => {
    if (!activePolygon) return;
    activePolygon.rotation = 0;
    polygonRotateSlider.value = 0;
    polygonRotateValue.textContent = '0°';
    updatePolygonLayer(activePolygon);
  });

  // Масштабування території
  polygonScaleSlider.addEventListener('input', (e) => {
    if (!activePolygon) return;
    activePolygon.scale = parseInt(e.target.value, 10);
    polygonScaleValue.textContent = `${activePolygon.scale}%`;
    updatePolygonLayer(activePolygon);
  });

  scaleDownBtn.addEventListener('click', () => {
    if (!activePolygon) return;
    const s = Math.max(20, activePolygon.scale - 10);
    activePolygon.scale = s;
    polygonScaleSlider.value = s;
    polygonScaleValue.textContent = `${s}%`;
    updatePolygonLayer(activePolygon);
  });

  scaleUpBtn.addEventListener('click', () => {
    if (!activePolygon) return;
    const s = Math.min(300, activePolygon.scale + 10);
    activePolygon.scale = s;
    polygonScaleSlider.value = s;
    polygonScaleValue.textContent = `${s}%`;
    updatePolygonLayer(activePolygon);
  });

  scaleResetBtn.addEventListener('click', () => {
    if (!activePolygon) return;
    activePolygon.scale = 100;
    polygonScaleSlider.value = 100;
    polygonScaleValue.textContent = '100%';
    updatePolygonLayer(activePolygon);
  });

  // Зміна кольору
  document.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      if (!activePolygon) return;
      const col = dot.dataset.color;
      activePolygon.color = col;
      activePolygon.layer.setStyle({ color: col, fillColor: col });

      document.querySelectorAll('.color-dot').forEach(d => d.classList.toggle('active', d === dot));
      const currentCoords = computeTransformedLatLngs(activePolygon);
      createHandles(activePolygon, currentCoords);
    });
  });

  // Перейменування
  polygonNameInput.addEventListener('input', (e) => {
    if (activePolygon) {
      activePolygon.name = e.target.value || 'Територія';
    }
  });

  // Огляд (центрування на території)
  fitPolygonBtn.addEventListener('click', () => {
    if (activePolygon) {
      map.fitBounds(activePolygon.layer.getBounds(), { padding: [50, 50] });
    }
  });

  // Видалення території

  // Прозорість супутникового знімка території
  polygonOpacitySlider.addEventListener('input', (e) => {
    if (!activePolygon) return;
    const val = parseInt(e.target.value, 10);
    activePolygon.opacity = val / 100;
    polygonOpacityValue.textContent = `${val}%`;
    if (activePolygon.imageOverlayLayer) {
      activePolygon.imageOverlayLayer.update();
    }
  });

  deletePolygonBtn.addEventListener('click', () => {
    if (!activePolygon) return;
    if (activePolygon.imageOverlayLayer) {
      map.removeLayer(activePolygon.imageOverlayLayer);
    }
    map.removeLayer(activePolygon.layer);
    polygons = polygons.filter(p => p.id !== activePolygon.id);
    deselectPolygon();
    showToast('Територію видалено');
  });

  // КОПІЮВАННЯ ТА ВСТАВКА
  copyPolygonBtn.addEventListener('click', copySelectedPolygon);

  function copySelectedPolygon() {
    if (!activePolygon) return;
    polygonClipboard = {
      name: `${activePolygon.name} (копія)`,
      baseOffsets: JSON.parse(JSON.stringify(activePolygon.baseOffsets)),
      scale: activePolygon.scale,
      rotation: activePolygon.rotation,
      color: activePolygon.color,
      opacity: activePolygon.opacity !== undefined ? activePolygon.opacity : 1.0,
      sourceImage: activePolygon.sourceImage,
      sourceWidth: activePolygon.sourceWidth,
      sourceHeight: activePolygon.sourceHeight,
      sourceCenterInImg: activePolygon.sourceCenterInImg,
      captureZoom: activePolygon.captureZoom,
      captureCenter: activePolygon.captureCenter
    };
    showToast(`Супутникову територію "${activePolygon.name}" скопійовано! Натисніть "Вставити" та клікніть на карті.`);
  }

  pastePolygonBtn.addEventListener('click', () => {
    if (!polygonClipboard) {
      if (activePolygon) {
        copySelectedPolygon();
      } else {
        showToast('Спочатку виберіть та скопіюйте територію');
        return;
      }
    }
    setPasteMode(true);
  });

  function setPasteMode(enable) {
    pasteMode = enable;
    pasteBanner.classList.toggle('hidden', !pasteMode);

    if (pasteMode) {
      if (areaDrawMode) toggleAreaDrawMode(false);
      if (measureMode) toggleMeasureMode(false);
      map.getContainer().style.cursor = 'crosshair';
      showToast('Клікніть у будь-яку точку карти, щоб розмістити скопійовану територію');
    } else {
      map.getContainer().style.cursor = '';
    }
  }

  cancelPasteBtn.addEventListener('click', () => setPasteMode(false));

  pasteCenterBtn.addEventListener('click', () => {
    pastePolygonAt(map.getCenter());
  });

  // Вставка скопійованої території в обрану точку
  function pastePolygonAt(targetLatLng) {
    if (!polygonClipboard) return;

    const newCenter = { lat: targetLatLng.lat, lng: targetLatLng.lng };
    const polyId = 'poly_' + Date.now();

    const polyData = {
      id: polyId,
      name: `${polygonClipboard.name}`,
      center: newCenter,
      baseOffsets: JSON.parse(JSON.stringify(polygonClipboard.baseOffsets)),
      scale: polygonClipboard.scale,
      rotation: polygonClipboard.rotation,
      color: polygonClipboard.color,
      opacity: polygonClipboard.opacity !== undefined ? polygonClipboard.opacity : 1.0,
      sourceImage: polygonClipboard.sourceImage,
      sourceWidth: polygonClipboard.sourceWidth,
      sourceHeight: polygonClipboard.sourceHeight,
      sourceCenterInImg: polygonClipboard.sourceCenterInImg,
      captureZoom: polygonClipboard.captureZoom,
      captureCenter: polygonClipboard.captureCenter,
      layer: null,
      imageOverlayLayer: null
    };

    const initialCoords = computeTransformedLatLngs(polyData);
    const polyLayer = L.polygon(initialCoords, {
      color: polyData.color,
      fillColor: polyData.color,
      fillOpacity: polyData.sourceImage ? 0.02 : 0.25,
      weight: 2
    }).addTo(map);

    polyData.layer = polyLayer;
    polyData.imageOverlayLayer = new TerritoryOverlay(polyData).addTo(map);

    polyLayer.on('click', (e) => {
      if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
      if (!areaDrawMode && !pasteMode && !measureMode) {
        selectPolygon(polyData);
      }
    });

    polygons.push(polyData);
    setPasteMode(false);
    selectPolygon(polyData);
    showToast('Скопійовану супутникову територію успішно вставлено!');
  }

  // ГАРЯЧІ КЛАВІШІ (Ctrl+C, Ctrl+V, Esc, Delete)
  document.addEventListener('keydown', (e) => {
    const isInputFocused = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);

    if (e.key === 'Enter' && areaDrawMode && areaDrawPoints.length >= 3) {
      finishPolygonDrawing();
      return;
    }

    if (e.key === 'Escape') {
      if (pasteMode) setPasteMode(false);
      if (areaDrawMode) toggleAreaDrawMode(false);
      if (measureMode) toggleMeasureMode(false);
      if (activePolygon) deselectPolygon();
      return;
    }

    if (isInputFocused) return;

    // Ctrl+C / Cmd+C
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
      if (activePolygon) {
        e.preventDefault();
        copySelectedPolygon();
      }
    }

    // Ctrl+V / Cmd+V
    if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
      if (polygonClipboard) {
        e.preventDefault();
        setPasteMode(true);
      }
    }

    // Delete / Backspace
    if (e.key === 'Delete' && activePolygon) {
      deletePolygonBtn.click();
    }
  });

});
