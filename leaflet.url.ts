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
        private _getHash(): string {
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
        static getState(
            lochash: string,
            baseMaps: LayerControlGroup,
            overlayMaps: LayerControlGroup,
            defaultMap: LayerControlEntry,
            defaults
        ): MapStateBase {
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
                let proposedLayers: Array<LayerControlEntry> = [];
                queryStringRegEx[4]
                    .split('/')
                    .forEach(function (l) {
                        const baseMap = Object.entries(baseMaps)
                            .map(bm => bm as [string, LayerControlEntry])
                            .filter(bm => bm[1].options.id === l);
                        if (baseMap.length > 0)
                            proposedLayers.push(baseMap[0][1]);
                        const overlayMap = Object.entries(overlayMaps)
                            .map(bm => bm as [string, LayerControlEntry])
                            .filter(om => om[1] != null && om[1].options.id == l);
                        if (overlayMap.length > 0)
                            proposedLayers.push(overlayMap[0][1]);
                    });
                if (proposedLayers.length > 0)
                    state.selectedLayers = proposedLayers;
                if (pointsPart) {
                    const pointsRegEx = pointsPart.match(/(-?\d{1,2}\.?\d{0,16}),(-?\d{1,3}\.?\d{0,16})/);
                    if (pointsRegEx && pointsRegEx.length === 3)
                        state.highlightedPoints.push(L.latLng(
                            parseFloat(pointsRegEx[1]),
                            parseFloat(pointsRegEx[2]))
                        );
                }
            };
            state.baseLayerTheme = (state.selectedLayers[0] as TileLayer).options.theme;
            return state;
        }

    }
    type LayerControlEntry = LayerGroup<TileLayer> & { options: { id: string } } | TileLayer | GeoJsonLayer; 

    interface LayerControlGroup {
        [name: string]: LayerControlEntry
    }
    export class MapStateBase {
        lat: number;
        lng: number;
        latlng: L.LatLng;
        zoom: number;
        selectedLayers: Array<LayerControlEntry>;
        baseLayerTheme: string;
        highlightedPoints?: Array<L.LatLng> = []
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
