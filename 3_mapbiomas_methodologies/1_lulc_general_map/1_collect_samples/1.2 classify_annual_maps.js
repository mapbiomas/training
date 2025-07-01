// ========================
// Initial Configuration
// ========================

// Define the country or territory name.
// It must match the name used in the training samples and mosaics.
// Use uppercase letters without spaces or use underscores.
// Example: 'SURINAME' for Suriname.
var territory_name = 'SURINAME';

// Folder containing the training samples.
var trained_samples_folder = 'projects/mapbiomas-suriname/assets/LAND-COVER/COLLECTION-1/TRAINING/SAMPLES/STABLE-1';

// Pattern for sample file names.
// The pattern must include a placeholder {year}, e.g., 'suriname_training_samples_{year}_1'.
// This placeholder will be replaced with the actual year during processing.
// Example: 'suriname_training_samples_2000_1' for the year 2000.
var trained_samples_pattern = 'suriname_training_samples_{region_id}_{year}_{version}';

// Asset containing annual mosaics for the territory.
var mosaics_asset = 'projects/mapbiomas-mosaics/assets/LANDSAT/LULC/SURINAME/mosaics-1';

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

var years = [
    1985, 1986, 1987, 1988, 1989, 1990, 1991, 1992,
    1993, 1994, 1995, 1996, 1997, 1998, 1999,
    2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007,
    2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015,
    2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023,
    2024,
];

// List of features used for classification.
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


// Import the palettes module
var palettes = require('users/mapbiomas/modules:Palettes.js');

// Define the palettes for visualization
var vis = {'min': 0,'max': 69,'palette': palettes.get('classification9'), format: 'png'};

// Load Classification Regions
var regions = ee.FeatureCollection(regions_asset);
var selected_region = regions.filter(ee.Filter.eq("region_id", region_id));

// Load mosaics for the territory.
var mosaics = ee.ImageCollection(mosaics_asset);

// Initialize the Random Forest classifier.
var classifier = ee.Classifier.smileRandomForest({
    numberOfTrees: 50
});


/**
 * Classifies a given year using its corresponding training samples and mosaic.
 *
 * @param {number} year - The year to classify.
 * @returns {ee.Image} The classified image with a single band named 'classification_{year}'.
 */
var classifyRandomForest = function (year) {

    // Load training samples for the specific year.
    var trained_samples_year = ee.FeatureCollection(
        trained_samples_folder + '/' + trained_samples_pattern
            .replace('{region_id}', region_id)
            .replace('{year}', year)
            .replace('{version}', sample_version)
    );

    // Select the mosaic corresponding to the year.
    var mosaic_year = mosaics.filter(ee.Filter.eq('year', year)).mosaic();

    // Train the classifier with the current year's samples.
    var trained_classifier = classifier.train({
        features: trained_samples_year,
        classProperty: 'class_id',
        inputProperties: feature_space
    });

    // Apply the trained classifier to the mosaic.
    var classification = mosaic_year
        .classify(trained_classifier)
        .rename('classification_' + year);

    return classification;
};

// Apply the classification to all years.
var classified_stack_list = years.map(classifyRandomForest);

