# Spatial Filters


This script performs a **spatial filter** on annual land cover classification maps using Google Earth Engine (GEE).

---

## Script Overview

A focal mode filter is applied to smooth the classification, aiming to remove small, isolated patches of classification. This is controlled by min_connect_pixel. 
Only pixels with at least this many connected pixels of the same class are retained; others are masked out..

---

### 1. Initial Configuration

```js
// ========================
// Initial Configuration
// ========================

// Define the country or territory name.
// It must match the name used in the training samples and mosaics.
// Use uppercase letters, without spaces or underscores.
// Example: 'SURINAME' for Suriname.
var territory_name = 'SURINAME';

// Define region id
var region_id = '2';

// Collection ID and version for the stable map.
var collection_id = 1.0;
var input_version = '2';
var output_version = '2a';

// List of years to be processed.
var years = [
    2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007,
    2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015,
    2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023,
];

// Pattern for naming the exported trained samples.
// Use '{territory_name}' as a placeholder for the territory name.
// Use '{version}' as a placeholder for the version number.
// Use '{region_id}' to specify the region ID.
// Example: 'SURINAME_1_5' for the classification of region with region_id 1 and input_version 1.
var classification_name_pattern = '{territory_name}_{region_id}_{version}';

// Path for input asset
var input_asset = 'projects/mapbiomas-suriname/assets/LAND-COVER/COLLECTION-1/TRAINING/classification';

// Path for the output asset
var output_asset = 'projects/mapbiomas-suriname/assets/LAND-COVER/COLLECTION-1/TRAINING/classification-ft';

// Description of the classification version.
var classification_version_description = [
    "### Classification Version Description",
    "- **Description**: Apply gap fill filter to improve land cover classification.",
    "- **Classification Version**: {input_version}",
    "- **Filtered Version**: {output_version}",
    "- **Region ID**: {region_id}",
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

// Visualization parameters for the map
var vis = {
    min: 0,
    max: 33,
    palette: palette,
    format: 'png',
};
```
---

### 2. Load Input Classification

```js
// Set input classification
var input_path = input_asset + '/' + classification_name_pattern
    .replace('{territory_name}', territory_name)
    .replace('{region_id}', region_id)
    .replace('{version}', input_version);

// Load the classification image
var classification = ee.Image(input_path);
print('Input classification', classification);

// Index of each year in the list of years
var years_index = ee.List.sequence(0, years.length - 1);
```

---

### 3. Gap Fill Functions
