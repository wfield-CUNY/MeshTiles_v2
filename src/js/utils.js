// var VectorTile = require('@mapbox/vector-tile').VectorTile;
// var Protobuf = require('pbf');
import * as vt2geojson from '@mapbox/vt2geojson';
import earcut from 'earcut';
import * as simplify from '@turf/simplify';

const SIMPLIFY_VERT_THRESHOLD = 1000;

function lon2tile(lon, zoom) { return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom))); }
function lat2tile(lat, zoom) { return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))); }
function tile2long(x, z) {
    return (x / Math.pow(2, z) * 360 - 180);
}
function tile2lat(y, z) {
    var n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
    return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))));
}

export function latlngzoom2tileStr(lat, lon, zoom) {
    let x = lon2tile(lon, zoom);
    let y = lat2tile(lat, zoom);
    return {
        url: `${zoom}/${x}/${y}`,
        z: zoom,
        x: x,
        y: y
    }
}



export function getTile(zxy) {
    const mapboxUrl = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/${zxy}.vector.pbf?sku=101rbwZejdUDN&access_token=pk.eyJ1Ijoid2ZpZWxkLWN1bnkiLCJhIjoiY2p6YTJnN2lzMDB1aDNicm9qbzN6d2F5dCJ9.eOQlPpQf5uyOJANVWurDDA`
    // remote file
    return new Promise((resolve, reject) => {
        vt2geojson({
            uri: mapboxUrl,
            layer: 'landuse',
            featureClasses: ['park','residential', 'wood']
        }, function (err, result) {
            if (err) throw err;
            // console.log(result.features)
            let features = {};
            const coords = result.features.map((f) => f.geometry.coordinates);
            const needsSimplify = (coords.flat().length > SIMPLIFY_VERT_THRESHOLD)

            result.features.forEach((feature) => {
                features[feature.properties.type] = features[feature.properties.type] || [];
                if (feature.geometry.type.toLowerCase() !== 'multipolygon') {
                    let _coords = feature.geometry.coordinates;
                    if (needsSimplify) {
                        var options = { tolerance: 0.9, highQuality: false, mutate: true };
                        _coords = simplify.default(feature, options);
                    }
                    if (_coords.length > 0) {
                        var data = earcut.flatten(_coords);
                        var triangles = earcut(data.vertices, data.holes, data.dimensions);
                        features[feature.properties.type].push({ data, triangles, type: feature.geometry.type })
                    }

                } else {
                    for (let p = 0; p < feature.geometry.coordinates.length; p++) {
                        var data = earcut.flatten(feature.geometry.coordinates[p]);
                        var triangles = earcut(data.vertices, data.holes, data.dimensions);
                        features[feature.properties.type].push({ data, triangles, type: feature.geometry.type })
                    }
                }
            })


            resolve(features);
        });

    });
}

export let tilecache = {};
export function resetTileCache() {
    Object.keys(tilecache).forEach((zParam) => {
        Object.keys(zParam).forEach((xParam) => {
            delete tilecache[zParam][xParam]
        })
        delete tilecache[zParam]
    });
    tilecache = {}
}
export const valueMap = (value, x1, y1, x2, y2) => (value - x1) * (y2 - x2) / (y1 - x1) + x2;