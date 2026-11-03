const mapElement = document.querySelector('#map');
const mapStatus = document.querySelector('#map-status');
const locationStatus = document.querySelector('#location-status');
const savedMapImage = document.querySelector('#saved-map-image');
const savedMapPlaceholder = document.querySelector('#saved-map-placeholder');
const locationButton = document.querySelector('#location-button');
const captureButton = document.querySelector('#capture-button');
const notificationButton = document.querySelector('#notification-button');
const notificationStatus = document.querySelector('#notification-status');
const puzzleSection = document.querySelector('#puzzle-section');
const puzzleBoard = document.querySelector('#puzzle-board');
const puzzleTray = document.querySelector('#puzzle-tray');
const puzzleStatus = document.querySelector('#puzzle-status');
const gridSize = 4;
const pieceCount = gridSize * gridSize;
const savedMapStorageKey = 'labC.savedMap';

const map = L.map(mapElement).setView([52.2297, 21.0122], 12);
const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    crossOrigin: true,
    maxZoom: 19
});

let pieceImages = [];
let traySlots = Array(pieceCount).fill(null);
let boardSlots = Array(pieceCount).fill(null);
let isSolved = false;
let locationMarker;
let locationRequestId = 0;
let locationPending = false;

tileLayer.once('load', () => {
    captureButton.disabled = false;
    mapStatus.textContent = 'Map ready. Drag to move it or use the zoom controls.';
});

tileLayer.on('tileerror', () => {
    mapStatus.textContent = 'Some map tiles could not be loaded. Check your connection and try again.';
});
tileLayer.addTo(map);
renderPuzzle();

updateNotificationState();
removePreviouslySavedMap();
restoreSavedMap();

notificationButton.addEventListener('click', requestNotificationPermission);
locationButton.addEventListener('click', () => {
    if (!navigator.geolocation) {
        locationStatus.textContent = 'Location services are not available in this browser.';
        return;
    }

    locationButton.disabled = true;
    const requestId = ++locationRequestId;
    locationPending = true;
    locationStatus.textContent = 'Finding your location…';

    navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
            if (requestId !== locationRequestId) return;
            locationPending = false;
            const position = [coords.latitude, coords.longitude];
            map.setView(position, 15);
            if (locationMarker) {
                locationMarker.setLatLng(position);
            } else {
                locationMarker = L.marker(position).addTo(map);
            }
            locationMarker.bindPopup('Your location').openPopup();
            locationStatus.textContent = 'Your location is marked on the map.';
            locationButton.disabled = false;
        },
        (error) => {
            if (requestId !== locationRequestId) return;
            locationPending = false;
            const messages = {
                1: 'Location permission was denied. Allow location access in your browser settings to try again.',
                2: 'Your location could not be determined. Try again when location services are available.',
                3: 'The location request timed out. Please try again.'
            };
            locationStatus.textContent = messages[error.code] || 'Unable to retrieve your location.';
            locationButton.disabled = false;
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
    );

    if (navigator.permissions?.query) {
        navigator.permissions.query({ name: 'geolocation' }).then((permission) => {
            if (requestId !== locationRequestId || !locationPending) return;
            if (permission.state === 'prompt') {
                locationStatus.textContent = 'Waiting for location permission…';
            } else if (permission.state === 'granted') {
                locationStatus.textContent = 'Finding your location…';
            }
        }).catch((error) => {
            console.error('Could not check location permission:', error);
        });
    }
});

function updateNotificationState() {
    if (!('Notification' in window)) {
        notificationStatus.textContent = 'System notifications are not supported in this browser.';
        notificationButton.hidden = true;
        return;
    }

    if (Notification.permission === 'granted') {
        notificationStatus.textContent = 'Notifications are enabled.';
        notificationButton.hidden = true;
        return;
    }
    if (Notification.permission === 'denied') {
        notificationStatus.textContent = 'Notifications are blocked. Change this in your browser settings.';
        notificationButton.hidden = true;
        return;
    }
    if (!window.isSecureContext) {
        notificationStatus.textContent = 'Notifications require a secure connection (HTTPS).';
        notificationButton.hidden = true;
        return;
    }

    notificationStatus.textContent = 'Enable notifications to get an alert when the puzzle is solved.';
    notificationButton.hidden = false;
    notificationButton.disabled = false;
}

function requestNotificationPermission() {
    if (!('Notification' in window) || !window.isSecureContext || Notification.permission !== 'default') {
        updateNotificationState();
        return;
    }

    notificationButton.disabled = true;
    Notification.requestPermission().then(() => {
        updateNotificationState();
    }).catch((error) => {
        notificationStatus.textContent = 'The browser could not request notification permission.';
        notificationButton.disabled = false;
        console.error('Notification permission request failed:', error);
    });
}

captureButton.addEventListener('click', () => {
    if (typeof leafletImage !== 'function') {
        mapStatus.textContent = 'The map export library did not load. Refresh the page and try again.';
        return;
    }

    captureButton.disabled = true;
    mapStatus.textContent = 'Capturing the visible map…';

    leafletImage(map, (error, canvas) => {
        captureButton.disabled = false;
        if (error || !canvas || canvas.width === 0 || canvas.height === 0) {
            mapStatus.textContent = 'The map could not be captured. Try again after all map tiles have loaded.';
            console.error('Map capture failed:', error);
            return;
        }

        try {
            const imageUrl = canvas.toDataURL('image/jpeg', 0.85);
            const saved = saveMapToBrowser(imageUrl);
            savedMapImage.src = imageUrl;
            savedMapImage.hidden = false;
            savedMapPlaceholder.hidden = true;
            createPuzzle(canvas);
            puzzleSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            mapStatus.textContent = saved
                ? 'Map saved for this tab and split into 16 puzzle pieces.'
                : 'Puzzle created, but browser storage could not save the map. Check available storage and try again.';
        } catch (captureError) {
            mapStatus.textContent = 'The map could not be exported or split into puzzle pieces. Try again after the map tiles load.';
            console.error('Puzzle creation failed:', captureError);
            return;
        }
    });
});

function saveMapToBrowser(imageUrl) {
    try {
        sessionStorage.setItem(savedMapStorageKey, imageUrl);
        return true;
    } catch (error) {
        console.error('Could not save the map in browser storage:', error);
        return false;
    }
}

function removePreviouslySavedMap() {
    try {
        localStorage.removeItem(savedMapStorageKey);
    } catch (error) {
        console.error('Could not remove the previously saved map from persistent storage:', error);
    }
}

function restoreSavedMap() {
    let imageUrl;
    try {
        imageUrl = sessionStorage.getItem(savedMapStorageKey);
    } catch (error) {
        mapStatus.textContent = 'The browser could not access saved maps.';
        console.error('Could not read the saved map from browser storage:', error);
        return;
    }
    if (!imageUrl) return;

    const image = new Image();
    image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        if (!context) {
            mapStatus.textContent = 'The saved map could not be restored.';
            return;
        }
        context.drawImage(image, 0, 0);
        savedMapImage.src = imageUrl;
        savedMapImage.hidden = false;
        savedMapPlaceholder.hidden = true;
        createPuzzle(canvas);
        mapStatus.textContent = 'Restored the map saved in this tab.';
    };
    image.onerror = () => {
        mapStatus.textContent = 'The saved map could not be loaded. Capture a new map to replace it.';
    };
    image.src = imageUrl;
}

function createPuzzle(canvas) {
    const sliceWidth = canvas.width / gridSize;
    const sliceHeight = canvas.height / gridSize;
    const nextPieceImages = [];

    for (let row = 0; row < gridSize; row += 1) {
        for (let column = 0; column < gridSize; column += 1) {
            const pieceCanvas = document.createElement('canvas');
            pieceCanvas.width = Math.floor(sliceWidth);
            pieceCanvas.height = Math.floor(sliceHeight);
            const context = pieceCanvas.getContext('2d');
            if (!context) {
                throw new Error('Canvas 2D context is unavailable.');
            }
            context.drawImage(
                canvas,
                Math.round(column * sliceWidth),
                Math.round(row * sliceHeight),
                Math.round(sliceWidth),
                Math.round(sliceHeight),
                0,
                0,
                pieceCanvas.width,
                pieceCanvas.height
            );
            nextPieceImages.push(pieceCanvas.toDataURL('image/png'));
        }
    }

    pieceImages = nextPieceImages;
    traySlots = shuffledIndexes(pieceCount);
    boardSlots = Array(pieceCount).fill(null);
    isSolved = false;
    puzzleBoard.style.aspectRatio = `${canvas.width} / ${canvas.height}`;
    puzzleTray.style.setProperty('--piece-ratio', `${sliceWidth} / ${sliceHeight}`);
    puzzleStatus.textContent = 'Drag pieces onto the board or onto another piece to swap them.';
    renderPuzzle();
}

function shuffledIndexes(count) {
    const indexes = Array.from({ length: count }, (_, index) => index);
    for (let index = indexes.length - 1; index > 0; index -= 1) {
        const otherIndex = Math.floor(Math.random() * (index + 1));
        [indexes[index], indexes[otherIndex]] = [indexes[otherIndex], indexes[index]];
    }
    if (indexes.every((piece, index) => piece === index)) {
        [indexes[0], indexes[1]] = [indexes[1], indexes[0]];
    }
    return indexes;
}

function renderPuzzle() {
    renderSlots(puzzleBoard, 'board', boardSlots);
    renderSlots(puzzleTray, 'tray', traySlots);
    puzzleBoard.classList.toggle('is-solved', isSolved);
    puzzleStatus.textContent = pieceImages.length === 0
        ? 'Save a map to populate the board and puzzle pieces.'
        : isSolved
            ? 'Solved! You put every map piece in the right place.'
            : 'Drag pieces onto the board or onto another piece to swap them.';
}

function renderSlots(container, area, slots) {
    container.replaceChildren();
    slots.forEach((pieceIndex, slotIndex) => {
        const slot = document.createElement('div');
        slot.className = 'puzzle-slot';
        slot.dataset.area = area;
        slot.dataset.index = String(slotIndex);
        slot.setAttribute('role', 'gridcell');
        slot.setAttribute('aria-label', pieceIndex === null
            ? `${area === 'board' ? 'Board' : 'Tray'} space ${slotIndex + 1}, empty`
            : `${area === 'board' ? 'Board' : 'Tray'} space ${slotIndex + 1}, piece ${pieceIndex + 1}`);

        if (pieceIndex !== null) {
            const piece = document.createElement('div');
            piece.className = 'puzzle-piece';
            piece.draggable = true;
            piece.dataset.piece = String(pieceIndex);
            piece.setAttribute('role', 'img');
            piece.setAttribute('aria-label', `Puzzle piece ${pieceIndex + 1}`);

            const image = document.createElement('img');
            image.src = pieceImages[pieceIndex];
            image.alt = '';
            image.draggable = false;
            piece.append(image);
            slot.append(piece);
        }

        container.append(slot);
    });
}

for (const container of [puzzleBoard, puzzleTray]) {
    container.addEventListener('dragstart', (event) => {
        const piece = event.target.closest('.puzzle-piece');
        if (!piece) return;
        event.dataTransfer.setData('text/plain', piece.dataset.piece);
        event.dataTransfer.effectAllowed = 'move';
    });

    container.addEventListener('dragover', (event) => {
        if (event.target.closest('.puzzle-slot')) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
        }
    });

    container.addEventListener('drop', (event) => {
        const slot = event.target.closest('.puzzle-slot');
        if (!slot) return;
        event.preventDefault();
        const pieceIndex = Number(event.dataTransfer.getData('text/plain'));
        if (!Number.isInteger(pieceIndex) || pieceIndex < 0 || pieceIndex >= pieceCount) return;
        const source = findPiece(pieceIndex);
        movePiece(source.area, source.index, slot.dataset.area, Number(slot.dataset.index));
    });
}

function findPiece(pieceIndex) {
    const trayIndex = traySlots.indexOf(pieceIndex);
    if (trayIndex !== -1) return { area: 'tray', index: trayIndex };
    const boardIndex = boardSlots.indexOf(pieceIndex);
    if (boardIndex !== -1) return { area: 'board', index: boardIndex };
    throw new Error(`Puzzle piece ${pieceIndex} is missing.`);
}

function movePiece(sourceArea, sourceIndex, destinationArea, destinationIndex) {
    const sourceSlots = sourceArea === 'board' ? boardSlots : traySlots;
    const destinationSlots = destinationArea === 'board' ? boardSlots : traySlots;
    if (sourceArea === destinationArea && sourceIndex === destinationIndex) return;

    const pieceIndex = sourceSlots[sourceIndex];
    if (pieceIndex === null || pieceIndex === undefined) return;

    [sourceSlots[sourceIndex], destinationSlots[destinationIndex]] =
        [destinationSlots[destinationIndex], sourceSlots[sourceIndex]];

    const wasSolved = isSolved;
    isSolved = boardSlots.every((piece, index) => piece === index);
    renderPuzzle();

    if (isSolved && !wasSolved) {
        console.debug('All map puzzle pieces are in their correct positions.');
        showCompletionNotification();
    }
}

function showCompletionNotification() {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        notificationStatus.textContent = 'Puzzle solved. Notifications are not enabled in the browser.';
        return;
    }

    try {
        const notification = new Notification('Map puzzle solved!', {
            body: 'All 16 map pieces are in their correct places.'
        });
        notification.addEventListener('click', () => window.focus());
    } catch (error) {
        notificationStatus.textContent = 'The puzzle is solved, but the browser could not display a system notification.';
        console.error('Could not display the completion notification:', error);
    }
}
