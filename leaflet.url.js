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
            this._map.on(events, L.Util.debounce(this._updateUrlOnEvent, 100), this);
        }
        removeHooks() {
            const events = this._events.join(" ");
            this._map.off(events, L.Util.debounce(this._updateUrlOnEvent, 100), this);
            this._events = null;
        }
        _getHash() {
            const mapCenter = this._map.wrapLatLng(this._map.getCenter());
            const z = this._map.getZoom().toPrecision(2);
            const cLat = mapCenter.lat.toFixed(4);
            const cLng = mapCenter.lng.toFixed(4);
            let overlays = "";
            if (this._map.layerControl && this._map.layerControl.getOverlayIds())
                overlays = `&l=${this._map.layerControl.getOverlayIds().join("/")}`;
            return `z=${z}&c=${cLat},${cLng}${overlays}`;
        }
        _updateUrlOnEvent() {
            const hash = this._getHash();
            if (this._previousHash === hash)
                return;
            const baseUrl = window.location.href.split('#')[0];
            window.location.replace(baseUrl + '#' + hash);
            if (window.localStorage)
                localStorage.setItem("hash", document.location.hash);
            this._map.fire("gis:url:changeend", {
                current: hash,
                previous: this._previousHash
            });
            this._previousHash = hash;
        }
        getLinkToPoint(sitename, latLng) {
            const hash = this._getHash();
            return `${sitename}/#${hash}&p=${latLng.lat.toFixed(5)},${latLng.lng.toFixed(5)}`;
        }
        getLinkToLineString(sitename, latLngs) {
            const hash = this._getHash();
            let lineString = "&ls=";
            const points = new Array();
            for (let i = 0; i < latLngs.length; i++) {
                const latLng = latLngs[i];
                points.push(`${latLng.lat.toFixed(5)},${latLng.lng.toFixed(5)}`);
            }
            lineString += points.join(";");
            return `${sitename}/#${hash}${lineString}`;
        }
        getLinkToPolygon(sitename, latLngs) {
            const hash = this._getHash();
            let polygonString = "&pn=";
            const points = new Array();
            for (let i = 0; i < latLngs.length; i++) {
                const latLng = latLngs[i];
                points.push(`${latLng.lat.toFixed(5)},${latLng.lng.toFixed(5)}`);
            }
            polygonString += points.join(";");
            return `${sitename}/#${hash}${polygonString}`;
        }
        static getState(lochash, baseMaps, overlayMaps, defaultMap, defaults) {
            const state = new MapStateBase();
            state.lat = defaults.lat;
            state.lng = defaults.lng;
            state.zoom = defaults.zoom;
            state.baseLayerTheme = defaults.baseLayerTheme;
            state.selectedLayers = [defaultMap];
            const queryStringRegEx = /#z=(\d{1,2}[.0-9]*)&c=(-?\d{1,2}\.?\d{0,16}),(-?\d{1,3}\.?\d{0,16})&l=([\w/]*)(&p=(-?\d{1,2}\.?\d{0,16},-?\d{1,3}\.?\d{0,16}[;]?)+)?(&ls=(-?\d{1,2}\.?\d{0,16},-?\d{1,3}\.?\d{0,16}[;]?)+)?(&pn=(-?\d{1,2}\.?\d{0,16},-?\d{1,3}\.?\d{0,16}[;]?)+)?/;
            const queryStringMatchArray = lochash.match(queryStringRegEx);
            if (queryStringMatchArray) {
                state.lat = parseFloat(queryStringMatchArray[2]);
                state.lng = parseFloat(queryStringMatchArray[3]);
                state.zoom = parseFloat(queryStringMatchArray[1]);
                let proposedLayers = [];
                queryStringMatchArray[4]
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
                const points = this.getLngsIfExists(queryStringMatchArray, "&p=");
                if (points)
                    state.highlightedPoints = points;
                const linePoints = this.getLngsIfExists(queryStringMatchArray, "&ls=");
                if (linePoints)
                    state.linesFromUrl.push(linePoints);
                const polygonPoints = this.getLngsIfExists(queryStringMatchArray, "&pn=");
                if (polygonPoints)
                    state.polygonsFromUrl.push(polygonPoints);
            }
            state.baseLayerTheme = state.selectedLayers[0].options.theme;
            return state;
        }
        static getLngsIfExists(matches, prefix) {
            const retval = new Array();
            const prefixedLatLngsParts = matches.length >= 6 && matches.filter((value, index, array) => value && value.startsWith(prefix));
            const part = prefixedLatLngsParts && prefixedLatLngsParts.length === 1 && prefixedLatLngsParts[0];
            if (part) {
                let match;
                const latLngs = /((-?\d{1,2}\.?\d{0,16}),(-?\d{1,3}\.?\d{0,16}))[;]?/g;
                while (match = latLngs.exec(part)) {
                    retval.push(L.latLng(parseFloat(match[2]), parseFloat(match[3])));
                }
            }
            return retval.length > 0 ? retval : null;
        }
    }
    L.UrlUpdater = UrlUpdater;
    class MapStateBase {
        constructor() {
            this.highlightedPoints = [];
            this.linesFromUrl = [];
            this.polygonsFromUrl = [];
        }
    }
    L.MapStateBase = MapStateBase;
    L.Map.mergeOptions({
        urlUpdater: false
    });
    L.Map.addInitHook('addHandler', 'urlUpdater', L.UrlUpdater);
})(L || (L = {}));
//# sourceMappingURL=leaflet.url.js.map