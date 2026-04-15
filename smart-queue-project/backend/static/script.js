const bodyElement = document.body
const pageName = bodyElement.dataset.page || "home"
const sidebarElement = document.getElementById("sidebar")
const menuToggleElement = document.getElementById("menuToggle")
const navSearchElement = document.getElementById("navSearch")
const mapFallbackElement = document.getElementById("mapFallback")
const locationNameElement = document.getElementById("locationName")
const locationSystemElement = document.getElementById("locationSystem")
const locationQueuesElement = document.getElementById("locationQueues")
const openPlaceLinkElement = document.getElementById("openPlaceLink")
const recentlyViewedElement = document.getElementById("recentlyViewed")
const blockGridElement = document.getElementById("blockGrid")
const crowdElement = document.getElementById("crowd")
const waitElement = document.getElementById("wait")
const crowdLevelElement = document.getElementById("crowdLevel")
const queueTitleElement = document.getElementById("queueTitle")
const queueSubtitleElement = document.getElementById("queueSubtitle")
const queueLocationLabelElement = document.getElementById("queueLocationLabel")
const queueBlockLabelElement = document.getElementById("queueBlockLabel")
const queueChartCanvas = document.getElementById("queueChart")

const RECENT_KEY = "queueai_recently_viewed"
let queueChart = null

if (sidebarElement && window.innerWidth <= 780) {
    sidebarElement.classList.add("hidden")
}

if (menuToggleElement && sidebarElement) {
    menuToggleElement.addEventListener("click", () => {
        sidebarElement.classList.toggle("hidden")
    })
}

function readRecentItems() {
    try {
        return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]")
    } catch (error) {
        return []
    }
}

function saveRecentItem(item) {
    const items = readRecentItems().filter((entry) => entry.url !== item.url)
    items.unshift(item)
    localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, 6)))
}

function getSelectedQueueContext() {
    const selectedPlace = localStorage.getItem("selectedPlace") || bodyElement.dataset.location || "--"
    const selectedBlock = localStorage.getItem("selectedBlock") || bodyElement.dataset.block || "--"

    return {
        selectedPlace,
        selectedBlock
    }
}

function renderRecentItems() {
    if (!recentlyViewedElement) return

    const items = readRecentItems()

    if (!items.length) {
        recentlyViewedElement.innerHTML = '<p class="empty-state">No recent pages yet.</p>'
        return
    }

    recentlyViewedElement.innerHTML = items.map((item) => `
        <a class="recent-item" href="${item.url}">
            <strong>${item.title}</strong>
            <span>${item.subtitle}</span>
        </a>
    `).join("")
}

function filterElements(selector, value) {
    const query = value.trim().toLowerCase()
    document.querySelectorAll(selector).forEach((element) => {
        const name = (element.dataset.name || element.textContent || "").toLowerCase()
        element.style.display = !query || name.includes(query) ? "" : "none"
    })
}

if (navSearchElement) {
    navSearchElement.addEventListener("input", (event) => {
        const value = event.target.value

        if (pageName === "home") {
            filterElements(".queue-pill", value)
        }

        if (pageName === "place") {
            filterElements(".block-card", value)
        }
    })
}

function renderLocationDetails(location) {
    if (!locationNameElement || !locationSystemElement || !locationQueuesElement) return

    locationNameElement.innerText = location.name
    locationSystemElement.innerText = `System status: ${location.system_installed ? "Installed" : "Not installed"}`
    locationQueuesElement.innerHTML = location.queues.map((queue) => `
        <span class="queue-pill" data-name="${queue}">${queue}</span>
    `).join("")

    if (openPlaceLinkElement) {
        openPlaceLinkElement.href = `/place?location=${encodeURIComponent(location.name)}`
    }
}

function crowdStatus(crowd) {
    if (crowd < 20) return "Low"
    if (crowd < 50) return "Medium"
    return "High"
}

function applyCrowdLevelState(level) {
    if (!crowdLevelElement) return

    crowdLevelElement.classList.remove("level-low", "level-medium", "level-high")

    if (level === "Low") {
        crowdLevelElement.classList.add("level-low")
    } else if (level === "Medium") {
        crowdLevelElement.classList.add("level-medium")
    } else {
        crowdLevelElement.classList.add("level-high")
    }
}

function markerIcon(location) {
    return {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: location.system_installed ? "#22c55e" : "#ef4444",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2
    }
}

async function loadLocations() {
    try {
        const res = await fetch("/locations")

        if (!res.ok) {
            throw new Error("Locations endpoint failed")
        }

        return await res.json()
    } catch (error) {
        if (mapFallbackElement) {
            mapFallbackElement.innerText = "Unable to load location data."
        }
        return []
    }
}

async function initQueueMap() {
    if (pageName !== "home") return

    const locations = await loadLocations()

    if (!window.google || !locations.length) {
        if (mapFallbackElement && !locations.length) {
            mapFallbackElement.innerText = "No locations available."
        }
        return
    }

    const map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: locations[0].lat, lng: locations[0].lng },
        zoom: 11,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
    })

    if (mapFallbackElement) {
        mapFallbackElement.style.display = "none"
    }

    renderLocationDetails(locations[0])

    locations.forEach((location) => {
        const marker = new google.maps.Marker({
            position: { lat: location.lat, lng: location.lng },
            map,
            title: location.name,
            icon: markerIcon(location)
        })

        marker.addListener("click", () => {
            renderLocationDetails(location)
            saveRecentItem({
                title: location.name,
                subtitle: "Place view",
                url: `/place?location=${encodeURIComponent(location.name)}`
            })
            renderRecentItems()
        })
    })
}

window.initQueueMap = initQueueMap

async function loadLatestQueue() {
    if (pageName !== "queue" || !crowdElement || !waitElement) return

    const { selectedPlace, selectedBlock } = getSelectedQueueContext()

    if (queueTitleElement) {
        queueTitleElement.innerText = `${selectedPlace} - ${selectedBlock}`
    }

    if (queueSubtitleElement) {
        queueSubtitleElement.innerText = selectedPlace
    }

    try {
        const res = await fetch("/latest")

        if (!res.ok) {
            throw new Error("Latest endpoint failed")
        }

        const data = await res.json()
        crowdElement.innerText = data.crowd
        waitElement.innerText = data.waiting_time
        if (crowdLevelElement) {
            const level = crowdStatus(Number(data.crowd) || 0)
            crowdLevelElement.innerText = level
            applyCrowdLevelState(level)
        }

        if (queueLocationLabelElement) {
            queueLocationLabelElement.innerText = selectedPlace
        }

        if (queueBlockLabelElement) {
            queueBlockLabelElement.innerText = selectedBlock
        }
    } catch (error) {
        crowdElement.innerText = "--"
        waitElement.innerText = "--"
    }
}

function buildQueueChart() {
    if (!queueChartCanvas || queueChart) return

    queueChart = new Chart(queueChartCanvas.getContext("2d"), {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: "Crowd",
                data: [],
                borderColor: "#4f7cff",
                backgroundColor: "rgba(79, 124, 255, 0.12)",
                fill: true,
                tension: 0.35,
                pointRadius: 3,
                pointHoverRadius: 5,
                borderWidth: 3
            }]
        },
        options: {
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: "#7b8798"
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: "rgba(123, 135, 152, 0.14)"
                    },
                    ticks: {
                        color: "#7b8798",
                        precision: 0
                    }
                }
            }
        }
    })
}

async function loadQueueHistory() {
    if (pageName !== "queue" || !queueChartCanvas) return

    buildQueueChart()

    try {
        const res = await fetch("/history")

        if (!res.ok) {
            throw new Error("History endpoint failed")
        }

        const data = await res.json()
        queueChart.data.labels = data.time
        queueChart.data.datasets[0].data = data.crowd
        queueChart.update()
    } catch (error) {
        if (queueChartCanvas.parentElement && !queueChartCanvas.parentElement.querySelector(".chart-empty")) {
            queueChartCanvas.parentElement.insertAdjacentHTML(
                "beforeend",
                '<p class="empty-state chart-empty">Unable to load queue history.</p>'
            )
        }
    }
}

function registerCurrentPage() {
    if (pageName === "place") {
        saveRecentItem({
            title: bodyElement.dataset.location || "Place",
            subtitle: "Blocks",
            url: window.location.pathname + window.location.search
        })
        localStorage.setItem("selectedPlace", bodyElement.dataset.location || "--")
    }

    if (pageName === "queue") {
        const { selectedPlace, selectedBlock } = getSelectedQueueContext()
        saveRecentItem({
            title: selectedBlock || "Queue",
            subtitle: selectedPlace || "Queue view",
            url: window.location.pathname + window.location.search
        })
    }
}

function setupPlaceNavigation() {
    if (pageName !== "place" || !blockGridElement) return

    blockGridElement.querySelectorAll(".block-card").forEach((blockCard) => {
        blockCard.addEventListener("click", (event) => {
            event.preventDefault()

            const selectedPlace = bodyElement.dataset.location || "--"
            const selectedBlock = blockCard.dataset.name || blockCard.textContent.trim() || "--"

            localStorage.setItem("selectedPlace", selectedPlace)
            localStorage.setItem("selectedBlock", selectedBlock)

            window.location.href = "/queue"
        })
    })
}

if (!window.GOOGLE_MAPS_API_KEY && mapFallbackElement) {
    mapFallbackElement.innerText = "Set GOOGLE_MAPS_API_KEY to enable the map."
}

registerCurrentPage()
setupPlaceNavigation()
renderRecentItems()
loadLatestQueue()
loadQueueHistory()

if (pageName === "queue") {
    setInterval(loadLatestQueue, 3000)
    setInterval(loadQueueHistory, 3000)
}
