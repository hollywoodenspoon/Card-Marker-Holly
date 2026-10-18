import { svgDisplayBlob } from './imageAssets';
/**
 * Decodes asset blobs into HTMLImageElements for the canvas and caches them.
 * SVGs are drawn as images on screen; the original blob is kept for vector PDF export.
 */
export class BlobAssetResolver {
    images = new Map();
    urls = new Map();
    loading = new Set();
    listeners = new Set();
    assets = {};
    setAssets(assets) {
        // Drop cache entries for removed or replaced blobs.
        for (const [id, url] of this.urls) {
            if (!assets[id] || assets[id].blob !== this.assets[id]?.blob) {
                URL.revokeObjectURL(url);
                this.urls.delete(id);
                this.images.delete(id);
            }
        }
        this.assets = assets;
    }
    getInfo(id) {
        const a = this.assets[id];
        return a ? { widthPx: a.widthPx, heightPx: a.heightPx, isVector: a.isVector } : undefined;
    }
    getUrl(id) {
        const a = this.assets[id];
        if (!a)
            return undefined;
        let url = this.urls.get(id);
        if (!url) {
            url = URL.createObjectURL(a.blob);
            this.urls.set(id, url);
        }
        return url;
    }
    getImage(id) {
        const img = this.images.get(id);
        if (img?.complete && img.naturalWidth)
            return img;
        if (!img && !this.loading.has(id))
            void this.load(id);
        return undefined;
    }
    async load(id) {
        const a = this.assets[id];
        if (!a)
            return;
        this.loading.add(id);
        let url = this.getUrl(id);
        if (a.isVector) {
            // SVGs are decoded from a sized copy; getUrl() still serves the original.
            try {
                url = URL.createObjectURL(await svgDisplayBlob(a.blob, a.widthPx, a.heightPx));
            }
            catch {
                /* fall back to the original */
            }
        }
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
            this.loading.delete(id);
            this.emit();
        };
        img.onerror = () => this.loading.delete(id);
        img.src = url;
        this.images.set(id, img);
    }
    subscribe(fn) {
        this.listeners.add(fn);
        return () => {
            this.listeners.delete(fn);
        };
    }
    emit() {
        this.listeners.forEach((l) => l());
    }
}
export const assetResolver = new BlobAssetResolver();
