/**
 * @overview
 * 
 * This script processes Landsat 8 Surface Reflectance (SR) data for a defined year, 
 * including cloud masking, band scaling, and the calculation of key vegetation 
 * and water indices. The workflow involves:
 * 
 * - Filtering Landsat 8 SR data based on region of interest (ROI) and date range.
 * - Masking cloud, shadow, and cloud-edge pixels.
 * - Scaling optical and thermal bands to reflectance and temperature values.
 * - Calculating vegetation and water indices, such as NDVI, NDWI, and EVI.
 * - Generating median, minimum, and maximum mosaics of the selected collection.
 * - Visualizing the results using NDVI and false-color composites.
 * - Exporting the final mosaic to an Earth Engine asset for further analysis.
 * 
 * The script utilizes the Earth Engine API to process the imagery and export the 
 * results in a specified format for further analysis.
 * 
 * @author João Siqueira, Joaquim Pereira, Júlia Cansado
 * @date November 2024
 * 
 * @license
 * Licensed under the Creative Commons Attribution-NonCommercial 4.0 International 
 * (CC BY-NC 4.0) License.
 * 
 * You may copy, modify, distribute, and perform the work, provided that the usage 
 * is non-commercial and you give appropriate credit to the authors.
 * 
 * For more details, visit: https://creativecommons.org/licenses/by-nc/4.0/
 */



// Create a Landsat 8 surface reflectance collection, filter by location and date
// Landsat 8 Surface Reflectance collection ID
var collectionId = "LANDSAT/LC08/C02/T1_L2"; 

// Create an image collection filtered by the region of interest (ROI) and a specific date range.
var collection = ee.ImageCollection(collectionId)
    .filter(ee.Filter.bounds(roi))                        // Filter collection by region of interest (ROI).
    .filter(ee.Filter.date('2024-01-01', '2024-12-31')); // Filter collection by date range (year 2024).

// Print the structure of the filtered collection to the console.
print('Initial collection:', collection);

// Filter images with less than 50% of cloud cover
collection = collection
    .filter(ee.Filter.lt('CLOUD_COVER', 50));

// prints the collection structure
print('Images with less than 50% of cloud cover:', collection);

/**
 * @name
 *      applyScaleFactors
 * @description
 *      Applies scaling factors to optical and thermal bands in an image.
 * @argument
 *      ee.Image - An image containing SR_B.* (optical bands) and ST_B.* (thermal bands).
 * @returns
 *      ee.Image - The input image with scaled optical and thermal bands.
 */
function applyScaleFactors(image) {
    // Select all optical bands (e.g., surface reflectance bands starting with 'SR_B.*')
    // and apply scaling factors to convert them to reflectance values.
    var opticalBands = image.select('SR_B.')
        .multiply(0.0000275)  // Scale factor for surface reflectance.
        .add(-0.2)            // Offset for reflectance.
        .multiply(10000);     // Re-scale to integer values for visualization.
    
    // Select all thermal bands (e.g., surface temperature bands starting with 'ST_B.*')
    // and apply scaling factors to convert them to temperature in Kelvin.
    var thermalBands = image.select('ST_B.*')
        .multiply(0.00341802) // Scale factor for surface temperature.
        .add(149.0);          // Offset for temperature in Kelvin.
    
    // Add the scaled optical bands back to the image, replacing the original bands.
    // The 'null' argument indicates no renaming, and 'true' ensures replacement.
    return image.addBands(opticalBands, null, true)
                .addBands(thermalBands, null, true);
}

// Apply the scaling function to each image in the collection.
collection = collection.map(applyScaleFactors);

// Print the re-scaled image collection to verify the results.
print('Images reescaled:', collection);

// Define the list of band names to be selected from each image in the collection.
var bandNames = [
    'SR_B2',   // Blue band
    'SR_B3',   // Green band
    'SR_B4',   // Red band
    'SR_B5',   // Near-infrared band
    'SR_B6',   // SWIR1 band
    'SR_B7',   // SWIR2 band
    'QA_PIXEL' // Quality band
];

// Select the specified bands from the collection.
collection = collection.select(bandNames); // Only retains the bands in 'bandNames'.

// Print the structure of the collection after selecting the bands to the console for verification.
print('Images with selected bands:', collection);

// Set a visualization parameters object
var visParams = {
    bands: ['SR_B6', 'SR_B5', 'SR_B4'],
    gain: [0.08,0.06,0.2]
};

// Add collection to map
Map.addLayer(collection, visParams, 'collection');

/**
 * @name
 *      cloudMasking
 * @description
 *      Removes clouds and shadows using the pixel_qa band
 * @argument
 *      {ee.Image} image with QA_PIXEL band
 * @returns
 *      {ee.Image} image without clouds
 */
var cloudMasking = function (image) {

    var qaBand = image.select(['QA_PIXEL']);

    // Extract specific bits using bitwise shift (>>)
    var cloud = qaBand.rightShift(3).bitwiseAnd(1).not();     // Cloud (Bit 3)
    var cloudEdge = qaBand.rightShift(1).bitwiseAnd(1).not(); // Dilated Cloud (Bit 1)
    var shadow = qaBand.rightShift(4).bitwiseAnd(1).not();    // Cloud Shadow (Bit 4)
    
    // Apply masks
    image = image.updateMask(cloud);
    image = image.updateMask(cloudEdge);
    image = image.updateMask(shadow);
    
    return image;
};

// Apply the cloudMasking function to each image in the collection.
// This function masks clouds and cirrus clouds in the images.
var collectionWithoutClouds = collection.map(cloudMasking);

// Add the cloud-free image collection to the map.
// 'visParams' specifies visualization parameters (e.g., bands, min/max values).
// The third parameter is the label displayed in the Layers panel.
Map.addLayer(collectionWithoutClouds, visParams, 'collection without clouds');

// Print details of the cloud-free collection to the console.
// This includes metadata such as the number of images and their properties.
print('Collection without clouds:', collectionWithoutClouds);

/**
 * @name
 *      computeNDVI
 * @description
 *      Calculates the Normalized Difference Vegetation Index (NDVI).
 *      NDVI is an indicator of vegetation health and greenness.
 * @param 
 *      {ee.Image} image - The input image containing bands SR_B5 (NIR) and SR_B4 (Red).
 * @returns 
 *      {ee.Image} - The input image with an additional 'ndvi' band.
 */
var computeNDVI = function (image) {
    // NDVI formula: (NIR - Red) / (NIR + Red)
    var exp = '( b("SR_B5") - b("SR_B4") ) / ( b("SR_B5") + b("SR_B4") )';
    
    // Calculate NDVI and rename the band to 'ndvi'.
    var ndvi = image.expression(exp).rename("ndvi");
    
    // Add the NDVI band to the image and return.
    return image.addBands(ndvi);
};

/**
 * @name
 *      computeNDWI
 * @description
 *      Calculates the Normalized Difference Water Index (NDWI).
 *      NDWI is used to highlight water bodies.
 * @param 
 *      {ee.Image} image - The input image containing bands SR_B5 (NIR) and SR_B6 (SWIR1).
 * @returns 
 *       {ee.Image} - The input image with an additional 'ndwi' band.
 */
var computeNDWI = function (image) {
    // NDWI formula: (NIR - SWIR1) / (NIR + SWIR1)
    var exp = 'float(b("SR_B5") - b("SR_B6"))/(b("SR_B5") + b("SR_B6"))';

    // Calculate NDWI and rename the band to 'ndwi'.
    var ndwi = image.expression(exp).rename("ndwi");

    // Add the NDWI band to the image and return.
    return image.addBands(ndwi); 
};

/**
 * @name
 *      computeEVI
 * @description
 *      Calculates the Enhanced Vegetation Index (EVI).
 *      EVI is used to quantify vegetation by reducing atmospheric and soil-related noise.
 * @param 
 *      {ee.Image} image - The input image containing bands SR_B5 (NIR), SR_B4 (Red), and SR_B2 (Blue).
 * @returns 
 *      {ee.Image} - The input image with an additional 'evi' band.
 */
var computeEVI = function (image) {
    // EVI formula: 2.5 * ((NIR - Red) / (NIR + 6 * Red - 7.5 * Blue + 1))
    var exp = '2.5 * ((b("SR_B5") - b("SR_B4")) / (b("SR_B5") + 6 * b("SR_B4") - 7.5 * b("SR_B2") + 1))';

    // Calculate EVI and rename the band to 'evi'.
    var evi = image.expression(exp).rename("evi");

    // Add the EVI band to the image and return.
    return image.addBands(evi);
};

// Apply the computeNDVI, computeNDWI, and computeEVI functions to each image in the collection.
var collectionWithIndexes = collectionWithoutClouds
    .map(computeNDVI) // Adds NDVI index to each image.
    .map(computeNDWI) // Adds NDWI index to each image.
    .map(computeEVI); // Adds EVI index to each image.

/**
 * Visualization parameters for NDVI data.
 * @property {Array} bands    - The band(s) to visualize ('ndvi' in this case).
 * @property {number} min     - Minimum value for visualization.
 * @property {number} max     - Maximum value for visualization.
 * @property {string} palette - Color palette for NDVI visualization.
 * @property {string} format  - Image format (optional, here as 'png').
 */
var visNdvi = {
    bands: ['ndvi'],                 // NDVI band for visualization.
    min: 0,                          // Minimum NDVI value for visualization.
    max: 1,                          // Maximum NDVI value for visualization.
    palette: 'ff0000,ffff00,00aa00', // Gradient from red (low NDVI) to green (high NDVI).
    format: 'png'                    // Optional image format.
};

// Add the collection with indexes (NDVI visualization) to the map.
Map.addLayer(collectionWithIndexes, visNdvi, 'collection with indexes');

// Print the collection with added indexes to the console for verification.
print('Collection with indexes:', collectionWithIndexes);

// Generate median, minimum, and maximum mosaics from the image collection.
var median = collectionWithIndexes.reduce(ee.Reducer.median()); // Computes the median value for each pixel across all images in the collection.
var minimum = collectionWithIndexes.reduce(ee.Reducer.min());   // Computes the minimum value for each pixel across all images in the collection.
var maximum = collectionWithIndexes.reduce(ee.Reducer.max());   // Computes the maximum value for each pixel across all images in the collection.

// Print the resulting mosaics to verify.
print('Median Mosaic:', median);
print('Minimum Mosaic:', minimum);
print('Maximum Mosaic:', maximum);

// Merge the median, minimum, and maximum mosaics into a single image.
var mosaic = median.addBands(minimum).addBands(maximum);

/**
 * Visualization parameters for NDVI median mosaic.
 * @property {Array} bands    - The band(s) to visualize ('ndvi_median' in this case).
 * @property {number} min     - Minimum value for visualization.
 * @property {number} max     - Maximum value for visualization.
 * @property {string} palette - Color palette for NDVI visualization.
 * @property {string} format  - Image format (optional, here as 'png').
 */
var visNdvi = {
    bands: ['ndvi_median'],          // NDVI median band.
    min: 0,                          // Minimum NDVI value for visualization.
    max: 1,                          // Maximum NDVI value for visualization.
    palette: 'ff0000,ffff00,00aa00', // Gradient from red (low NDVI) to green (high NDVI).
    format: 'png'
};

/**
 * Visualization parameters for false color composite.
 * @property {Array} bands  - The band combination for visualization.
 * @property {Array} gain   - Gain values to adjust brightness for each band.
 * @property {number} gamma - Gamma correction for the visualization.
 */
var visFalseColor = {
    bands: ['SR_B6_median', 'SR_B5_median', 'SR_B4_median'], // Near-infrared, red, green bands.
    gain: [0.08, 0.06, 0.2],                                 // Gain values for brightness adjustment.
    gamma: 0.85                                              // Gamma correction factor.
};

// Add the false color visualization of the median mosaic to the map.
Map.addLayer(mosaic, visFalseColor, 'False color');

// Add the NDVI median visualization of the mosaic to the map.
Map.addLayer(mosaic, visNdvi, 'NDVI median mosaic');

// Print the final mosaic to the console for verification.
print('Final mosaic:', mosaic);

// Export the mosaic image to an Earth Engine asset.
Export.image.toAsset({
    image: mosaic,                          // The image to export (in this case, the mosaic variable).
    description: 'mosaic-2024',             // A user-defined description for the export task.
    assetId: 'mosaic-2024',                 // The destination path in the Earth Engine Assets where the image will be saved.
    pyramidingPolicy: {'.default': 'mean'}, // Defines how data is resampled at lower resolutions. 'mean' computes the average.
    region: roi,                            // The region of interest (ROI) to export. Must be a geometry or feature collection.
    scale: 30,                              // The spatial resolution of the output image, in meters per pixel.
    maxPixels: 1e13                         // Maximum number of pixels allowed in the export. Ensure this is large enough for the image size.
});
