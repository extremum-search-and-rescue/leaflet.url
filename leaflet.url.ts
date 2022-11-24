///<reference path="../type.definitions/index.d.ts" />

declare namespace L { 
    namespace Control {
        interface Layers {
            getOverlays(): string[]
        }
    }
    interface Map {
        layerControl: L.Control.Layers;
    }
}
namespace L {
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
                this._updateUrlOnEvent,
                this
            );
        }

        removeHooks(this: UrlUpdater) {
            const events = this._events.join(" ");
            this._map.off(
                events,
                this._updateUrlOnEvent,
                this
            );
            this._events = null;
        }
        private _getHash() : string {
            const mapCenter = this._map.wrapLatLng(this._map.getCenter());
            const z = this._map.getZoom().toPrecision(2);
            const cLat = mapCenter.lat.toFixed(4);
            const cLng = mapCenter.lng.toFixed(4);
            let overlays: string = "";
            if (this._map.layerControl && this._map.layerControl.getOverlays())
                overlays = `&l=${this._map.layerControl.getOverlays().join("/")}`;

            return `z=${z}&c=${cLat},${cLng}${overlays}`;
        }
        private _updateUrlOnEvent(this: UrlUpdater): Promise<string | null> {
            return new Promise<string | null>((resolve, reject) => {
                const hash = this._getHash();
                if (this._previousHash === hash) resolve(null);

                const baseUrl = window.location.href.split('#')[0];
                window.location.replace(baseUrl + '#' + hash);
                if (window.localStorage)
                    localStorage.setItem("hash", document.location.hash);
                this._map.fire("gis:url:changeend", {
                    current: hash,
                    previous: this._previousHash
                })
                this._previousHash = hash;

                resolve(hash);
            });
        }
        getLinkToPoint(sitename: string, latLng: L.LatLng) {
            const hash = this._getHash();
            return `${sitename}/#${hash}&p=${latLng.lat.toFixed(5)},${latLng.lng.toFixed(5)}`;
        }
    }
    L.Map.mergeOptions({
        //disable updateUrlOnEvent by default
        urlUpdater: false
    });
    export interface Map {
        //** 
        /* Controls if map will update page url to with map's current state
         */
        urlUpdater?: UrlUpdater;
    }

    L.Map.addInitHook('addHandler', 'urlUpdater', L.UrlUpdater);
}
