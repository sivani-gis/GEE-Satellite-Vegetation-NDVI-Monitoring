/**
 * Project: Automated Cloud-Masked Sentinel-2 Phenology & Crop Health Pipeline
 * Indices: NDVI & Enhanced Vegetation Index (EVI)
 * Platform: Google Earth Engine (JavaScript API)
 */

// 1. Define Study Region & Time Window (Self-contained, no manual drawing needed)
// Default agricultural & vegetation belt (Andhra Region)
var aoi = ee.Geometry.BBox(83.15, 17.75, 83.35, 17.95);
Map.centerObject(aoi, 12);
Map.setOptions('HYBRID');

var startDate = '2025-06-01';
var endDate = '2026-04-30';
var cloudThreshold = 35; // Strict cloud probability limit (%)

// 2. Load Sentinel-2 SR and Cloud Probability Collections
var s2Sr = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(aoi)
  .filterDate(startDate, endDate);

var s2Clouds = ee.ImageCollection('COPERNICUS/S2_CLOUD_PROBABILITY')
  .filterBounds(aoi)
  .filterDate(startDate, endDate);

// 3. Join Collections by system:index
var s2Joined = ee.ImageCollection(ee.Join.saveFirst('cloud_mask').apply({
  primary: s2Sr,
  secondary: s2Clouds,
  condition: ee.Filter.equals({
    leftField: 'system:index',
    rightField: 'system:index'
  })
}));

// 4. Function to Mask Clouds
function maskClouds(image) {
  var cloudProb = ee.Image(image.get('cloud_mask')).select('probability');
  var isClear = cloudProb.lt(cloudThreshold);
  return image.updateMask(isClear);
}

// 5. Function to Compute NDVI and EVI
function computeIndices(image) {
  var optical = image.divide(10000);
  
  var ndvi = optical.normalizedDifference(['B8', 'B4'])
    .clamp(0, 1)
    .rename('NDVI');
  
  var evi = optical.expression(
    '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
      'NIR': optical.select('B8'),
      'RED': optical.select('B4'),
      'BLUE': optical.select('B2')
    }).clamp(0, 1).rename('EVI');
    
  return image.addBands([ndvi, evi])
              .copyProperties(image, ['system:time_start']);
}

// 6. Apply Processing Pipeline
var processedCollection = s2Joined.map(maskClouds).map(computeIndices);

// 7. Median Composite & Thematic Visualization
var medianComposite = processedCollection.select('NDVI').median().clip(aoi);
var ndviPalette = {
  min: 0.1,
  max: 0.8,
  palette: ['#d73027', '#f46d43', '#fdae61', '#fee08b', '#d9ef8b', '#a6d96a', '#1a9850']
};
Map.addLayer(medianComposite, ndviPalette, 'Median NDVI Composite');

// 8. On-Screen Floating Legend
var legend = ui.Panel({style: {position: 'bottom-left', padding: '8px 14px'}});
legend.add(ui.Label({value: 'NDVI (Canopy Vigor)', style: {fontWeight: 'bold', fontSize: '13px', margin: '0 0 6px 0'}}));

var makeRow = function(color, name) {
  var colorBox = ui.Label({style: {backgroundColor: color, padding: '7px', margin: '0 6px 4px 0'}});
  var desc = ui.Label({value: name, style: {margin: '0', fontSize: '12px'}});
  return ui.Panel({widgets: [colorBox, desc], layout: ui.Panel.Layout.Flow('horizontal')});
};

legend.add(makeRow('#1a9850', '> 0.65 (Dense / Healthy Canopy)'));
legend.add(makeRow('#d9ef8b', '0.45 - 0.65 (Moderate Crop Vigor)'));
legend.add(makeRow('#fee08b', '0.25 - 0.45 (Sparse / Early Growth)'));
legend.add(makeRow('#d73027', '< 0.25 (Bare Soil / Non-Vegetated)'));
Map.add(legend);

// 9. Dynamic Time-Series Crop Phenology Chart
var timeSeriesChart = ui.Chart.image.series({
  imageCollection: processedCollection.select(['NDVI', 'EVI']),
  region: aoi,
  reducer: ee.Reducer.mean(),
  scale: 30,
  xProperty: 'system:time_start'
})
.setOptions({
  title: 'Multi-Temporal Crop Phenology & Vigor Dynamics (NDVI vs EVI)',
  hAxis: {title: 'Date', format: 'MMM yyyy', gridlines: {count: 6}},
  vAxis: {
    title: 'Vegetation Index Score',
    viewWindow: {min: 0.0, max: 0.8},
    ticks: [0.0, 0.2, 0.4, 0.6, 0.8]
  },
  series: {
    0: {color: '#2ca02c', lineWidth: 2, pointSize: 4}, // NDVI
    1: {color: '#1f77b4', lineWidth: 2, pointSize: 4}  // EVI
  },
  interpolateNulls: true,
  curveType: 'function'
});

print(timeSeriesChart);
