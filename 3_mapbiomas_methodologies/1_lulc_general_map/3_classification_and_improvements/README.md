# Classification and Improvements

This script classifies annual land cover using a Random Forest model in Google Earth Engine. It is divided into several sections to guide beginner users. All code blocks retain original comments and docstrings.

---

## 1. Initial Configuration

Set up variables that define the territory, asset paths, processing years, feature space, and sample sizes. These settings are essential for linking to correct assets and defining parameters for model training.

```javascript
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
```

---

## 2. Load Data

Load mosaics and stable maps needed for training and classification. The mosaics provide spectral information for each year.

```javascript
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
```

---

## 3. Generate Training Samples

Create training samples from the stable map and additional manually defined polygons. Samples are necessary for model learning.

### 3.1 Stable Samples

Use stratified random sampling to generate a representative set of samples across classes.

```javascript
// Prepare class values and number of points for stratified sampling.
var class_values_stable = n_samples_per_class.map(function (item) { return item.class_id; });
var class_points_stable = n_samples_per_class.map(function (item) { return item.n_samples; });

// Perform stratified random sampling on the stable map.
var training_samples_stable = stable.stratifiedSample({
    numPoints: 0,
    classBand: 'class',
    region: region_limit, // Must be defined before this block.
    classValues: class_values_stable,
    classPoints: class_points_stable,
    scale: 30,
    seed: 1,
    geometries: true
});
```

### 3.2 Additional Samples

Generate extra samples using predefined polygons, ensuring better spatial coverage and complementing the stable map.

```javascript
/**
 * Generates random points inside polygons and assigns class labels.
 */
var generatePoints = function (polygons, n_points) {
    var points = ee.FeatureCollection.randomPoints(polygons, n_points);
    var class_value = polygons.first().get('class');
    points = points.map(function (point) {
        return point.set('class', class_value);
    });
    return points;
};

var class_1 = generatePoints(class_1_polygons, 50);
var class_2 = generatePoints(class_2_polygons, 30);
var class_3 = generatePoints(class_3_polygons, 50);
var class_4 = generatePoints(class_4_polygons, 20);
var class_5 = generatePoints(class_5_polygons, 20);

var training_samples_aditional = class_1
    .merge(class_2)
    .merge(class_3)
    .merge(class_4)
    .merge(class_5);

// Merge stable and additional training samples.
var training_samples = training_samples_stable.merge(training_samples_aditional);
```

---

## 4. Classification Setup

Initialize the Random Forest model and prepare the classification function.

```javascript
// Set up the Random Forest classifier.
var classifier = ee.Classifier.smileRandomForest({
    numberOfTrees: 50
});

/**
 * Classifies a given year using the corresponding mosaic and training samples.
 */
var classifyRandomForest = function (year) {

    var mosaic_year = mosaics.filter(ee.Filter.eq('year', year)).mosaic();

    var trained_samples_year = mosaic_year.reduceRegions({
        collection: training_samples,
        reducer: ee.Reducer.first(),
        scale: 30
    }).filter(ee.Filter.notNull(['red_amp']));

    var trained_classifier = classifier.train({
        features: trained_samples_year,
        classProperty: 'class',
        inputProperties: feature_space
    });

    var classification = mosaic_year
        .classify(trained_classifier)
        .rename('classification_' + year);

    return {
        classification: classification,
        year: year,
        trained_samples: trained_samples_year
    };
};
```

---

## 5. Classification Execution

Apply the classification function across all target years and build a stacked classified image.

```javascript
var classified_object_stack_list = years.map(classifyRandomForest);

var classified_stack = ee.Image(classified_object_stack_list.map(function (obj) {
    return obj.classification;
}));

classified_stack = classified_stack
    .set('collection_id', collection_id)
    .set('version', output_version)
    .set('territory', territory_name);
```

---

## 6. Exporting Results

Export each year's classified map and training samples, followed by the final multi-band image.

```javascript
years.forEach(function (year) {

    Map.addLayer(
        classified_stack.select('classification_' + year),
        {
            min: 1,
            max: 5,
            palette: ['#0ddf06', '#98ff00', '#d94fff', '#ff2d1c', '#00ffff'],
            format: 'png'
        },
        'classification_' + year,
        false
    );

    var trained_samples_year = classified_object_stack_list.filter(
        function (obj) {
            return obj.year === year;
        }
    )[0].trained_samples;

    var output_trained_samples_name = output_trained_samples_pattern.replace('{year}', year);

    Export.table.toAsset({
        collection: trained_samples_year,
        description: output_trained_samples_name,
        assetId: output_asset + '/' + output_trained_samples_name,
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
```

---
