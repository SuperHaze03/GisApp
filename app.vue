<template>
  <div class="h-screen flex flex-col" :class="{'dark': isDarkMode}">
    <!-- Search Bar with Google Maps styling -->
    <div class="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 w-11/12 max-w-xl">
      <div class="bg-white rounded-lg shadow-lg p-2 flex items-center space-x-2">
        <button class="p-2 rounded-full hover:bg-gray-100">
     
        </button>
        <div class="flex-1 flex items-center bg-gray-50 hover:bg-gray-100 rounded-lg px-4 py-2">
          <span class="material-icons text-gray-600 mr-3">search</span>
          <input
            type="text"
            v-model="searchQuery"
            @keyup.enter="searchPlaces"
            placeholder="Cari makanan/minuman"
            class="w-full bg-transparent focus:outline-none"
          />
        </div>
        <button class="p-2 rounded-full hover:bg-gray-100">
          <span class="material-icons text-gray-600">layers</span>
        </button>
        <button class="p-2 rounded-full hover:bg-gray-100">
          <span class="material-icons text-gray-600">account_circle</span>
        </button>
      </div>
    </div>

    <!-- Map Container -->
    <div class="flex-1 relative">
      <div id="map" class="w-full h-full"></div>
      
      <!-- Loading Indicator -->
      <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80">
        <div class="flex items-center space-x-2">
          <div class="w-5 h-5 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span class="text-gray-700">Loading Maps...</span>
        </div>
      </div>
    </div>

    <!-- Results Panel -->
    <div 
      v-if="searchResults.length > 0" 
      class="absolute left-0 top-0 h-full bg-white w-96 shadow-lg transform transition-transform duration-300"
      :class="{'translate-x-0': showResults, '-translate-x-full': !showResults}"
    >
      <div class="h-full flex flex-col">
        <div class="p-4 border-b">
          <div class="flex justify-between items-center">
            <h2 class="text-xl text-gray-800">Places</h2>
            <button @click="showResults = false" class="p-2 hover:bg-gray-100 rounded-full">
              <span class="material-icons text-gray-600">arrow_back</span>
            </button>
          </div>
        </div>
        
        <!-- Results List -->
        <div class="flex-1 overflow-y-auto custom-scrollbar">
          <div 
            v-for="place in searchResults" 
            :key="place.id"
            class="p-4 hover:bg-gray-50 cursor-pointer border-b"
            @click="showRoute(place)"
          >
            <div class="flex items-start space-x-4">
              <div class="p-2 bg-gray-100 rounded-full">
                <span class="material-icons text-gray-600">place</span>
              </div>
              <div>
                <h3 class="font-medium text-gray-900">{{ place.poi?.name || place.name }}</h3>
                <p class="text-gray-600 text-sm mt-1">{{ place.address.freeformAddress }}</p>
                <p class="text-blue-600 text-sm mt-2">{{ formatDistance(place.dist) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Toast -->
    <div 
      v-if="error" 
      class="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white text-gray-900 px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2"
    >
      <span class="material-icons text-red-500">error</span>
      <span>{{ error }}</span>
    </div>

    <div class="absolute top-4 left-4 z-10">
      <button @click="toggleDarkMode" class="p-2 hover:bg-gray-100 rounded-full bg-white shadow-md">
        <span v-if="isDarkMode" class="material-icons text-gray-600">brightness_5</span>
        <span v-else class="material-icons text-gray-600">brightness_4</span>
      </button>
    </div>

 

  </div>
</template>

<script setup>
const config = useRuntimeConfig();
const TOMTOM_API_KEY = 'LMIGait3SK3U6DQ0GfjDAC7vEv726Et6';

const searchQuery = ref('');
const searchResults = ref([]);
const loading = ref(false);
const error = ref(null);
const userLocation = ref({ lat: 0, lng: 0 });
const showResults = ref(false);
let map = null;
let userMarker = null;
let searchMarkers = [];
let currentRoute = null;
const isDarkMode = ref(false);

const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value;
  toggleMapStyle();
};

const toggleMapStyle = () => {
  const style = isDarkMode.value
    ? 'https://api.tomtom.com/style/1/style/22.2.1-*?map=2/basic_street-dark&poi=2/poi_dark'
    : 'https://api.tomtom.com/style/1/style/22.2.1-*?map=2/basic_street-light&poi=2/poi_light';
  map.value.setStyle(style);
};

// Format distance
const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)} meter`;
  }
  return `${(meters / 1000).toFixed(1)} kilometer`;
};

// Initialize map
const initializeMap = async () => {
  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });

    const { latitude, longitude } = position.coords;
    userLocation.value = { lat: latitude, lng: longitude };

    map = tt.map({
      key: TOMTOM_API_KEY,
      container: 'map',
      center: [longitude, latitude],
      zoom: 15,
      style: isDarkMode.value
        ? 'https://api.tomtom.com/style/1/style/22.2.1-*?map=2/basic_street-dark&poi=2/poi_dark'
        : 'https://api.tomtom.com/style/1/style/22.2.1-*?map=2/basic_street-light&poi=2/poi_light'
    });

    // Custom controls
    map.addControl(new tt.NavigationControl({
      showCompass: false,
      showZoom: false
    }));
    
    map.addControl(new tt.FullscreenControl());
    map.addControl(new tt.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showAccuracyCircle: false
    }));

    // Custom user location marker
    const element = document.createElement('div');
    element.className = 'custom-marker';
    element.innerHTML = `
      <div class="google-location-dot"></div>
      <div class="google-location-pulse"></div>
    `;

    userMarker = new tt.Marker({
      element: element
    })
    .setLngLat([longitude, latitude])
    .addTo(map);

    loading.value = false;
  } catch (err) {
    error.value = `Error: ${err.message}`;
    loading.value = false;
    console.error('Map initialization error:', err);
  }
};

// Search places
const searchPlaces = async () => {
  if (!searchQuery.value) return;
  
  loading.value = true;
  error.value = null;
  
  try {
    searchMarkers.forEach(marker => marker.remove());
    searchMarkers = [];
    
    if (currentRoute) {
      map.removeLayer(currentRoute);
      currentRoute = null;
    }

    const response = await fetch(
      `https://api.tomtom.com/search/2/search/${encodeURIComponent(searchQuery.value)}.json?` +
      `key=${TOMTOM_API_KEY}&` +
      `lat=${userLocation.value.lat}&` +
      `lon=${userLocation.value.lng}&` +
      `radius=5000&limit=10`
    );

    if (!response.ok) throw new Error('Gagal melakukan pencarian');

    const data = await response.json();
    searchResults.value = data.results;
    showResults.value = true;

    // Add markers for search results
    searchResults.value.forEach(place => {
      const element = document.createElement('div');
      element.className = 'search-marker';
      element.innerHTML = `<div class="marker-pin"></div>`;

      const marker = new tt.Marker({
        element: element
      })
      .setLngLat([place.position.lon, place.position.lat])
      .addTo(map);

      searchMarkers.push(marker);
    });

    const bounds = new tt.LngLatBounds();
    bounds.extend([userLocation.value.lng, userLocation.value.lat]);
    searchMarkers.forEach(marker => {
      bounds.extend(marker.getLngLat());
    });
    map.fitBounds(bounds, { padding: 50 });

  } catch (err) {
    error.value = `Gagal mencari lokasi: ${err.message}`;
    setTimeout(() => {
      error.value = null;
    }, 3000);
  } finally {
    loading.value = false;
  }
};

// Show route
const showRoute = async (place) => {
  try {
    if (currentRoute) {
      map.removeLayer(currentRoute);
      currentRoute = null;
    }

    const response = await fetch(
      `https://api.tomtom.com/routing/1/calculateRoute/${userLocation.value.lat},${userLocation.value.lng}:${place.position.lat},${place.position.lon}/json?` +
      `key=${TOMTOM_API_KEY}`
    );

    if (!response.ok) throw new Error('Gagal mendapatkan rute');

    const data = await response.json();
    const route = data.routes[0];

    map.addLayer({
      id: 'route',
      type: 'line',
      source: {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: route.legs[0].points
        }
      },
      paint: {
        'line-color': '#4285F4',
        'line-width': 6,
        'line-opacity': 0.8
      }
    });

    currentRoute = 'route';

    const bounds = new tt.LngLatBounds();
    route.legs[0].points.forEach(point => {
      bounds.extend([point.longitude, point.latitude]);
    });
    map.fitBounds(bounds, { padding: 50 });

  } catch (err) {
    error.value = `Gagal menampilkan rute: ${err.message}`;
    setTimeout(() => {
      error.value = null;
    }, 3000);
  }
};

// Load TomTom SDK and Material Icons
onMounted(() => {
  if (process.client) {
    loading.value = true;

    // Load Material Icons
    useHead({
      link: [
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/icon?family=Material+Icons'
        },
        {
          rel: 'stylesheet',
          href: 'https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.23.0/maps/maps.css'
        }
      ],
      script: [
        {
          src: 'https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.23.0/maps/maps-web.min.js',
          body: true
        }
      ]
    });

    // Initialize map after SDK is loaded
    const checkTomTom = setInterval(() => {
      if (window.tt) {
        clearInterval(checkTomTom);
        initializeMap();
      }
    }, 100);
  }
});
</script>

<style>
/* Google Maps-like styles */
.google-location-dot {
  width: 16px;
  height: 16px;
  background: #4285F4;
  border: 3px solid white;
  border-radius: 50%;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.3);
}

.google-location-pulse {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  background: rgba(66, 133, 244, 0.15);
  border-radius: 50%;
  animation: pulse 2s infinite ease-out;
}

.search-marker {
  position: relative;
}

.marker-pin {
  width: 20px;
  height: 20px;
  background: #EA4335;
  position: relative;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  top: -15px;
  left: -15px;
  border: 2px solid white;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.3);
}

.marker-pin::after {
  content: '';
  width: 10px;
  height: 10px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 50%;
}

@keyframes pulse {
  0% {
    transform: translate(-50%, -50%) scale(0.5);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 0;
  }
}

.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #bbb #f5f5f5;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #f5f5f5;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #bbb;
  border-radius: 4px;
}

#map { 
  width: 100%;
  height: 100%;
}

.tt-control-button {
  background-color: white !important;
  border-radius: 50% !important;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
}

.tt-control-button:hover {
  background-color: #f1f1f1 !important;
}

.dark {
  background-color: #1a202c;
  color: #f7fafc;
}
</style>