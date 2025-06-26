# Merge Regional & Integration

This script performs a **merge** on annual land cover classification regional maps using Google Earth Engine (GEE). 

---

## Script Overview

The script processes merge all  **regional** classification into one map.

---
  
```js
////*************************************************************
// Do not Change from these lines
////*************************************************************

// Import the palettes module
var palettes = require('users/mapbiomas/modules:Palettes.js');

// Define the palettes for visualization
var vis = {'min': 0,'max': 69,'palette': palettes.get('classification9')};
var vis2 = {'bands':'classification_2020' , 'min': 0,'max': 69,'palette': palettes.get('classification9')};

// Initialize an empty list for images
var img_col = ee.List([]);


// Define the list of regions and their last versions
var lista_regs =[
                ['reg_1','1'],['reg_02','1'],['reg_03','1']
                ];
  
// Define the seed and input version
var seed = 1;
//var versao_in = '1';

// Loop through the regions and add their images to the list
for (var i_reg=0;i_reg<lista_regs.length; i_reg++){
  var regiaoList = lista_regs[i_reg];
  var regiaoID = regiaoList[0];
  var reg_vers = regiaoList[1];
  
  // Load the image for the current region
  var img = ee.Image(dircol + regiaoID+'-_v'+reg_vers);
  // Add the image to the list
  img_col = img_col.add(img.selfMask());

}
print(img_col);

// Create an image collection from the list of images
var img_mosaic = ee.ImageCollection.fromImages(img_col).mosaic();
print(img_mosaic);

Map.addLayer(img_mosaic, vis2, 'Merge 2020'); //.mask(bioma250mil_MA)

// Define output path name based on the naming pattern
var output_name = classification_name_pattern
    .replace('{territory_name}', territory_name)
    .replace('{region_id}', region_id)
    .replace('{version}', output_version);

// Export the processed classification image as a GEE asset
Export.image.toAsset({
    image: img_mosaic.toInt8(),
    description: output_name,
    assetId: output_asset + '/' + output_name,
    pyramidingPolicy: { '.default': 'sample' },
    region: img_mosaic.geometry().bounds(),
    scale: 30,
    maxPixels: 1e13
});

```

