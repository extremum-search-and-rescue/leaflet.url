///<reference path="../type.definitions/index.d.ts" />

namespace L {
    export interface Map {
        urlUpdater: UrlUpdater;
        layerControl: L.Control.Layers;
    }
    export namespace Control {
        export interface Layers {
            getOverlays(): string[]
        }
    }
    
    export class UrlUpdater extends L.Handler {
        _previousHash: string;
        _map: L.Map;
        _events: Array<string>;

        initialize(this: UrlUpdater, map: L.Map, options: L.MapOptions) {
            this._map = map;
            map.urlUpdater = this;
        }

        addHooks(this: UrlUpdater) {
            this._events = [
                "moveend",
                "baselayerchange",
                "overlayadd",
                "overlayremove",
                "resize",
                "gis:url:update"
            ];
            const events = this._events.join(" ");
            this._map.on(
                events,
                this.updateUrlOnEvent
            );
        }

        removeHooks(this: UrlUpdater) {
            const events = this._events.join(" ");
            this._map.off(
                events,
                this.updateUrlOnEvent
            );
            this._events = null;
        }
        updateUrlOnEvent(this: Map) {
            new Promise((resolve, reject) => {
                const mapCenter = this.wrapLatLng(this.getCenter());
                const z = this.getZoom().toPrecision(2);
                const cLat = mapCenter.lat.toFixed(4);
                const cLng = mapCenter.lng.toFixed(4);
                const overlays = this.layerControl.getOverlays().join("/");
                const hash: string = `z=${z}&c=${cLat},${cLng}&l=${overlays}`;
                resolve(hash);
            }).then((hash: string) => {
                if (this.urlUpdater._previousHash === hash) return;
                const baseUrl = window.location.href.split('#')[0];
                window.location.replace(baseUrl + '#' + hash);
                if (window.localStorage)
                    localStorage.setItem("hash", document.location.hash);
                this.fire('gis:url:changeend', { current: hash, previous: this.urlUpdater._previousHash })
                this.urlUpdater._previousHash = hash;
            }).catch();
        }
        getLinkToPoint(sitename: string, latLng: L.LatLng, map: L.Map) {
            const z = this._map.getZoom().toPrecision(2);
            const cLat = latLng.lat.toFixed(4);
            const cLng = latLng.lng.toFixed(4);
            const overlays = map.layerControl.getOverlays().join("/");
            const hash = `z=${z}&c=${cLat},${cLng}&l=${overlays}`;
            return `${sitename}/#${hash}&p=${formatLatLng(latLng, SIGNED_DEGREES).replace(' ', ',')}`;
        }
    }
    L.Map.mergeOptions({
        //disable updateUrlOnEvent by default
        urlUpdater: false
    });
    L.Map.addInitHook('addHandler', 'urlUpdater', L.UrlUpdater);
}
