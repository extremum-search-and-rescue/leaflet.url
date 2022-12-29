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
            if (this._map.layerControl && this._map.layerControl.getOverlayIds())
                overlays = `&l=${this._map.layerControl.getOverlayIds().join("/")}`;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGVhZmxldC51cmwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsZWFmbGV0LnVybC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFVLENBQUMsQ0F5TVY7QUF6TUQsV0FBVSxDQUFDO0lBV1AsTUFBYSxVQUFXLFNBQVEsQ0FBQyxDQUFDLE9BQU87UUFLckMsVUFBVSxDQUFtQixHQUFVLEVBQUUsT0FBcUI7WUFDMUQsSUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUM7WUFDaEIsR0FBRyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7UUFDMUIsQ0FBQztRQUVRLFFBQVE7WUFDYixJQUFJLENBQUMsT0FBTyxHQUFHO2dCQUNYLFNBQVM7Z0JBQ1QsaUJBQWlCO2dCQUNqQixZQUFZO2dCQUNaLGVBQWU7Z0JBQ2YsUUFBUTtnQkFDUixnQkFBZ0I7YUFDbkIsQ0FBQztZQUNGLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3RDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUNSLE1BQU0sRUFDTixJQUFJLENBQUMsaUJBQWlCLEVBQ3RCLElBQUksQ0FDUCxDQUFDO1FBQ04sQ0FBQztRQUVRLFdBQVc7WUFDaEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDdEMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQ1QsTUFBTSxFQUNOLElBQUksQ0FBQyxpQkFBaUIsRUFDdEIsSUFBSSxDQUNQLENBQUM7WUFDRixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztRQUN4QixDQUFDO1FBQ08sUUFBUTtZQUNaLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQztZQUM5RCxNQUFNLENBQUMsR0FBRyxJQUFJ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