# Stable Map Generation

This guide will walk you through the process of generating a **Stable Land Cover Map** using Earth Engine. All steps are detailed to help beginners understand the workflow and replicate the process independently.

---

## 1. Initial Configuration

First, define the basic settings for your analysis, including the territory name, assets, and parameters.

```javascript
// ========================
// Initial Configuration
// ========================

// Define the country or territory name
// This should match the name used in the training samples and mosaics
// The name should be in uppercase and without spaces or separated by underscores
// For example, 'SURINAME' for Suriname
var territory_name = 'SURINAME';

// Folder containing the training samples
var trained_samples_folder = 'projects/mapbiomas-suriname/assets/LAND-COVER/TRAINING/SAMPLES/STABLE-1';

// Pattern for sample file names
// The pattern should include a placeholder for the year, e.g., 'suriname_training_samples_{year}_1'
// The placeholder will be replaced with the actual year during processing
// For example, 'suriname_training_samples_2000_1' for the year 2000
var trained_samples_pattern = 'suriname_training_samples_{year}_1';

// Annual mosaics for the territory
var mosaics_asset = 'projects/mapbiomas-mosaics/assets/SURINAME/mosaics-1';

// Output asset for the stable classification map
var output_asset = 'projects/mapbiomas-suriname/assets/LAND-COVER/TRAINING/stable';

// Collection ID and version of the stable map
var collection_id = 1.0;
var output_version = '1';

// List of years to be processed
var years = [
    2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007,
    2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015,
    2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023,
    2024
];

// List of features used for classification
var feature_space = [
    'red_amp', 'red_median', 'green_amp', 'green_median', 'blue_amp', 'blue_median',
    'nir_amp', 'nir_median', 'swir1_amp', 'swir1_median', 'swir2_amp', 'swir2_median',
    'evi2_median_dry', 'evi2_median_wet', 'evi2_stdDev',
    'ndvi_median_dry', 'ndvi_median_wet', 'ndvi_stdDev',
    'ndwi_median_dry', 'ndwi_median_wet', 'ndwi_stdDev',
    'slope'
];
```

> **Note:** Ensure that the asset paths are correctly set and that you have access permissions.

---

## 2. Load Mosaics and Initialize Classifier

Load the mosaics and prepare the Random Forest classifier with default parameters.

```javascript
// Load mosaics for the territory
var mosaics = ee.ImageCollection(mosaics_asset)
    .filter(ee.Filter.eq('territory', territory_name));

// Initialize the Random Forest classifier
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

    // Load training samples for the year
    var trained_samples_year = ee.FeatureCollection(
        trained_samples_folder + '/' + trained_samples_pattern.replace('{year}', year)
    );

    // Select mosaic for the year
    var mosaic_year = mosaics.filter(ee.Filter.eq('year', year)).mosaic();

    // Train the classifier with the current year's samples
    var trained_classifier = classifier.train({
        features: trained_samples_year,
        classProperty: 'class',
        inputProperties: feature_space
    });

    // Apply the classifier to the mosaic
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

var stable = classified_stack
    .multiply(n_classes.eq(1)) // Retain only pixels with the same class across all years
    .select(0)                 // Select the first band as representative
    .selfMask()                // Mask null or zero pixels
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
// Add stable map to the map viewer
Map.addLayer(stable, {
    min: 1, 
    max: 5,
    palette: [
        '#0ddf06', 
        '#98ff00', 
        '#d94fff', 
        '#ff2d1c', 
        '#00ffff'
    ],
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

var stable_name = territory_name + '-stable-map-' + output_version;

Export.image.toAsset({
    image: stable,
    description: stable_name,
    assetId: output_asset + '/' + stable_name,
    scale: 30,
    pyramidingPolicy: {
        '.default': 'sample'
    },
    maxPixels: 1e13,
    region: region_limit
});

```

> **Caution:** You need to define `region_limit` properly with the boundary geometry.

---

# Final Notes

- Always verify your training samples before training.
- Understand each Earth Engine function being used.
- Start with a small region and a few years if you are testing for the first time.


