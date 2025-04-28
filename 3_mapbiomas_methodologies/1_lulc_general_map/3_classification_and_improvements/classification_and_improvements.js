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
var trained_samples_folder = 'projects/mapbiomas-suriname/assets/LAND-COVER/TRAINING/SAMPLES/IMPROVEMENT-1';

// Annual mosaics for the territory.
var mosaics_asset = 'projects/mapbiomas-mosaics/assets/SURINAME/mosaics-1';

// Stable map asset (reference classification map).
var stable_asset = 'projects/mapbiomas-suriname/assets/LAND-COVER/TRAINING/stable';

// Output folder for the final stable classification map.
var output_asset = 'projects/mapbiomas-suriname/assets/LAND-COVER/TRAINING/classification';

// Pattern for naming the exported trained samples.
// Use '{year}' as a placeholder to be replaced with each processing year.
// Example: 'suriname_training_samples_2000_1' for the year 2000.
var output_trained_samples_pattern = 'suriname_training_samples_{year}_1';

// Define stable map version.
var stable_version = '1';

// Collection ID and version for the stable map.
var collection_id = 1.0;
var output_version = '1';

// List of years to be processed.
var years = [
    2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007,
    2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015,
    2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023,
    2024
];

// List of spectral and terrain features used for classification.
var feature_space = [
    'red_amp', 'red_median', 'green_amp', 'green_median', 'blue_amp', 'blue_median',
    'nir_amp', 'nir_median', 'swir1_amp', 'swir1_median', 'swir2_amp', 'swir2_median',
    'evi2_median_dry', 'evi2_median_wet', 'evi2_stdDev',
    'ndvi_median_dry', 'ndvi_median_wet', 'ndvi_stdDev',
    'ndwi_median_dry', 'ndwi_median_wet', 'ndwi_stdDev',
    'slope'
];

// Define start and end years for mosaic filtering and visualization.
var startYear = 2000;
var endYear = 2024;

// Number of random samples per class for the stable map.
var n_samples_per_class = [
    { 'class_id': 1, 'n_samples': 500 },
    { 'class_id': 2, 'n_samples': 300 },
    { 'class_id': 3, 'n_samples': 500 },
    { 'class_id': 4, 'n_samples': 100 },
    { 'class_id': 5, 'n_samples': 100 }
];

// Load mosaics for the territory.
var mosaics = ee.ImageCollection(mosaics_asset)
    .filter(ee.Filter.eq('territory', territory_name));

// Load start and end mosaics.
var startMosaic = mosaics.filter(ee.Filter.eq('year', startYear)).mosaic();
var endMosaic = mosaics.filter(ee.Filter.eq('year', endYear)).mosaic();

// Load the stable classification map.
var stable = ee.ImageCollection(stable_asset)
    .filter(ee.Filter.eq('version', stable_version))
    .first();

// Prepare class values and number of points for stratified sampling.
var class_values_stable = n_samples_per_class.map(function (item) { return item.class_id; });
var class_points_stable = n_samples_per_class.map(function (item) { return item.n_samples; });

// Perform stratified random sampling on the stable map.
var training_samples_stable = stable.stratifiedSample({
    numPoints: 0,
    classBand: 'class',
    region: region_limit, // **Note:** Ensure `region_limit` is defined somewhere before this block!
    classValues: class_values_stable,
    classPoints: class_points_stable,
    scale: 30,
    seed: 1,
    geometries: true
});

// Visualize the training samples per class.
Map.addLayer(training_samples_stable.filter(ee.Filter.eq('class', 1)), { color: '#0ddf06' }, 'Class 1', false);
Map.addLayer(training_samples_stable.filter(ee.Filter.eq('class', 2)), { color: '#98ff00' }, 'Class 2', false);
Map.addLayer(training_samples_stable.filter(ee.Filter.eq('class', 3)), { color: '#d94fff' }, 'Class 3', false);
Map.addLayer(training_samples_stable.filter(ee.Filter.eq('class', 4)), { color: '#ff2d1c' }, 'Class 4', false);
Map.addLayer(training_samples_stable.filter(ee.Filter.eq('class', 5)), { color: '#00ffff' }, 'Class 5', false);

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
    var class_value = polygons.first().get('classId');

    // Assign the class value to each point
    points = points.map(function (point) {
        return point.set('classId', class_value);
    });

    return points;
};

// Generate additional training samples by random points.
var class_1 = generate_points(class_1_polygons, 50);
var class_2 = generate_points(class_2_polygons, 30);
var class_3 = generate_points(class_3_polygons, 50);
var class_4 = generate_points(class_4_polygons, 20);
var class_5 = generate_points(class_5_polygons, 20);
var class_6 = generate_points(class_6_polygons, 20);

// Merge all additional samples.
var training_samples_aditional = class_1
    .merge(class_2)
    .merge(class_3)
    .merge(class_4)
    .merge(class_5)
    .merge(class_6);

// Visualize additional training samples.
Map.addLayer(training_samples_aditional.filter(ee.Filter.eq('class', 1)), { color: '#0ddf06' }, 'Class 1 additional', false);
Map.addLayer(training_samples_aditional.filter(ee.Filter.eq('class', 2)), { color: '#98ff00' }, 'Class 2 additional', false);
Map.addLayer(training_samples_aditional.filter(ee.Filter.eq('class', 3)), { color: '#d94fff' }, 'Class 3 additional', false);
Map.addLayer(training_samples_aditional.filter(ee.Filter.eq('class', 4)), { color: '#ff2d1c' }, 'Class 4 additional', false);
Map.addLayer(training_samples_aditional.filter(ee.Filter.eq('class', 5)), { color: '#00ffff' }, 'Class 5 additional', false);

print('training_samples_aditional', training_samples_aditional);

// Merge stable and additional training samples.
var training_samples = training_samples_stable.merge(training_samples_aditional);
print('training_samples', training_samples);

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
var classifyRandomForest = function (year) {

    // Filter mosaics for the given year and create a single mosaic
    var mosaic_year = mosaics.filter(ee.Filter.eq('year', year)).mosaic();

    // Reduce regions of the training samples using the mosaic of the current year
    var trained_samples_year = mosaic_year.reduceRegions({
        collection: training_samples,    // Training samples collection
        reducer: ee.Reducer.first(),      // Extracts the first value of the bands for each sample
        scale: 30                         // Working scale (30 meters)
    });

    // Filter out samples that have null values in the feature space
    trained_samples_year = trained_samples_year.filter(ee.Filter.notNull(['red_amp']));

    // Train the Random Forest classifier using the filtered samples
    var trained_classifier = classifier.train({
        features: trained_samples_year,   // Samples used for training
        classProperty: 'class',           // Property name for the class label
        inputProperties: feature_space    // List of feature attributes to use
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
var classified_object_stack_list = years.map(classifyRandomForest);

// Combine all classified images into a multi-band image.
var classified_stack = ee.Image(classified_object_stack_list.map(function (obj) {
    return obj.classification;
}));

// Set metadata.
classified_stack = classified_stack
    .set('collection_id', collection_id)
    .set('version', output_version)
    .set('territory', territory_name);

// Add the classified image and export the trained samples for each year
years.forEach(function (year) {

    // Add the classified image for the current year to the map.
    Map.addLayer(
        classified_stack.select('classification_' + year),
        {
            min: 1,
            max: 5,
            palette: [
                '#0ddf06', // Class 1
                '#98ff00', // Class 2
                '#d94fff', // Class 3
                '#ff2d1c', // Class 4
                '#00ffff'  // Class 5
            ],
            format: 'png'
        },
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
    var output_trained_samples_name = output_trained_samples_pattern.replace('{year}', year);

    // Export the training samples to an asset
    Export.table.toAsset({
        collection: trained_samples_year,          // FeatureCollection to export
        description: output_trained_samples_name,  // Task description
        assetId: output_asset + '/' + output_trained_samples_name, // Destination asset path
    });

});

// Export final classified multi-band image.
var classification_name = territory_name + '-REGION-ID-' + output_version;

Export.image.toAsset({
    image: classified_stack,
    description: classification_name,
    assetId: output_asset + '/' + classification_name,
    scale: 30,
    pyramidingPolicy: { '.default': 'sample' },
    maxPixels: 1e13
});
