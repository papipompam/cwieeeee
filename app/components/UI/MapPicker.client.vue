<script setup lang="ts">
import type * as LeafletNamespace from "leaflet"

export interface Coordinates {
  lat: number | null
  lng: number | null
}

const props = withDefaults(defineProps<{
  modelValue?: Coordinates
  readonly?: boolean
}>(), {
  modelValue: () => ({ lat: null, lng: null }),
  readonly: false
})

const emit = defineEmits<{
  (e: "update:modelValue", coords: Coordinates): void
}>()

const mapContainer = ref<HTMLDivElement | null>(null)
const searchContainer = ref<HTMLDivElement | null>(null)
let L: typeof LeafletNamespace | null = null
let map: LeafletNamespace.Map | null = null
let marker: LeafletNamespace.Marker | null = null

// Search state
const searchQuery = ref("")
const isSearching = ref(false)
const searchResults = ref<Array<{ name: string; displayName: string; lat: number; lon: number }>>([])
const showResults = ref(false)
const isLocating = ref(false)

// Custom modern SVG Pin
const createMarkerIcon = () => {
  if (!L) return undefined
  return L.divIcon({
    className: "cwie-map-pin",
    html: `
      <div style="transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        <div style="background-color: #ef4444; color: white; padding: 6px; border-radius: 9999px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); border: 2px solid white; display: flex; align-items: center; justify-content: center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div style="width: 2px; height: 6px; background-color: #ef4444;"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32]
  })
}

const updateCoords = (lat: number | null, lng: number | null) => {
  emit("update:modelValue", {
    lat: lat !== null ? Number(lat.toFixed(6)) : null,
    lng: lng !== null ? Number(lng.toFixed(6)) : null
  })
}

const setMarkerPosition = (lat: number, lng: number, pan = false) => {
  if (!map || !L) return

  if (!marker) {
    marker = L.marker([lat, lng], {
      icon: createMarkerIcon(),
      draggable: !props.readonly
    }).addTo(map)

    marker.on("dragend", () => {
      if (!marker) return
      const pos = marker.getLatLng()
      updateCoords(pos.lat, pos.lng)
    })
  } else {
    marker.setLatLng([lat, lng])
  }

  if (pan) {
    map.panTo([lat, lng])
  }
}

const removeMarker = () => {
  if (marker && map) {
    map.removeLayer(marker)
    marker = null
  }
  updateCoords(null, null)
}

const initMap = () => {
  if (!mapContainer.value || !L) return

  const hasCoords = props.modelValue?.lat != null && props.modelValue?.lng != null
  const initialLat = hasCoords ? Number(props.modelValue.lat) : 13.7563 // Bangkok default
  const initialLng = hasCoords ? Number(props.modelValue.lng) : 100.5018
  const initialZoom = hasCoords ? 15 : 6

  map = L.map(mapContainer.value, {
    zoomControl: true,
    attributionControl: true
  }).setView([initialLat, initialLng], initialZoom)

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\" target=\"_blank\">OpenStreetMap</a> contributors"
  }).addTo(map)

  if (hasCoords) {
    setMarkerPosition(initialLat, initialLng)
  }

  if (!props.readonly) {
    map.on("click", (e: LeafletNamespace.LeafletMouseEvent) => {
      setMarkerPosition(e.latlng.lat, e.latlng.lng)
      updateCoords(e.latlng.lat, e.latlng.lng)
    })
  }
}

// Watch modelValue changes from outside (e.g. numeric input)
watch(() => [props.modelValue?.lat, props.modelValue?.lng], ([newLat, newLng]) => {
  if (!map || !L) return

  if (newLat != null && newLng != null && !isNaN(Number(newLat)) && !isNaN(Number(newLng))) {
    const lat = Number(newLat)
    const lng = Number(newLng)
    const currentMarkerPos = marker?.getLatLng()

    if (!currentMarkerPos || currentMarkerPos.lat !== lat || currentMarkerPos.lng !== lng) {
      setMarkerPosition(lat, lng, true)
    }
  } else if ((newLat == null || newLng == null) && marker) {
    map.removeLayer(marker)
    marker = null
  }
})

// Search location
const handleSearch = async () => {
  const query = searchQuery.value.trim()
  if (!query || query.length < 2) {
    searchResults.value = []
    showResults.value = false
    return
  }

  isSearching.value = true
  try {
    const results = await $fetch<Array<{ name: string; displayName: string; lat: number; lon: number }>>("/api/geo/search", {
      query: { q: query }
    })
    searchResults.value = results
    showResults.value = results.length > 0
  } catch {
    searchResults.value = []
    showResults.value = false
  } finally {
    isSearching.value = false
  }
}

const selectSearchResult = (item: { name: string; displayName: string; lat: number; lon: number }) => {
  if (!map) return
  map.flyTo([item.lat, item.lon], 16, { duration: 1.2 })
  setMarkerPosition(item.lat, item.lon)
  updateCoords(item.lat, item.lon)
  showResults.value = false
  searchQuery.value = item.name
}

// Current Geolocation
const handleCurrentLocation = () => {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return
  }

  isLocating.value = true
  navigator.geolocation.getCurrentPosition(
    (position) => {
      isLocating.value = false
      const lat = position.coords.latitude
      const lng = position.coords.longitude
      if (map) {
        map.flyTo([lat, lng], 16, { duration: 1.2 })
        setMarkerPosition(lat, lng)
        updateCoords(lat, lng)
      }
    },
    (err) => {
      isLocating.value = false
      console.warn("Geolocation error:", err.message)
    },
    { enableHighAccuracy: true, timeout: 8000 }
  )
}

// Close search dropdown on click outside
const handleClickOutside = (e: MouseEvent) => {
  if (searchContainer.value && !searchContainer.value.contains(e.target as Node)) {
    showResults.value = false
  }
}

onMounted(async () => {
  const leafletModule = await import("leaflet")
  L = leafletModule.default || leafletModule
  document.addEventListener("click", handleClickOutside)
  nextTick(() => {
    initMap()
  })
})

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside)
  if (map) {
    map.remove()
    map = null
    marker = null
  }
})
</script>

<template>
  <div class="space-y-3">
    <!-- Top toolbar: Search & Quick actions -->
    <div v-if="!readonly" class="space-y-2">
      <div class="flex flex-col sm:flex-row gap-2">
        <!-- Search Input with Dropdown -->
        <div ref="searchContainer" class="relative flex-1">
          <UInput
            v-model="searchQuery"
            placeholder="พิมพ์ค้นหาสถานที่ เช่น เซ็นทรัลเวิลด์, นิคมบางปู, มช. ..."
            icon="i-lucide-search"
            class="w-full"
            :loading="isSearching"
            @keydown.enter.prevent="handleSearch"
            @focus="showResults = searchResults.length > 0"
          />

          <!-- Search Results Dropdown -->
          <div
            v-if="showResults && searchResults.length > 0"
            class="absolute z-20 top-full mt-1 w-full bg-canvas border border-divider rounded-panel shadow-panel max-h-60 overflow-y-auto divide-y divide-divider"
          >
            <button
              v-for="(item, idx) in searchResults"
              :key="idx"
              type="button"
              class="w-full text-left px-3 py-2.5 hover:bg-surface transition-colors flex items-start gap-2 text-xs sm:text-sm cursor-pointer"
              @click="selectSearchResult(item)"
            >
              <UIcon name="i-lucide-map-pin" class="size-4 text-primary shrink-0 mt-0.5" />
              <div class="min-w-0 flex-1">
                <div class="font-medium text-ink truncate">{{ item.name }}</div>
                <div class="text-xs text-muted truncate">{{ item.displayName }}</div>
              </div>
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <UButton
            type="button"
            label="ค้นหา"
            color="primary"
            variant="soft"
            icon="i-lucide-search"
            :loading="isSearching"
            @click="handleSearch"
          />

          <UButton
            type="button"
            label="พิกัดฉัน"
            color="neutral"
            variant="outline"
            icon="i-lucide-crosshair"
            :loading="isLocating"
            title="ใช้ตำแหน่ง GPS ปัจจุบัน"
            @click="handleCurrentLocation"
          />

          <UButton
            v-if="modelValue?.lat != null"
            type="button"
            label="ล้างหมุด"
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            title="ลบหมุดพิกัด"
            @click="removeMarker"
          />
        </div>
      </div>
    </div>

    <!-- Map Container -->
    <div class="relative w-full h-80 sm:h-96 rounded-panel border border-divider overflow-hidden bg-surface">
      <div ref="mapContainer" class="w-full h-full z-10" />

      <!-- Instruction overlay on bottom left -->
      <div
        v-if="!readonly"
        class="absolute bottom-2 left-2 z-10 bg-canvas/90 backdrop-blur-sm px-2.5 py-1.5 rounded-control border border-divider text-xs text-muted shadow-sm pointer-events-none flex items-center gap-1.5"
      >
        <UIcon name="i-lucide-mouse-pointer-click" class="size-3.5 text-primary shrink-0" />
        <span>คลิกบนแผนที่เพื่อปักหมุด หรือลากหมุดเพื่อปรับตำแหน่ง</span>
      </div>
    </div>

    <!-- Coordinate status indicator -->
    <div class="flex items-center justify-between text-xs text-muted px-1">
      <div class="flex items-center gap-2">
        <span class="font-medium text-ink">สถานะพิกัด:</span>
        <span v-if="modelValue?.lat != null && modelValue?.lng != null" class="text-primary font-medium">
          {{ modelValue.lat.toFixed(6) }}, {{ modelValue.lng.toFixed(6) }}
        </span>
        <span v-else class="italic text-muted">
          ยังไม่ได้ปักหมุด (คลิกบนแผนที่หรือค้นหาเพื่อปักหมุด)
        </span>
      </div>
    </div>
  </div>
</template>
