// ========================
// Initial Configuration
// ========================

// Define the country or territory name.
// It must match the name used in the training samples and mosaics.
// Use uppercase letters, without spaces or underscores.
// Example: 'SURINAME' for Suriname.
var territory_name = 'SURINAME';

// Folder containing the improved training samples.
// Ensure the folder name matches the IMPROVEMENT folder used for the additional training samples.
var trained_samples_folder = 'projects/mapbiomas-suriname/assets/LAND-COVER/COLLECTION-1/TRAINING/SAMPLES/IMPROVEMENT-1';

// Annual mosaics for the territory.
var mosaics_asset = 'projects/mapbiomas-mosaics/assets/LANDSAT/LULC/SURINAME/mosaics-1';

// Path to the regions shapefile.
var regions_asset = 'projects/mapbiomas-suriname/assets/suriname_classification_regions';

// Stable map asset (reference classification map).
var stable_asset = 'projects/mapbiomas-suriname/assets/LAND-COVER/COLLECTION-1/TRAINING/stable';

// Output folder for the final stable classification map.
var output_asset = 'projects/mapbiomas-suriname/assets/LAND-COVER/COLLECTION-1/TRAINING/classification';

// Pattern for naming the exported trained samples.
// Use '{year}' as a placeholder to be replaced with each processing year.
// Use '{version}' as a placeholder for the version number.
// Use '{region_id}' to specify the region ID.
// Use '{territory_name}' to specify the territory name.
// Example: 'suriname_training_samples_1_2000_1' for the year 2000, region id 1 and version 1.
var output_trained_samples_pattern = '{territory_name}_training_samples_{region_id}_{year}_{version}';

// Pattern for naming the exported classification image.
// Use '{version}' as a placeholder for the version number.
// Use '{region_id}' to specify the region ID.
// Use '{territory_name}' to specify the territory name.
// Example: 'SURINAME_1_1' for the year 2000, region id 1 and version 1.
var output_classification_pattern = '{territory_name}_{region_id}_{version}';

// Define stable map version.
var stable_version = '3';

// Define classification region
var region_id = '1';

// Collection ID and version for the stable map.
var collection_id = 1.0;
var output_version = '3';

// Description of the classification version.
var classification_version_description = [
    "### Classification Version Description",
    "- **Enhancements**: Includes improvements to the classification process.",
    "- **Additional Training Samples**: Incorporates additional training samples for better accuracy.",
    "- **Version**: {output_version}",
    "- **Stable Map Version**: {stable_version}",
    "- **Region ID**: {region_id}",
];

// Replace placeholders in the classification version description.
classification_version_description = classification_version_description.join("\n")
    .replace('{output_version}', output_version)
    .replace('{stable_version}', stable_version)
    .replace('{region_id}', region_id);

// Print the classification version description.
print('Classification Version Description:', classification_version_description);

// List of years to be processed.
var years = [
    2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007,
    2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015,
    2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023,
];

// List of spectral and terrain features used for classification.
var feature_space = [
    'blue_median',
    'green_dry',
    'green_median',
    'green_min',
    'red_dry',
    'red_median',
    'red_min',
    'red_wet',
    'nir_dry',
    'nir_median',
    'nir_min',
    'nir_stdDev',
    'nir_wet',
    'swir1_dry',
    'swir1_median',
    'swir1_min',
    'swir1_wet',
    'swir2_dry',
    'swir2_median',
    'swir2_min',
    'swir2_wet',
    'ndfi_amp',
    'ndfi_dry',
    'ndfi_median'
];

// Define start and end years for mosaic filtering and visualization.
var start_year = 2000;
var end_year = 2023;

// Number of random samples per class for the stable map.
var n_samples_per_class = [
    { 'class_id': 3, 'n_samples': 500 }, // forest
    { 'class_id': 11, 'n_samples': 300 }, // wetland 
    { 'class_id': 12, 'n_samples': 500 }, // grassland 
    { 'class_id': 21, 'n_samples': 100 }, // mosaic_of_uses 
    { 'class_id': 25, 'n_samples': 100 }, // non_vegetated_area 
    { 'class_id': 33, 'n_samples': 50 },  // water
];

// Color palette for each land cover class
var palette = [
    '#ffffff', // 0 - no data
    '#000000', // 1
    '#000000', // 2
    '#1f8d49', // 3 - forest
    '#000000', // 4
    '#000000', // 5
    '#000000', // 6
    '#000000', // 7
    '#000000', // 8
    '#000000', // 9
    '#000000', // 10
    '#519799', // 11 - wetland
    '#d6bc74', // 12 - grassland
    '#000000', // 13
    '#000000', // 14
    '#000000', // 15
    '#000000', // 16
    '#000000', // 17
    '#000000', // 18
    '#000000', // 19
    '#000000', // 20
    '#ffefc3', // 21 - mosaic_of_uses
    '#000000', // 22
    '#000000', // 23
    '#000000', // 24
    '#db4d4f', // 25 - non_vegetated_area
    '#000000', // 26
    '#000000', // 27
    '#000000', // 28
    '#000000', // 29
    '#000000', // 30
    '#000000', // 31
    '#000000', // 32
    '#2532e4', // 33 - water
];

// Define visualization parameters for land cover classification
var vis_params_lulc = {
    min: 0,
    max: 33,
    palette: palette,
    format: 'png'
};

// Define visualization parameters for mosaics
var vis_params_mosaic = {
    min: 0,
    max: 4000,
    bands: ['swir1_median', 'nir_median', 'red_median'],
    format: 'png'
};

// Load Classification Regions
var regions = ee.FeatureCollection(regions_asset);
var selected_region = regions.filter(ee.Filter.eq("region_id", region_id));

// Load mosaics for the territory.
var mosaics = ee.ImageCollection(mosaics_asset);

// Load start and end mosaics.
var start_mosaic = mosaics.filter(ee.Filter.eq('year', start_year)).mosaic();
var end_mosaic = mosaics.filter(ee.Filter.eq('year', end_year)).mosaic();

// Load the stable classification map.
var stable = ee.ImageCollection(stable_asset)
    .filter(ee.Filter.eq('version', stable_version))
    .first();

// Prepare class values and number of points for stratified sampling.
var class_values_stable = n_samples_per_class.map(function (item) { return item.class_id; });
var class_points_stable = n_samples_per_class.map(function (item) { return item.n_samples; });

// Perform stratified random sampling on the stable map.
var training_samples_stable = stable
    .rename('class_id')
    .stratifiedSample({
        numPoints: 0,
        classBand: 'class_id',
        region: selected_region,
        classValues: class_values_stable,
        classPoints: class_points_stable,
        scale: 30,
        seed: 1,
        geometries: true
    });

// Visualize the training samples per class.
Map.addLayer(training_samples_stable.filter(ee.Filter.eq('class_id', 3)), { color: palette[3] }, 'forest', false);
Map.addLayer(training_samples_stable.filter(ee.Filter.eq('class_id', 11)), { color: palette[11] }, 'wetland', false);
Map.addLayer(training_samples_stable.filter(ee.Filter.eq('class_id', 12)), { color: palette[12] }, 'grassland', false);
Map.addLayer(training_samples_stable.filter(ee.Filter.eq('class_id', 21)), { color: palette[21] }, 'mosaic_of_uses', false);
Map.addLayer(training_samples_stable.filter(ee.Filter.eq('class_id', 25)), { color: palette[25] }, 'non_vegetated_area', false);
Map.addLayer(training_samples_stable.filter(ee.Filter.eq('class_id', 33)), { color: palette[33] }, 'water', false);

/**
 * @description Generates random points inside polygons and assigns class labels.
 * @param {ee.FeatureCollection} polygons - The polygons in which random points will be generated.
 * @param {number} n_points - Total number of points to generate.
 * @returns {ee.FeatureCollection} A FeatureCollection of points with a 'class_id' attribute.
 */
var generate_points = function (polygons, n_points) {

    // Check if the input is valid and contains at least one feature
    var valid = polygons && polygons.size().gt(0);

    // Function to generate random points with class attribute if input is valid
    var generate_points_if_is_valid = function () {
        // Generate random points inside the polygons
        var points = ee.FeatureCollection.randomPoints(polygons, n_points);

        // Retrieve the class_id from the first feature (assumes homogeneous class)
        var class_value = polygons.first().get('class_id');

        // Assign class_id to each generated point
        points = points.map(function (point) {
            return point.set('class_id', class_value);
        });

        return points;
    };

    // Conditionally generate points or return an empty FeatureCollection
    var points = ee.Algorithms.If(
        valid,
        generate_points_if_is_valid(),
        ee.FeatureCollection([])
    );

    // Ensure the result is cast as a FeatureCollection
    points = ee.FeatureCollection(points);

    return points;
};

// Define input polygons for each land cover class, using empty collections as fallback
var forest = (typeof forest !== 'undefined') ? forest : ee.FeatureCollection([]);
var grassland = (typeof grassland !== 'undefined') ? grassland : ee.FeatureCollection([]);
var non_vegetated_area = (typeof non_vegetated_area !== 'undefined') ? non_vegetated_area : ee.FeatureCollection([]);
var water = (typeof water !== 'undefined') ? water : ee.FeatureCollection([]);
var wetland = (typeof wetland !== 'undefined') ? wetland : ee.FeatureCollection([]);
var mosaic_of_uses = (typeof mosaic_of_uses !== 'undefined') ? mosaic_of_uses : ee.FeatureCollection([]);

// Generate random training points for each class
var forest_points = generate_points(forest, 50);
var grassland_points = generate_points(grassland, 20);
var non_vegetated_area_points = generate_points(non_vegetated_area, 20);
var water_points = generate_points(water, 20);
var wetland_points = generate_points(wetland, 30);
var mosaic_of_uses_points = generate_points(mosaic_of_uses, 20);

// Merge all points into a single FeatureCollection
var training_samples_additional = ee.FeatureCollection([])
    .merge(forest_points)
    .merge(grassland_points)
    .merge(non_vegetated_area_points)
    .merge(water_points)
    .merge(wetland_points)
    .merge(mosaic_of_uses_points);

// Visualize additional training samples.
Map.addLayer(training_samples_additional.filter(ee.Filter.eq('class_id', 3)), { color: palette[3] }, 'forest additional', false);
Map.addLayer(training_samples_additional.filter(ee.Filter.eq('class_id', 12)), { color: palette[12] }, 'grassland additional', false);
Map.addLayer(training_samples_additional.filter(ee.Filter.eq('class_id', 25)), { color: palette[25] }, 'non_vegetated_area additional', false);
Map.addLayer(training_samples_additional.filter(ee.Filter.eq('class_id', 33)), { color: palette[33] }, 'water additional', false);
Map.addLayer(training_samples_additional.filter(ee.Filter.eq('class_id', 21)), { color: palette[21] }, 'mosaic_of_uses additional', false);
Map.addLayer(training_samples_additional.filter(ee.Filter.eq('class_id', 11)), { color: palette[11] }, 'wetland additional', false);

// print('training_samples_additional', training_samples_additional);

// Merge stable and additional training samples.
var training_samples = training_samples_stable.merge(training_samples_additional);
print('training_samples_size:', training_samples.size());

// =========================
// Classification
// =========================

// Set up the Random Forest classifier.
var classifier = ee.Classifier.smileRandomForest({
    numberOfTrees: 50
});

/**
 * @description Classifies a given year using the corresponding mosaic and training samples.
 * @param {number} year - The year to classify.
 * @returns {Object} An object with the classified image, year, and training samples.
 */
var classify_random_forest = function (year) {

    // Filter mosaics for the given year and create a single mosaic
    var mosaic_year = mosaics.filter(ee.Filter.eq('year', year)).mosaic();

    // Reduce regions of the training samples using the mosaic of the current year
    var trained_samples_year = mosaic_year
        .reduceRegions({
            collection: training_samples,     // Training samples collection
            reducer: ee.Reducer.first(),      // Extracts the first value of the bands for each sample
            scale: 30                         // Working scale (30 meters)
        });

    // Filter out samples that have null values in the feature space
    trained_samples_year = trained_samples_year.filter(ee.Filter.notNull([feature_space[0]]));

    // Train the Random Forest classifier using the filtered samples
    var trained_classifier = classifier.train({
        features: trained_samples_year,    // Samples used for training
        classProperty: 'class_id',           // Property name for the class label
        inputProperties: feature_space     // List of feature attributes to use
    });

    // Classify the mosaic of the current year using the trained classifier
    var classification = mosaic_year
        .classify(trained_classifier)
        .rename('classification_' + year); // Rename the output band

    // Return an object containing the classification, year, and trained samples
    return {
        classification: classification,
        year: year,
        trained_samples: trained_samples_year
    };
};

// Classify all years.
var classified_object_stack_list = years.map(classify_random_forest);

// Combine all classified images into a multi-band image.
var classified_stack = ee.Image(
    classified_object_stack_list
        .map(function (obj) { return obj.classification })
);

// Set properties for the classified image.
classified_stack = classified_stack
    .clip(selected_region)
    .set('description', classification_version_description)
    .set('collection_id', collection_id)
    .set('version', output_version)
    .set('territory', territory_name);

// Add the classified image for the current year to the map.
Map.addLayer(
    stable,
    vis_params_lulc,
    'stable',
    false // Initially not visible
);

// Add the classified image and export the trained samples for each year
years.forEach(function (year) {

    // Add mosaics of the current year to the map
    Map.addLayer(
        mosaics.filterMetadata('year', 'equals', year).mosaic().clip(selected_region),
        vis_params_mosaic,
        'mosaic_' + year,
        false // Initially not visible
    );

    // Add the classified image for the current year to the map.
    Map.addLayer(
        classified_stack.select('classification_' + year),
        vis_params_lulc,
        'classification_' + year,
        false // Initially not visible
    );

    // Get the trained samples object for the current year from the classified object stack
    var trained_samples_year = classified_object_stack_list.filter(
        function (obj) {
            return obj.year === year; // Match the year
        }
    )[0].trained_samples; // Get the 'trained_samples' property

    // Generate the output name for the trained samples asset
    var output_trained_samples_name = output_trained_samples_pattern
        .replace('{territory_name}', territory_name.toLowerCase())
        .replace('{year}', year)
        .replace('{version}', output_version)
        .replace('{region_id}', region_id);

    // Export the training samples to an asset
    Export.table.toAsset({
        collection: trained_samples_year,                           // FeatureCollection to export
        description: output_trained_samples_name,                   // Task description
        assetId: output_asset + '/' + output_trained_samples_name,  // Destination asset path
    });
});

// Export final classified multi-band image.
var classification_name = output_classification_pattern
    .replace('{territory_name}', territory_name)
    .replace('{version}', output_version)
    .replace('{region_id}', region_id);

Export.image.toAsset({
    image: classified_stack,
    description: classification_name,
    assetId: output_asset + '/' + classification_name,
    scale: 30,
    pyramidingPolicy: { '.default': 'sample' },
    maxPixels: 1e13,
    region: selected_region.geometry().bounds()
});