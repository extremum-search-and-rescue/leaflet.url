L.UrlUpdater = L.Handler.extend({
    _previousHash : null,

    initialize: function (map, options) {
        this._map = map;
    },

    addHooks: function () {
        _self = this;
        this._map.on("moveend baselayerchange overlayadd overlayremove resize gis:url:update", this.urlUpdater);
    },

    removeHooks: function () {
        this._map.off("moveend baselayerchange overlayadd overlayremove resize gis:url:update", this.urlUpdater);
    },

    urlUpdater: function() {
        new Promise((resolve, reject) => {
            const mapCenter = this.wrapLatLng(this.getCenter());
            const hash = `z=${this.getZoom().toPrecision(2)}&c=${mapCenter.lat.toFixed(4)},${mapCenter.lng.toFixed(4)}&l=${this.layerControl.getOverlays().join("/")}`;
            resolve(hash);
        }).then((hash) => {
            if (_self._previousHash === hash) return;
            const baseUrl = window.location.href.split('#')[0];
            window.location.replace(baseUrl + '#' + hash);
            if (window.localStorage)
                localStorage.setItem("hash", document.location.hash);
            this.fire('gis:url:changeend', { current: hash, previous: _self._previousHash })
            _self._previousHash = hash;
        }).catch();
    },
    getLinkToPoint(sitename, latLng) {
        const hash = `z=${_self._map.getZoom().toPrecision(2)}&c=${latLng.lat.toFixed(4)},${latLng.lng.toFixed(4)}&l=${_self._map.layerControl.getOverlays().join("/")}`;
        return `${sitename}/#${hash}&p=${formatLatLng(latLng, SIGNED_DEGREES).replace(' ', ',')}`;
    }
});

L.urlUpddater = function (opts) {
    return new L.UrlUpdater(opts);
}
L.Map.addInitHook('addHandler', 'urlUpdater', L.UrlUpdater);