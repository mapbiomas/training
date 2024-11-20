// Landsat 8 SR collection id
var collectionId = "LANDSAT/LC08/C02/T1_L2";

// Create a collection filtering by ROI and date
var collection = ee.ImageCollection(collectionId)
    .filterBounds(roi)
    .filterDate('2024-01-01', '2024-12-31');

// prints the collection structure
print('Initial collection:', collection);

// Filter images with less than 50% of cloud cover
collection = collection
    .filterMetadata('CLOUD_COVER', 'less_than', 50);

// prints the collection structure
print('Images with less than 50% of cloud cover:', collection);

/**
 * @name
 *      applyScaleFactors
 * @description
 *      Applies scaling factors
 * @argument
 *      ee.Image Landsat Collection 2
 * @returns
 *      ee.Image Landsat Collection 2 scaled
 */
function applyScaleFactors(image) {
    // Select every optical bands and applies scaling factor
    var opticalBands = image.select('SR_B.')
        .multiply(0.0000275)
        .add(-0.2)
        .multiply(10000);
    
    // Select every thermal bands and applies scaling factor
    var thermalBands = image.select('ST_B.*')
        .multiply(0.00341802)
        .add(149.0);
    
    return image.addBands(opticalBands, null, true)
                .addBands(thermalBands, null, true);
}

// Applies the scale factors function over the collection
collection = collection.map(applyScaleFactors);

print('Images reescaled:', collection);

// Define the band names 
var bandNames = ['SR_B2','SR_B3','SR_B4','SR_B5','SR_B6','SR_B7','QA_PIXEL'];

// Select bands of interest
collection = collection.select(bandNames);

// prints the collection structure
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
 *      ee.Image with QA_PIXEL band
 * @returns
 *      ee.Image without clouds
 */
var cloudMasking = function (image) {

    var qaBand = image.select(['QA_PIXEL']);

    // Extract specific bits using bitwise shift (>>)
    var cloud = qaBand.rightShift(3).bitwiseAnd(1).not(); // Cloud (Bit 3)
    var cloudEdge = qaBand.rightShift(1).bitwiseAnd(1).not(); // Dilated Cloud (Bit 1)
    var shadow = qaBand.rightShift(4).bitwiseAnd(1).not(); // Cloud Shadow (Bit 4)
    
    // Apply masks
    image = image.updateMask(cloud);
    image = image.updateMask(cloudEdge);
    image = image.updateMask(shadow);
    
    return image;
};

var collectionWithoutClouds = collection.map(cloudMasking);

Map.addLayer(collectionWithoutClouds, visParams, 'collection without clouds');

print('Collection without clouds:', collectionWithoutClouds);

/**
 * @name
 *      computeNDVI
 * @description
 *      Calculates NDVI index
 */
var computeNDVI = function (image) {

	var exp = '( b("SR_B5") - b("SR_B4") ) / ( b("SR_B5") + b("SR_B4") )';

	var ndvi = image.expression(exp).rename("ndvi");

	return image.addBands(ndvi);
};

/**
 * @name
 *      computeNDWI
 * @description
 *      Calculates NDWI index
 */
var computeNDWI = function (image) {

	var exp = 'float(b("SR_B5") - b("SR_B6"))/(b("SR_B5") + b("SR_B6"))';

	var ndwi = image.expression(exp).rename("ndwi");

	return image.addBands(ndwi);
};

/**
 * @name
 *      computeEVI
 * @description
 *      Calculates EVI index
 */
var computeEVI = function (image) {

	var exp = '2.5 * ((b("SR_B5") - b("SR_B4")) / (b("SR_B5") + 6 * b("SR_B4") - 7.5 * b("SR_B2") + 1))';

	var evi = image.expression(exp).rename("evi");

	return image.addBands(evi);

};

// For each image, apply the functions computeNDVI, computeNDWI and computeEVI.
var collectionWithIndexes = collectionWithoutClouds
    .map(computeNDVI)
    .map(computeNDWI)
    .map(computeEVI);

// Sets a visualization parameter object to NDVI data
var visNdvi = {
    bands: ['ndvi'],
    min: 0,
    max: 1,
    palette: 'ff0000,ffff00,00aa00',
    format: 'png'
};

Map.addLayer(collectionWithIndexes, visNdvi, 'collection with indexes');

print('collection with indexes:', collectionWithIndexes);

// Generate median, minimum and maximum mosaics.
var median = collectionWithIndexes.reduce(ee.Reducer.median());
var minimum = collectionWithIndexes.reduce(ee.Reducer.min());
var maximum = collectionWithIndexes.reduce(ee.Reducer.max());

// Merges the median, minimum and maximum mosaics
var mosaic = median.addBands(minimum).addBands(maximum);

// Sets a visualization parameter object to NDVI median
var visNdvi = {
    bands: ['ndvi_median'],
    min: 0,
    max: 1,
    palette: 'ff0000,ffff00,00aa00',
    format: 'png'
};

// Sets false color visualization parameter object
var visFalseColor = {
    bands: ['SR_B6_median', 'SR_B5_median', 'SR_B4_median'],
    gain: [0.08, 0.06, 0.2],
    gamma: 0.85
};

// Add median mosaic to map
Map.addLayer(mosaic, visFalseColor, 'False color');
Map.addLayer(mosaic, visNdvi, 'NDVI median mosaic');

print('final mosaic:', mosaic);

// Export the mosaic to your asset
Export.image.toAsset({
    image: mosaic, 
    description: 'mosaic-2024', 
    assetId: 'mosaic-2024', 
    pyramidingPolicy: {'.default': 'mean'}, 
    region: roi, 
    scale: 30, 
    maxPixels: 1e13
});
