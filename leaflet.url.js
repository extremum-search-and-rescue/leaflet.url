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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGVhZmxldC51cmwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsZWFmbGV0LnVybC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFVLENBQUMsQ0FxTVY7QUFyTUQsV0FBVSxDQUFDO0lBV1AsTUFBYSxVQUFXLFNBQVEsQ0FBQyxDQUFDLE9BQU87UUFLckMsVUFBVSxDQUFtQixHQUFVLEVBQUUsT0FBcUI7WUFDMUQsSUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUM7WUFDaEIsR0FBRyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7UUFDMUIsQ0FBQztRQUVRLFFBQVE7WUFDYixJQUFJLENBQUMsT0FBTyxHQUFHO2dCQUNYLFNBQVM7Z0JBQ1QsaUJBQWlCO2dCQUNqQixZQUFZO2dCQUNaLGVBQWU7Z0JBQ2YsUUFBUTtnQkFDUixnQkFBZ0I7YUFDbkIsQ0FBQztZQUNGLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3RDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUNSLE1BQU0sRUFDTixDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxDQUFDLEVBQzVDLElBQUksQ0FDUCxDQUFDO1FBQ04sQ0FBQztRQUVRLFdBQVc7WUFDaEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDdEMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQ1QsTUFBTSxFQUNOLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUMsRUFDNUMsSUFBSSxDQUNQLENBQUM7WUFDRixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztRQUN4QixDQUFDO1FBQ08sUUFBUTtZQUNaLE1BQU0sU0FBUyxHQUFHLElBQUks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