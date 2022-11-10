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
            this._map.on(events, this.updateUrlOnEvent);
        }
        removeHooks() {
            const events = this._events.join(" ");
            this._map.off(events, this.updateUrlOnEvent);
            this._events = null;
        }
        updateUrlOnEvent() {
            new Promise((resolve, reject) => {
                const mapCenter = this.wrapLatLng(this.getCenter());
                const z = this.getZoom().toPrecision(2);
                const cLat = mapCenter.lat.toFixed(4);
                const cLng = mapCenter.lng.toFixed(4);
                const overlays = this.layerControl.getOverlays().join("/");
                const hash = `z=${z}&c=${cLat},${cLng}&l=${overlays}`;
                resolve(hash);
            }).then((hash) => {
                if (this.urlUpdater._previousHash === hash)
                    return;
                const baseUrl = window.location.href.split('#')[0];
                window.location.replace(baseUrl + '#' + hash);
                if (window.localStorage)
                    localStorage.setItem("hash", document.location.hash);
                this.fire('gis:url:changeend', { current: hash, previous: this.urlUpdater._previousHash });
                this.urlUpdater._previousHash = hash;
            }).catch();
        }
        getLinkToPoint(sitename, latLng, map) {
            const z = this._map.getZoom().toPrecision(2);
            const cLat = latLng.lat.toFixed(4);
            const cLng = latLng.lng.toFixed(4);
            const overlays = map.layerControl.getOverlays().join("/");
            const hash = `z=${z}&c=${cLat},${cLng}&l=${overlays}`;
            return `${sitename}/#${hash}&p=${formatLatLng(latLng, SIGNED_DEGREES).replace(' ', ',')}`;
        }
    }
    L.UrlUpdater = UrlUpdater;
    L.Map.mergeOptions({
        urlUpdater: false
    });
    L.Map.addInitHook('addHandler', 'urlUpdater', L.UrlUpdater);
})(L || (L = {}));
