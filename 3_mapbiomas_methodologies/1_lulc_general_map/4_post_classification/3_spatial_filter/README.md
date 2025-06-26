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
var input_version = '2a';
var output_version = '3';

// List of years to be processed.
var years = [
    1985, 1986, 1987, 1988, 1989, 1990, 1991, 1992,
    1993, 1994, 1995, 1996, 1997, 1998, 1999,
    2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007,
    2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015,
    2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023,
    2024,
];

// Pattern for naming the exported trained samples.
// Use '{territory_name}' as a placeholder for the territory name.
// Use '{version}' as a placeholder for the version number.
// Use '{region_id}' to specify the region ID.
// Example: 'SURINAME_1_5' for the classification of region with region_id 1 and input_version 1.
var classification_name_pattern = '{territory_name}_{region_id}_{version}';

// Path for input asset
var input_asset = 'projects/mapbiomas-suriname/assets/LAND-COVER/COLLECTION-1/TRAINING/classification-ft';

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

// Import the palettes module
var palettes = require('users/mapbiomas/modules:Palettes.js');

// Define the palettes for visualization
var vis = {'min': 0,'max': 69,'palette': palettes.get('classification9'), format: 'png'};
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

### 3. Spatial Filter

// Create a list of years (update here and the rest of the code adjusts automatically).
var years = ee.List.sequence(1985, 2024)                                                           
                  .map(function(y){                                                     
                        return ee.Number(y).int(); });

// Create an image collection by processing each year.
var class_outTotal = ee.ImageCollection(years
                       .map(function(year){
                          // Construct band names dynamically.
                          var anoStr    = ee.Number(year).format();
                          var nomeBanda = ee.String('classification_').cat(anoStr);
                          var connBanda = ee.String('classification_').cat(anoStr).cat('_conn');
                          
                          // Apply a focal mode filter to the classification image.
                          var moda = classREMAP.select(nomeBanda).focalMode(3, 'square', 'pixels')
                          // Filter the mode image by masking just the pixels with less than 6 connected pixels.
                                               .mask(classREMAP.select(connBanda).lte(min_connect_pixel));
                          //Map.addLayer(moda.reproject({crs: 'EPSG:4326',scale: 30}), vis2, 'class_out_'+ano, false);

                          // Blend the original and filtered classifications.
                          var class_out = classREMAP.select(nomeBanda).blend(moda);
                          //Map.addLayer(class_out.reproject({crs: 'EPSG:4326',scale: 30}), vis2, 'class_out_'+ano, false);
                     
                          return class_out;
})).toBands();

// Function to correct band names after 'toBands()'.
var corrIndx  = function (img){
                  var indxNames = img.bandNames();              // creates an ee.List from bands of an ee.Image.
                  var bandNames = indxNames.map(function(nome){ // remove the index created by .toBands().
                          return ee.String(nome).split('_').slice(1).join('_');
                                      });
                                      
                    return img.select(indxNames,bandNames);     // replaces bands with 'XX_' created by .toBands() with clean names.
                              };

// Correct band names and reproject the final classification.
var class_final = corrIndx(class_outTotal).reproject({
                            crs: 'EPSG:4326',
                            scale: 30  // export with 30 m/pixel.
                              });

// Print and add the final classification to the map.
print(class_final);
//Map.setCenter(-47.85706, -21.38321,13);
Map.addLayer(class_final.reproject({
                            crs: 'EPSG:4326',
                            scale: 30  // export with 30 m/pixel.
                              }), vis, 'class_final');
// Map.addLayer(class_out2, vis, 'class_out2');

