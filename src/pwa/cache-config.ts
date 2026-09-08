export const basePath = import.meta.env.BASE_URL
export const cachePrefix = 'fitness-atlas:' + encodeURIComponent(basePath) + ':images:'
export const imageCacheName = cachePrefix + __CATALOG_VERSION__
