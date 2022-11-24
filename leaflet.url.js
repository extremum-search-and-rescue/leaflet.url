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
    }
    L.UrlUpdater = UrlUpdater;
    L.Map.mergeOptions({
        urlUpdater: false
    });
    L.Map.addInitHook('addHandler', 'urlUpdater', L.UrlUpdater);
})(L || (L = {}));
