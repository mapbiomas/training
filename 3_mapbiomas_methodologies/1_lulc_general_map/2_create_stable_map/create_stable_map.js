// ========================
// Initial Configuration
// ========================

// Define the country or territory name.
// It must match the name used in the training samples and mosaics.
// Use uppercase letters without spaces or use underscores.
// Example: 'SURINAME' for Suriname.
var territory_name = 'SURINAME';

// Path to the regions shapefile.
var regions_asset = 'projects/mapbiomas-suriname/assets/suriname_classification_regions';

// Output asset path for the stable classification map.
var output_asset = 'projects/mapbiomas-suriname/assets/LAND-COVER/TRAINING/stable';

// Collection ID and version of the stable map.
var collection_id = 1.0;
var sample_version = '1';
var output_version = '1';

// Region ID to filter classification regions
var region_id = '1';

// Import the palettes module
var palettes = require('users/mapbiomas/modules:Palettes.js');

// Define the palettes for visualization
var vis = {'min': 0,'max': 69,'palette': palettes.get('classification9'), format: 'png'};

// Load Classification Regions
var regions = ee.FeatureCollection(regions_asset);
var selected_region = regions.filter(ee.Filter.eq("region_id", region_id));

var classified_name = 'projects/mapbiomas-suriname/assets/LAND-COVER/TRAINING/stable' + territory_name + '_ANNUAL_MAP_{region_id}_{version}'
    .replace('{region_id}', region_id)
    .replace('{version}', output_version);
  
// Combine all classified images into a multi-band image.
var classified_stack = ee.Image(classified_name);

/**
 * Calculates the number of distinct land cover classes per pixel across all years.
 *
 * @param {ee.Image} image - The image stack with classification bands for each year.
 * @returns {ee.Image} An image with a single band 'number_of_classes'.
 */
var calculateNumberOfClasses = function (image) {
    var n_classes = image.reduce(ee.Reducer.countDistinctNonNull());
    return n_classes.rename('number_of_classes');
};

// Calculate the number of distinct classes per pixel.
var n_classes = calculateNumberOfClasses(classified_stack);


// ========================
// Stable Map Generation
// ========================

// Retain only the pixels that maintain the same class across all years.
var stable = classified_stack
    .multiply(n_classes.eq(1))
    .select(0)                  // Selects the first band as the representative class
    .selfMask()                 // Masks pixels with no stable classification
    .clip(selected_region)                  
    .rename('stable');

// Add metadata to the stable map.
stable = stable
    .set('collection_id', collection_id)
    .set('version', output_version)
    .set('territory', territory_name);

// Display the stable map on the Map viewer.
Map.addLayer(stable, vis, 'stable', true);


// ========================
// Export to Asset
// ========================

var stable_name = territory_name + '_STABLE_MAP_{region_id}_{version}'
    .replace('{region_id}', region_id)
    .replace('{version}', output_version);

Export.image.toAsset({
    image: stable,
    description: stable_name,
    assetId: output_asset + '/' + stable_name,
    scale: 30,
    pyramidingPolicy: {
        '.default': 'sample'
    },
    maxPixels: 1e13,
    region: selected_region
});
