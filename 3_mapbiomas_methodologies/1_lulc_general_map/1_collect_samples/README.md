# Training Sample Generation

## Overview

This script generates random training samples for land cover classification based on MapBiomas mosaics and classification regions. The samples are exported as Earth Engine assets for each year in the selected range.

---
## Important Notes

- Make sure to define the `forest`, `wetland`, `grassland`, `mosaic_of_uses`, `non_vegetated_area`, and `water` variables before calling `generate_points()`.
- Ensure that all assets exist and that you have permission to export to the specified `output_asset` folder.

## Collect manual samples

In this step, we will manually collect samples for the classification process. Using the code editor's shape editing tool, we will draw polygons representing each class and import them as a FeatureCollection.

We will use images from 2000 and 2023 to collect training samples.

- Antropic classes samples should be collected in the year 2000 (and validated in 2023)
- Natural classes samples should be collected in the year 2023 (and validated in 2000)

![load image](./figures/samples3.png)
![load image](./figures/samples1.png)
![load image](./figures/samples2.png)

### Create a feature collection


In this example, we will classify three land cover classes: `forest`, `wetland`, `grassland`, `agriculture`, `non vegetated area` and `water`. To achieve this, we need to collect samples for each class. Using the shape editing tool in the code editor ![edit-tool](./figures/edit-tool.png), we will create six sets of polygons and import them as a FeatureCollection. Each set of geometries will also be assigned a name. 

The script is designed to accept the following class names: `forest`, `wetland`, `grassland`, `agriculture`, `non vegetated area` and `water`. For each category, a property called `class_id` will be added, with values of 3, 11, 12, 21, 25 and 33 corresponding to forest, wetland, grassland, agriculture, non vegetated area and water respectively. You can assign a reference color to each class. See the figure below:
![load image](./figures/create-feature-collection.png)

## Script Sections Explanation

### 1. Initial Configuration


Defines all the necessary parameters to control the script execution, including asset paths, years, region IDs, and output naming patterns.

- **territory_name**: Territory name in uppercase, no spaces.
- **mosaics_asset**: Path to the mosaics image collection.
- **regions_asset**: Path to the classification regions shapefile.
- **output_asset**: Folder to store the exported trained samples.
- **output_trained_samples_pattern**: Pattern to name exported assets.
- **collection_id**, **output_version**: Version identifiers.
- **region_id**: Specific region to process.
- **years**: List of years to iterate over.
- **start_year**, **end_year**: For visualizing the first and last mosaics.
- **class_ids**: List of land cover classes to generate samples for.

```javascript
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
```

### 2. Load Assets

Loads the regions and mosaics from Earth Engine assets. Filters the classification regions by the selected region ID.

```javascript
// Load Classification Regions
var regions = ee.FeatureCollection(regions_asset);
var selected_region = regions.filter(ee.Filter.eq("region_id", region_id));

// Load Mosaics
var mosaics = ee.ImageCollection(mosaics_asset);
```

### 3. Define Visualization Palette

Assigns specific colors for each land cover class to be used when displaying points on the map.

```javascript
var palette = [
    '#1f8d49', // forest
    '#519799', // wetland
    '#d6bc74', // grassland
    '#ffefc3', // mosaic_of_uses
    '#db4d4f', // non_vegetated_area
    '#2532e4'  // water
];
```

### 4. Load and Visualize Start and End Mosaics

Loads mosaics for the first and last years and displays them on the map for context.

```javascript
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
```

### 5. Random Point Generation Function

This function creates a specified number of random points within a given polygon collection and assigns the corresponding land cover class ID to each point.

```javascript
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
```

### 6. Generate Training Samples

Generates additional training samples for each land cover class by calling `generate_points` for the corresponding class mask.

```javascript
// Generate additional training samples by random points.
var forest_points = generate_points(forest, 50);
var wetland_points = generate_points(wetland, 30);
var grassland_points = generate_points(grassland, 50);
var mosaic_of_uses_points = generate_points(mosaic_of_uses, 20);
var non_vegetated_area_points = generate_points(non_vegetated_area, 20);
var water_points = generate_points(water, 20);
```

### 7. Merge All Training Samples

Combines all the generated points into a single FeatureCollection to be used for sampling.

```javascript
// Merge all additional samples.
var training_samples = forest_points
    .merge(wetland_points)
    .merge(grassland_points)
    .merge(mosaic_of_uses_points)
    .merge(non_vegetated_area_points)
    .merge(water_points);
```

### 8. Visualize Training Samples

Adds each category of generated training points to the map with the corresponding color for visual verification.

```javascript
Map.addLayer(training_samples.filter(ee.Filter.eq('class_id', 3)), { color: '#1f8d49' }, 'forest_points', false);
Map.addLayer(training_samples.filter(ee.Filter.eq('class_id', 11)), { color: '#519799' }, 'wetland_points', false);
Map.addLayer(training_samples.filter(ee.Filter.eq('class_id', 12)), { color: '#d6bc74' }, 'grassland_points', false);
Map.addLayer(training_samples.filter(ee.Filter.eq('class_id', 25)), { color: '#db4d4f' }, 'non_vegetated_area_points', false);
Map.addLayer(training_samples.filter(ee.Filter.eq('class_id', 21)), { color: '#ffefc3' }, 'mosaic_of_uses', false);
Map.addLayer(training_samples.filter(ee.Filter.eq('class_id', 33)), { color: '#2532e4' }, 'water_points', false);
```
![load image](./figures/sample_points.png)
### 9. Iterate Over Years and Export Samples

For each year:
- Prepares the mosaic for that year.
- Samples the mosaic using the training samples.
- Exports the sampled points to the specified Earth Engine asset folder.

```javascript
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
        geometries: true
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
```

### 10. Classify and Export Annual Classification

For each year:
- Load Samples.
- Classify LULC.
- Exports classification.

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


// ========================
// Export to Asset
// ========================

var stable_name = territory_name + '_ANNUAL_MAP_{region_id}_{version}'
    .replace('{region_id}', region_id)
    .replace('{version}', output_version);

Export.image.toAsset({
    image: classified_stack_list,
    description: classified_stack_list,
    assetId: output_asset + '/' + stable_name,
    scale: 30,
    pyramidingPolicy: {
        '.default': 'sample'
    },
    maxPixels: 1e13,
    region: selected_region
});
```
---

