// ========================
// Initial Configuration
// ========================

// Define the country or territory name.
// It must match the name used in the training samples and mosaics.
// Use uppercase letters, without spaces or underscores.
// Example: 'SURINAME' for Suriname.
var territory_name = 'SURINAME';

// Annual mosaics for the territory.
var mosaics_asset = 'projects/mapbiomas-mosaics/assets/LANDSAT/LULC/SURINAME/mosaics-1';

// Path to the regions shapefile.
var regions_asset = 'projects/mapbiomas-suriname/assets/suriname_classification_regions';

// Output folder for the final stable classification map.
var output_asset = 'projects/mapbiomas-suriname/assets/LAND-COVER/COLLECTION-1/TRAINING/SAMPLES/STABLE-1';

// Pattern for naming the exported trained samples.
// Use '{year}' as a placeholder to be replaced with each processing year.
// Use '{version}' as a placeholder for the version number.
// Use '{region_id}' to specify the region ID.
// Example: 'suriname_training_samples_1_2000_1' for the year 2000, region id 1 and version 1.
var output_trained_samples_pattern = 'suriname_training_samples_{region_id}_{year}_{version}';

// Collection ID and version for the stable map.
var collection_id = 1.0;
var output_version = '1';

// Region ID to filter classification regions
var region_id = '1';

// List of years to be processed.
var years = [
    2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007,
    2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015,
    2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023,
];

// Define start and end years for mosaic filtering and visualization.
var start_year = 2000;
var end_year = 2023;

// List of class IDs to be sampled
var class_ids = [
    3,  // forest
    11, // wetland 
    12, // grassland 
    21, // mosaic_of_uses 
    25, // non_vegetated_area 
    33, // water
];

// Load Classification Regions
var regions = ee.FeatureCollection(regions_asset);
var selected_region = regions.filter(ee.Filter.eq("region_id", region_id));

// Load Mosaics
var mosaics = ee.ImageCollection(mosaics_asset);

// Color palette for each land cover class
var palette = [
    '#1f8d49', // forest
    '#519799', // wetland
    '#d6bc74', // grassland
    '#ffefc3', // mosaic_of_uses
    '#db4d4f', // non_vegetated_area
    '#2532e4'  // water
];

// Define the visualization parameters for the mosaics
var vis_params = {
    bands: ['swir1_median', 'nir_median', 'red_median'],
    gain: [0.08, 0.06, 0.2]
};

// Load start and end mosaics.
var start_mosaic = mosaics.filter(ee.Filter.eq('year', start_year))
    .mosaic()
    .clip(selected_region);

var end_mosaic = mosaics.filter(ee.Filter.eq('year', end_year))
    .mosaic()
    .clip(selected_region);

// Add the start and end mosaics to the map
Map.addLayer(start_mosaic, vis_params, 'Mosaic ' + start_year.toString());
Map.addLayer(end_mosaic, vis_params, 'Mosaic ' + end_year.toString());

/**
 * @description Generates random points inside polygons and assigns class labels.
 * @param {ee.FeatureCollection} polygons - The polygons where points will be generated.
 * @param {number} n_points - Number of points to generate.
 * @returns {ee.FeatureCollection} FeatureCollection of points with class attribute.
 */
var generate_points = function (polygons, n_points) {
    // Generate N random points inside the polygons
    var points = ee.FeatureCollection.randomPoints(polygons, n_points);

    // Get the class value property
    var class_value = polygons.first().get('class_id');

    // Assign the class value to each point
    points = points.map(function (point) {
        return point.set('class_id', class_value);
    });

    return points;
};

// Generate additional training samples by random points.
var forest_points = generate_points(forest, 50);
var wetland_points = generate_points(wetland, 30);
var grassland_points = generate_points(grassland, 50);
var mosaic_of_uses_points = generate_points(mosaic_of_uses, 20);
var non_vegetated_area_points = generate_points(non_vegetated_area, 20);
var water_points = generate_points(water, 20);

// Merge all additional samples.
var training_samples = forest_points
    .merge(wetland_points)
    .merge(grassland_points)
    .merge(mosaic_of_uses_points)
    .merge(non_vegetated_area_points)
    .merge(water_points);

// Visualize additional training samples.
Map.addLayer(training_samples.filter(ee.Filter.eq('class_id', 3)), { color: '#1f8d49' }, 'forest_points', false);
Map.addLayer(training_samples.filter(ee.Filter.eq('class_id', 11)), { color: '#519799' }, 'wetland_points', false);
Map.addLayer(training_samples.filter(ee.Filter.eq('class_id', 12)), { color: '#d6bc74' }, 'grassland_points', false);
Map.addLayer(training_samples.filter(ee.Filter.eq('class_id', 25)), { color: '#db4d4f' }, 'non_vegetated_area_points', false);
Map.addLayer(training_samples.filter(ee.Filter.eq('class_id', 21)), { color: '#ffefc3' }, 'mosaic_of_uses', false);
Map.addLayer(training_samples.filter(ee.Filter.eq('class_id', 33)), { color: '#2532e4' }, 'water_points', false);

// Iterate over Years
years.forEach(function (year) {

    // Filter and prepare the mosaic for the current year
    var mosaic_year = mosaics.filter(ee.Filter.eq('year', year))
        .mosaic()
        .clip(selected_region);

    // Sample mosaic with training points
    var trained_samples = mosaic_year.sampleRegions({
        collection: training_samples,
        properties: ['class_id'],
        scale: 30,
        geometries: true,
    });

    print('trained samples', trained_samples);

    // Generate the output name for the trained samples asset
    var output_trained_samples_name = output_trained_samples_pattern
        .replace('{region_id}', region_id)
        .replace('{year}', year)
        .replace('{version}', output_version);

    // Export the trained samples to an asset
    Export.table.toAsset({
        collection: trained_samples,
        description: output_trained_samples_name,
        assetId: output_asset + '/' + output_trained_samples_name
    });
    
});