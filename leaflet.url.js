var L;
(function (L) {
    class UrlUpdater extends L.Handler {
        initialize(map, options) {
            this._map = map;
            map.urlUpdater = this;
        }
        addHooks() {
            this._events = [
                "moveend",
                "baselayerchange",
                "overlayadd",
                "overlayremove",
                "resize",
                "gis:url:update"
            ];
            const events = this._events.join(" ");
            this._map.on(events, this._updateUrlOnEvent, this);
        }
        removeHooks() {
            const events = this._events.join(" ");
            this._map.off(events, this._updateUrlOnEvent, this);
            this._events = null;
        }
        _getHash() {
            const mapCenter = this._map.wrapLatLng(this._map.getCenter());
            const z = this._map.getZoom().toPrecision(2);
            const cLat = mapCenter.lat.toFixed(4);
            const cLng = mapCenter.lng.toFixed(4);
            let overlays = "";
            if (this._map.layerControl && this._map.layerControl.getOverlays())
                overlays = `&l=${this._map.layerControl.getOverlays().join("/")}`;
            return `z=${z}&c=${cLat},${cLng}${overlays}`;
        }
        _updateUrlOnEvent() {
            return new Promise((resolve, reject) => {
                const hash = this._getHash();
                if (this._previousHash === hash)
                    resolve(null);
                const baseUrl = window.location.href.split('#')[0];
                window.location.replace(baseUrl + '#' + hash);
                if (window.localStorage)
                    localStorage.setItem("hash", document.location.hash);
                this._map.fire("gis:url:changeend", {
                    current: hash,
                    previous: this._previousHash
                });
                this._previousHash = hash;
                resolve(hash);
            });
        }
        getLinkToPoint(sitename, latLng) {
            const hash = this._getHash();
            return `${sitename}/#${hash}&p=${latLng.lat.toFixed(5)},${latLng.lng.toFixed(5)}`;
        }
        static getState(lochash, baseMaps, overlayMaps, defaultMap, defaults) {
            const state = new MapStateBase();
            state.lat = defaults.lat;
            state.lng = defaults.lng;
            state.zoom = defaults.zoom;
            state.baseLayerTheme = defaults.baseLayerTheme;
            state.selectedLayers = [defaultMap];
            const queryStringRegEx = lochash.match(/#z=(\d{1,2}[.0-9]*)&c=(-?\d{1,2}\.?\d{0,16}),(-?\d{1,3}\.?\d{0,16})&l=([\w/]*)(&p=(-?\d{1,2}\.?\d{0,16},-?\d{1,3}\.?\d{0,16}[/]?)+)?/);
            if (queryStringRegEx) {
                state.lat = parseFloat(queryStringRegEx[2]);
                state.lng = parseFloat(queryStringRegEx[3]);
                state.zoom = parseFloat(queryStringRegEx[1]);
                const pointsPart = queryStringRegEx.length >= 6 ? queryStringRegEx[5] : undefined;
                let proposedLayers = [];
                queryStringRegEx[4]
                    .split('/')
                    .forEach(function (l) {
                    const baseMap = Object.entries(baseMaps)
                        .map(bm => bm)
                        .filter(bm => bm[1].options.id === l);
                    if (baseMap.length > 0)
                        proposedLayers.push(baseMap[0][1]);
                    const overlayMap = Object.entries(overlayMaps)
                        .map(bm => bm)
                        .filter(om => om[1] != null && om[1].options.id == l);
                    if (overlayMap.length > 0)
                        proposedLayers.push(overlayMap[0][1]);
                });
                if (proposedLayers.length > 0)
                    state.selectedLayers = proposedLayers;
                if (pointsPart) {
                    const pointsRegEx = pointsPart.match(/(-?\d{1,2}\.?\d{0,16}),(-?\d{1,3}\.?\d{0,16})/);
                    if (pointsRegEx && pointsRegEx.length === 3)
                        state.highlightedPoints.push(L.latLng(parseFloat(pointsRegEx[1]), parseFloat(pointsRegEx[2])));
                }
            }
            ;
            state.baseLayerTheme = state.selectedLayers[0].options.theme;
            return state;
        }
    }
    L.UrlUpdater = UrlUpdater;
    class MapStateBase {
        constructor() {
            this.highlightedPoints = [];
        }
    }
    L.MapStateBase = MapStateBase;
    L.Map.mergeOptions({
        urlUpdater: false
    });
    L.Map.addInitHook('addHandler', 'urlUpdater', L.UrlUpdater);
})(L || (L = {}));
