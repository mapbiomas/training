# Gap Fill Script for Land Cover Classification

This script performs a **temporal gap fill filter** on annual land cover classification maps using Google Earth Engine (GEE). The goal is to fill missing pixel values (`no data`) by using valid values from previous and subsequent years.

---

## Script Overview

The script processes classification maps by applying both **forward fill** (using the previous year) and **backward fill** (using the following year) strategies. The result is a more complete, temporally consistent dataset.

---
  
```js
////*************************************************************
// Do not Change from these lines
////*************************************************************

// Import the palettes module
var palettes = require('users/mapbiomas/modules:Palettes.js');

// Define the palettes for visualization
var vis = {'min': 0,'max': 69,'palette': palettes.get('classification9')};
var vis2 = {'bands':'classification_'+ano , 'min': 0,'max': 69,'palette': palettes.get('classification9')};

// Initialize an empty list for images
var img_col = ee.List([]);

var colecao = ee.Image('projects/mapbiomas-public/assets/brazil/lulc/collection9/mapbiomas_collection90_integration_v1');
Map.addLayer(colecao.select('classification_'+ano), vis, 'LULC Col 9 (LandSat) '+ ano, false);

// Add regions and its classifications to the basemap
Map.addLayer(reg_01.select('classification_'+ano), vis, 'reg_01', false)
Map.addLayer(reg_02.select('classification_'+ano), vis, 'reg_02', false)
Map.addLayer(reg_03.select('classification_'+ano), vis, 'reg_03', false)
Map.addLayer(reg_04.select('classification_'+ano), vis, 'reg_04', false)
Map.addLayer(reg_05.select('classification_'+ano), vis, 'reg_05', false)
Map.addLayer(reg_06.select('classification_'+ano), vis, 'reg_06', false)
Map.addLayer(reg_07.select('classification_'+ano), vis, 'reg_07', false)
Map.addLayer(reg_08.select('classification_'+ano), vis, 'reg_08', false)
Map.addLayer(reg_09.select('classification_'+ano), vis, 'reg_09', false)
Map.addLayer(reg_10.select('classification_'+ano), vis, 'reg_10', false)
Map.addLayer(reg_11.select('classification_'+ano), vis, 'reg_11', false)
Map.addLayer(reg_12.select('classification_'+ano), vis, 'reg_12', false)
Map.addLayer(reg_13.select('classification_'+ano), vis, 'reg_13', false)
Map.addLayer(reg_14.select('classification_'+ano), vis, 'reg_14', false)
Map.addLayer(reg_15.select('classification_'+ano), vis, 'reg_15', false)
Map.addLayer(reg_16.select('classification_'+ano), vis, 'reg_16', false)
Map.addLayer(reg_17.select('classification_'+ano), vis, 'reg_17', false)
Map.addLayer(reg_18.select('classification_'+ano), vis, 'reg_18', false)
Map.addLayer(reg_19.select('classification_'+ano), vis, 'reg_19', false)
Map.addLayer(reg_20.select('classification_'+ano), vis, 'reg_20', false)
Map.addLayer(reg_21.select('classification_'+ano), vis, 'reg_21', false)
Map.addLayer(reg_22.select('classification_'+ano), vis, 'reg_22', false)
Map.addLayer(reg_23.select('classification_'+ano), vis, 'reg_23', false)
Map.addLayer(reg_24.select('classification_'+ano), vis, 'reg_24', false)
Map.addLayer(reg_25.select('classification_'+ano), vis, 'reg_25', false)
Map.addLayer(reg_26.select('classification_'+ano), vis, 'reg_26', false)
Map.addLayer(reg_27.select('classification_'+ano), vis, 'reg_27', false)
Map.addLayer(reg_28.select('classification_'+ano), vis, 'reg_28', false)
Map.addLayer(reg_29.select('classification_'+ano), vis, 'reg_29', false)
Map.addLayer(reg_30.select('classification_'+ano), vis, 'reg_30', false)

Map.addLayer(regioesCollection)

// Define the list of regions and their last versions
var lista_regs =[
                ['reg_10','3'],['reg_09','3'],['reg_01','3'],
                ['reg_02','4'],['reg_03','4'],
                ['reg_06','3'],['reg_07','3'],['reg_08','3'],
                ['reg_11','3'],['reg_12','3'],['reg_13','3'],['reg_14','3'],['reg_15','3'],
                ['reg_16','3'],['reg_17','3'],['reg_18','3'],['reg_19','3'],['reg_20','3'],
                ['reg_27','4'],['reg_21','4'],
                ['reg_22','3'],['reg_23','3'],
                ['reg_25','3'],['reg_29','3'],
                ['reg_26','3'],['reg_28','3'],['reg_30','3'],
                ['reg_04','4'],['reg_05','4'],['reg_24','3']
                ];
  
// Define the seed and input version
var seed = 1;
//var versao_in = '1';

// Loop through the regions and add their images to the list
for (var i_reg=0;i_reg<lista_regs.length; i_reg++){
  var regiaoList = lista_regs[i_reg];
  var regiaoID = regiaoList[0];
  var reg_vers = regiaoList[1];
  
//  print(regiaoID);
//  print(reg_vers);
  //if (regiaoID == 'reg_01') {var versao_in = '20'}
  //else {var versao_in = '1'}

  // Load the image for the current region
  var img = ee.Image(dircol + regiaoID+'-RF85a24_v'+reg_vers+'_seed_'+seed);
  // Add the image to the list
  img_col = img_col.add(img.selfMask());

//reg_30-RF85a23_v1_seed_1
}
print(img_col);

// Create an image collection from the list of images
var img_mosaic = ee.ImageCollection.fromImages(img_col).mosaic();


print(img_mosaic);

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

