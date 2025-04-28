# Stable Map Generation

This guide will walk you through the process of generating a **Stable Land Cover Map** using Earth Engine. All steps are detailed to help beginners understand the workflow and replicate the process independently.

---

## 1. Initial Configuration

First, define the basic settings for your analysis, including the territory name, assets, and parameters.

```javascript
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


var regions = ee.FeatureCollection(regions_asset);
var selected_region = regions.filter(ee.Filter.eq("region_id", region_id));

// List of years to be processed.
var years = [
    2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007,
    2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015,
    2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023,
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

// Color palette for each land cover class
var palette = [
    '#1f8d49', // forest
    '#519799', // wetland
    '#d6bc74', // grassland
    '#ffefc3', // mosaic_of_uses
    '#db4d4f', // non_vegetated_area
    '#2532e4'  // water
];
```

> **Note:** Ensure that the asset paths are correctly set and that you have access permissions.

---

## 2. Load Data and Initialize Classifier

Load the mosaics and prepare the Random Forest classifier with default parameters.

```javascript
// Load Classification Regions
var regions = ee.FeatureCollection(regions_asset);
var selected_region = regions.filter(ee.Filter.eq("region_id", region_id));

// Load mosaics for the territory.
var mosaics = ee.ImageCollection(mosaics_asset);

// Initialize the Random Forest classifier.
var classifier = ee.Classifier.smileRandomForest({
    numberOfTrees: 50
});
```

> **Reminder:** The mosaics must contain a property called 'territory' that matches the `territory_name`.

---

## 3. Define the Classification Function

This function trains and applies the Random Forest classifier for each year.

```javascript
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
```

> **Tip:** Study carefully how the `train` method works and understand how the classifier is applied.

---

## 4. Apply the Classification Across All Years

Run the classification for each year and stack the results together.

```javascript
// Apply classification to all years
var classified_stack_list = years.map(classifyRandomForest);

// Combine all classified images into one multi-band image
var classified_stack = ee.Image(classified_stack_list);
```

> **Understanding:** Each band corresponds to one year and contains the predicted land cover class.

---

## 5. Calculate the Number of Distinct Classes

Now we determine how many different classes each pixel has across the years.

```javascript
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

// Count of distinct classes per pixel
var n_classes = calculateNumberOfClasses(classified_stack);
```

> **Important:** Pixels that show the same class in all years will have `number_of_classes = 1`.

---

## 6. Generate the Stable Map

Select only the stable areas that never changed class.

```javascript
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

// Add metadata to the image
stable = stable
    .set('collection_id', collection_id)
    .set('version', output_version)
    .set('territory', territory_name);

```

> **Key Concept:** Multiplying by `n_classes.eq(1)` filters only those pixels that remained the same class throughout all years.

---

## 7. Visualize the Result

You can quickly visualize the stable map.

```javascript
// Display the stable map on the Map viewer.
Map.addLayer(stable, {
    min: 3,
    max: 33,
    palette: palette,
    format: 'png'
}, 'stable', true);
```

> **Tip:** Adjust the `palette` and `min/max` values according to your classes.

---

## 8. Export the Stable Map

Once validated, export the stable map to your Earth Engine asset.

```javascript
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
    region: selected_region,
    fileFormat: 'GeoTIFF'
});

```

---

# Final Notes

- Always verify your training samples before training.
- Understand each Earth Engine function being used.
- Start with a small region and a few years if you are testing for the first time.


