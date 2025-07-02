# Temporal Filters


This script performs a **temporal filter** on annual land cover classification maps using Google Earth Engine (GEE).

---

## Script Overview

A 3-year moving window is used to correct for temporal inconsistencies in the data. Essentially, if a pixel in a given year has a different class from the year before and the year after, it is reclassified to match the class of its temporal neighbors, provided they are consistent with each other.
 The analysis performed is:
  year -1      | EQUAL     | Class 
  central year | DIFFERENT | No class 
  year +1      | EQUAL     | Class
  If the class of the central year differs from the previous (-1) and subsequent (+1) years, the mask has the value 'TRUE' for that pixel.

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
var input_version = '5';
var output_version = '6';

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

### 2.  Apply a 3-year moving window filter
```js
// Set input classification
var input_path = input_asset + '/' + classification_name_pattern
    .replace('{territory_name}', territory_name)
    .replace('{region_id}', region_id)
    .replace('{version}', input_version);

// Load the classification image
var classification = ee.Image(input_path);
print('Input classification', classification);

// Create a list of years, excluding boundary years to avoid errors. Boundary years don't have one year before or one year after.
var anos = ee.List.sequence(1986, 2023)                                                           
                  .map(function(y){                                                     
                        return ee.Number(y).int(); });
                        
// Function to apply a 3-year moving window filter.
var window3y = function (img, classe){
                // Map over the years to process each year individually.
                var classWind = ee.ImageCollection(anos.map(function(ano){
                    ano = ee.Number(ano);
                    var anoStr = ano.format();  
                    var nomeBanda = ee.String('classification_').cat(anoStr);

                    // Get classification bands for the current year, previous year, and next year.
                    var class_Ano = img.select(nomeBanda);
                    var classPrev = img.select(ee.String('classification_').cat(ano.subtract(1).format()));
                    var classNext = img.select(ee.String('classification_').cat(ano.add(1).format()));
                    
                    // Create a mask to identify pixels where the current year matches the target class, but the previous and next years do not.
                    var mask_3 = classNext.eq(classe)
                            .and(class_Ano.neq(classe))
                            .and(classPrev.eq(classe));
       
                    // Remap the previous year's classification, applying the mask.
                    // This handles specific classes in a list, but Water class is not included.
                    mask_3 = classPrev.remap([3,4,12,21,19],   //replace with the region classes
                                             [3,4,12,21,19]).updateMask(mask_3);  //replace with the region classes
                                             
                    // Blend the original classification with the masked classification.
                    var class_corr = class_Ano.blend(mask_3.rename(nomeBanda));
                       
                    return class_corr;
                    
                                                            })).toBands();

        // Get the size of the years list.
        var n = anos.size();
        // Calculate the last year + 1.
        var ultimo = ee.Number(anos.get(n.subtract(1))).add(1);
        print(ultimo);
                    
        // Add the first and last year's classifications.
        var class_pri   = img.select(ee.String('classification_1985')).rename('00_classification_1985');
        var class_ult   = img.select(ee.String('classification_').cat(ultimo))
                             .rename(ee.String('00_classification_').cat(ultimo));
        var class_final = class_pri.addBands(classWind).addBands(class_ult);
        //print('class_final',class_final);
                                                            
        // Function to correct band names.
        var corrIndx  = function (img){
              var indxNames = img.bandNames();
              var bandNames = indxNames.map(function(nome){
                  return ee.String(nome).split('_').slice(1).join('_');
                                                          });
              return img.select(indxNames,bandNames);
                                      };
        // Correct band names and return the processed image.
        var corrigidaFinal = corrIndx(class_final);
       // print('corrigidaFinal',corrigidaFinal);
                return corrigidaFinal;
                
};
```



---

### 3. Apply the 3-year moving window filter 

```js
// Apply the 3-year moving window filter iteratively for different classes.
var filtered = window3y(imgCol,   19);
    filtered = window3y(filtered, 12);
    filtered = window3y(filtered, 4);
    filtered = window3y(filtered,  21);
    filtered = window3y(filtered,  3);
```

---

### 4. Apply the 4-year moving window filter 
```js
// Apply the 4-year moving window filter iteratively for different classes.

var imgCol = filtered
// Create a list of years to process.
var anos = ee.List.sequence(1985,2024)                                                           
                  .map(function(y){                                                     
                        return ee.Number(y).int(); });
                        
// Create a list of odd years to process.
var anosI = ee.List.sequence(2023,1987,-2)                                                           
                  .map(function(y){                                                     
                        return ee.Number(y).int(); });
                        
// Create a list of even years to process.
var anosP = ee.List.sequence(2022,1988,-2)                                                           
                  .map(function(y){                                                     
                        return ee.Number(y).int(); });
print(anosP);
print(anosI);

// Function to correct band names.
var corrIndx  = function (img){
                  var indxNames = img.bandNames();
                  var bandNames = indxNames.map(function(nome){
                          return ee.String(nome).split('_').slice(1).join('_');
                                      });
                    return img.select(indxNames,bandNames);
                              };
                              
// Get the last three years from the 'anos' list.
var n = anos.size(); // list size
var ultimo = ee.Number(anos.get(n.subtract(1)));  // Get the last year.
var penult = ee.Number(anos.get(n.subtract(2)));  // Get the second to last year.
var antpen = ee.Number(anos.get(n.subtract(3)));  // Get the third to last year.

print(ultimo);
print(penult);
print(antpen);

// Function to apply a 4-year temporal filter to the classification for odd years.
var window4y = function(img, classe){
                    
                  // Initialize the output image with the classification of the last year.
                  var class_final = img.select(ee.String('classification_').cat(ultimo)).rename(ee.String('00_classification_').cat(ultimo));

                  // Create an image collection for processing odd years.
                  var classWind = ee.ImageCollection(anosI.map(function(ano){ // anosI = odd years
                    ano = ee.Number(ano);
                    var anoStr = ano.format();  
                    var nomeBanda = ee.String('classification_').cat(anoStr);
                    
                    // Select the classification for the current year.
                    var class_ano = img.select(ee.String('classification_').cat(anoStr));
                    
                    // Create a mask based on the classification values of four consecutive years.
                    var mask_4 = img.select(ee.String('classification_').cat(ano.add(1).format()))     .eq(classe)  // Class for the next year is different from the target class?
                            .and(img.select(ee.String('classification_').cat(anoStr))                   .neq(classe)) // Class for the current year is equal to the target class?
                            .and(img.select(ee.String('classification_').cat(ano.subtract(1).format())) .neq(classe)) // Class for the previous year is equal to the target class?
                            .and(img.select(ee.String('classification_').cat(ano.subtract(2).format())).eq(classe));// Class for two years before is different from the target class?
                            
                    // Apply the mask and remap values.
                    mask_4 = img.select(ee.String('classification_').cat(ano.subtract(2).format())) // Select the band for two years before.
                                .remap([3,4,12,21,19],
                                       [3,4,12,21,19]).updateMask(mask_4);
                    
                    // Blend the original classification with the masked image.
                    var class_corr = class_ano.blend(mask_4.rename(ee.String('classification_').cat(anoStr)));
                                        
                    // Blend the original classification for the previous year with the masked image.
                    var class_corr2 = img.select(ee.String('classification_').cat(ano.subtract(1).format()))
                                         .blend(mask_4.rename(ee.String('classification_').cat(ano.subtract(1).format())));

                    return class_corr.addBands(class_corr2);
                  })).toBands();
                  print(classWind, 'classWind');
                  
                    // Add the processed bands to the final image.
                    class_final = class_final.addBands(classWind).addBands(img.select('classification_1985').rename(ee.String('00_classification_1985')));
                    
                    print(class_final, 'class_final');
                                                                         
                    // Correct the band names and return the result.
                    var corrigidaFinal = corrIndx(class_final);
                    print('corrigidaFinal',corrigidaFinal);
                    return corrigidaFinal;
};

// Apply the 4-year moving window filter (iteratively) for different classes.
// define the classes and the order of classes that the filter should be applied to:
var filtered = window4y(imgCol,   19);
    filtered = window4y(filtered, 21);
    filtered = window4y(filtered, 4);
    filtered = window4y(filtered, 12);
    filtered = window4y(filtered,  3);
    
print('pares',filtered);
Map.addLayer(filtered, vis2, 'filtered1', false);
//var anos = [2020];

// Function to apply a 4-year temporal filter to the classification for even years.
var window4y = function(img, classe){
                  
                  // Initialize the output image with the classification of the last year.
                  var class_final2 = img.select(ee.String('classification_').cat(ultimo)).rename(ee.String('00_classification_').cat(ultimo));
                      // Add the classification band for the second to last year.
                      class_final2 = class_final2.addBands(img.select(ee.String('classification_').cat(penult)).rename(ee.String('00_classification_').cat(penult)));
                      print(class_final2, 'class1');

                  // Create an image collection for processing even years.
                  var classWind = ee.ImageCollection(anosP.map(function(ano){ // anosP = even years
                    ano = ee.Number(ano);
                    var anoStr = ano.format();  
                    var nomeBanda = ee.String('classification_').cat(anoStr);
                    
                    // Select the classification for the current year.
                    var class_ano = img.select(ee.String('classification_').cat(anoStr));

                    // Create a mask for the 4-year window
                    var mask_4 = img.select(ee.String('classification_').cat(ano.add(1).format()))     .eq(classe)
                            .and(img.select(ee.String('classification_').cat(anoStr))                   .neq(classe))
                            .and(img.select(ee.String('classification_').cat(ano.subtract(1).format())) .neq(classe))
                            .and(img.select(ee.String('classification_').cat(ano.subtract(2).format())).eq(classe));
                            
                    // Apply the mask and remap values.
                    mask_4 = img.select(ee.String('classification_').cat(ano.subtract(2).format()))
                                .remap([3,4,12,21,19],
                                       [3,4,12,21,19]).updateMask(mask_4);
                    
                    // Blend the original classification with the masked image.
                    var class_corr = class_ano.blend(mask_4.rename(ee.String('classification_').cat(anoStr)));

                    // Blend the original classification for the previous year with the masked image.
                    var class_corr2 = img.select(ee.String('classification_').cat(ano.subtract(1).format()))
                                         .blend(mask_4.rename(ee.String('classification_').cat(ano.subtract(1).format())));

                    return class_corr.addBands(class_corr2);
                    
                  })).toBands();

                    // Add the processed bands to the final image.
                    class_final2 = class_final2.addBands(classWind).addBands(img.select('classification_1986').rename(ee.String('00_classification_1986')))
                                                                   .addBands(img.select('classification_1985').rename(ee.String('00_classification_1985')));

                    // Correct the band names and return the result.
                    var corrigidaFinal = corrIndx(class_final2);
                    print('corrigidaFinal',corrigidaFinal);
                    return corrigidaFinal;
};

// Apply the 4-year moving window filter (iteratively) for different classes.
filtered = window4y(filtered, 19);
filtered = window4y(filtered, 21);
filtered = window4y(filtered, 4);
filtered = window4y(filtered, 12);
filtered = window4y(filtered,  3);
```




---

### 4. Export processed image
```js
// Write metadata to the output classification (important for tracking and exporting)
filtered = filtered 
    .set('description', classification_version_description.join('\n'))
    .set('collection_id', collection_id)
    .set('version', output_version)
    .set('territory', territory_name)
    .set('step', 'temporal_filter');

// Define output path name based on the naming pattern
var output_name = classification_name_pattern
    .replace('{territory_name}', territory_name)
    .replace('{region_id}', region_id)
    .replace('{version}', output_version);

// Export the processed classification image as a GEE asset
Export.image.toAsset({
    image: classification_filtered,
    description: output_name,
    assetId: output_asset + '/' + output_name,
    pyramidingPolicy: {'.default': 'sample'},
    region: classification.geometry().bounds(),
    scale: 30,
    maxPixels: 1e13
});
```
