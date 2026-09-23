# Automated Satellite Vegetation Health & Phenology Monitoring

A Google Earth Engine pipeline monitoring multi-temporal NDVI dynamics and seasonal vegetation health using Sentinel-2 MSI collections.

## Features
- **QA Cloud Masking:** Automated pixel-level QA bitwise masking (`QA60` / `s2cloudless`) to eliminate atmospheric contamination.
- **Time-Series Analysis:** Generated multi-month median composites and time-series charts to track vegetative phenological variations.
- **Zonal Statistics:** Evaluated canopy greenness and vegetative degradation across regional parcels.



## Tools
- Google Earth Engine (JavaScript API)
- Sentinel-2 Level-2A Surface Reflectance
