# Class 2 - Accessing Satellite Images and Creating Mosaics

# Concepts

**Image Collection**: As straightforward as it could be, it is a collection of images. You may think of it as a pile of images. The Z-axis represents time, X-axis and Y-axis represent the Earth's surface.

<p align="center">
    <img src="./Assets/image-collection.jpeg" alt="drawing" width="350"/>
</p>

**Mosaic**: A mosaic is a combination or merging of two or more images. Any given mosaic can be a multiband or single-band mosaic. The MapBiomas project works with the concept of multiband mosaics.

<p align="center">
    <img src="./Assets/mosaic-2.jpeg" alt="drawing" width="500"/>
</p>

**Landsat Bit Values**: The Landsat satellites are a family of distinct satellite missions. Each family has its digital characteristics, one of which is the 'bit value' QA Bands. The bit values are a digital parameters that can be used to group out specific pixel characteristics. The QA Bit Values will group the Landsat pixels as belonging to.
_Note_: Numerically speaking, any number in our screen is originally a binary number (0 or 1).

### Landsat Surface Reflectance-Derived Spectral Indices Pixel Quality Band: Landsat 8

| **Bit Position** | **Description**                  | **Values**                                                                                                                                      | **Bit Combinations (Binary)** | **Decimal Equivalent** |
|-------------------|----------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------|-------------------------|
| **0**            | *Fill*                          | Identifies fill pixels (no valid data).                                                                                                        | `0`, `1`                      | 0, 1                   |
| **1**            | *Dilated Cloud*                 | Indicates presence of dilated clouds (buffered clouds).                                                                                        | `0`, `1`                      | 0, 1                   |
| **2**            | *Cirrus (high confidence)*      | Indicates presence of high-confidence cirrus clouds.                                                                                           | `0`, `1`                      | 0, 1                   |
| **3**            | *Cloud*                         | Identifies presence of regular clouds.                                                                                                         | `0`, `1`                      | 0, 1                   |
| **4**            | *Cloud Shadow*                  | Indicates presence of cloud shadows.                                                                                                           | `0`, `1`                      | 0, 1                   |
| **5**            | *Snow*                          | Indicates presence of snow.                                                                                                                    | `0`, `1`                      | 0, 1                   |
| **6**            | *Clear*                         | `0`: Clouds (Cloud or Dilated Cloud bits are set). <br> `1`: Clear (Cloud and Dilated Cloud bits are not set).                                 | `0`, `1`                      | 0, 1                   |
| **7**            | *Water*                         | Indicates water pixels.                                                                                                                        | `0`, `1`                      | 0, 1                   |
| **8-9**          | *Cloud Confidence*              | `00`: None <br> `01`: Low confidence <br> `10`: Medium confidence <br> `11`: High confidence.                                                  | `00`, `01`, `10`, `11`        | 0, 1, 2, 3            |
| **10-11**        | *Cloud Shadow Confidence*       | `00`: None <br> `01`: Low confidence <br> `10`: Medium confidence <br> `11`: High confidence.                                                  | `00`, `01`, `10`, `11`        | 0, 1, 2, 3            |
| **12-13**        | *Snow/Ice Confidence*           | `00`: None <br> `01`: Low confidence <br> `10`: Medium confidence <br> `11`: High confidence.                                                  | `00`, `01`, `10`, `11`        | 0, 1, 2, 3            |
| **14-15**        | *Cirrus Confidence*             | `00`: None <br> `01`: Low confidence <br> `10`: Medium confidence <br> `11`: High confidence.                                                  | `00`, `01`, `10`, `11`        | 0, 1, 2, 3            |

**Vegetation and Water Index**: A Vegetation Index (VI) or Water Index (WI) are spectral transformations of two or more bands designed to enhance the contribution of vegetation/water properties in a given satellite data.

<p align="center">
    <img src="./Assets/NDVI-Values-and-Plant-Health.png" alt="drawing" width="500"/>
</p>

# 1. Creating a mosaic

## 1.1 Creating a region of interest (ROI)

For this example, we need to define a region of interest using the geometry editing panel on code editor interface. Open the code editor, click on the "draw a shape" button and draw a polygon anywhere in the planet. Be careful, do not draw a too large extension, try something around 100km x 100km. The processing of large extensions may delay the execution of this tutorial. In this example, we will change the name of the geometry to  `roi`. 

![ROI](./Assets/roi.png)
<!--[Link](https://code.earthengine.google.com/f8bd92103d3e0791a98ce72eae54b0ca)-->

## 1.2 Getting an image collection

```javascript
/**
 * Create a Landsat 8 surface reflectance collection, filter by location and date
 */

// Landsat 8 Surface Reflectance collection ID
var collectionId = "LANDSAT/LC08/C02/T1_L2"; 

// Create an image collection filtered by the region of interest (ROI) and a specific date range.
var collection = ee.ImageCollection(collectionId)
    .filter(ee.Filter.bounds(roi))                        // Filter collection by region of interest (ROI).
    .filter(ee.Filter.date('2024-01-01', '2024-12-31')); // Filter collection by date range (year 2024).

// Print the structure of the filtered collection to the console.
print('Initial collection:', collection);
```
<!--[Link](https://code.earthengine.google.com/f4f98f70b826d49bd19e5c464d734b7f)-->

The result of the filtered collection is shown on the console.

<p align="center">
    <img src="./Assets/console-information.png" alt="drawing" width="500"/>
</p>

## 1.3 Filtering by cloud cover percentage

We can filter the images inside an Image Collection using any information contained in the image's metadata. In this example, we will use the `CLOUD_COVER` property. This property stores the percentage of cloud cover detected by the USGS algorithm.

```javascript
// Filter images with less than 50% of cloud cover
collection = collection
    .filter(ee.Filter.lt('CLOUD_COVER', 50));

// prints the collection structure
print('Images with less than 50% of cloud cover:', collection);
```
<!--[Link](https://code.earthengine.google.com/4afaf3d7f8610d949a86ed642a6155e1)-->

## 1.4 Applying scaling factor

```javascript
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

```
<!--[Link](https://code.earthengine.google.com/82190fe8e6074e42afd3277da6f3479b)-->

## 1.5 Selecting bands

In this example we will use the bands `blue, green, red, nir, swir 1 and swir 2` which are respectively named` B2, B3, B4, B5, B6, B7`. It is necessary to select the quality band also, `pixel_qa`, as it will be used later to remove the clouds and shadows.

```javascript
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
```
<!--[Link](https://code.earthengine.google.com/7a5fa836cb15fe91530900c30ae352db)-->


## 1.6 Adding data to map
Let's take a look in our selection and see how our collection is visually represented. Right now, we still have cloud pixels inside our 'roi'. We can use the `inspector` to check the pixel values of the images. Do your inspection!!

```javascript
// Set a visualization parameters object
var visParams = {
    bands: ['SR_B6', 'SR_B5', 'SR_B4'],
    gain: [0.08,0.06,0.2]
};

// Add collection to map
Map.addLayer(collection, visParams, 'collection');
```
![Add data to map](./Assets/map-add-layer.png)

<!--[Link](https://code.earthengine.google.com/9aef393592ac76082c5608c936cd9efe)-->

## 1.7 Removing clouds and shadows
Here we are going to show a simple way to remove clouds from Landsat images. This technique is very simple and must be combined with other more complex algorithms to generate a better result.

### 1.7.1 Define a cloud masking function

```javascript
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
    var cloud = qaBand.rightShift(3).bitwiseAnd(1).not(); // Cloud (Bit 3)
    var cloudEdge = qaBand.rightShift(1).bitwiseAnd(1).not(); // Dilated Cloud (Bit 1)
    var shadow = qaBand.rightShift(4).bitwiseAnd(1).not(); // Cloud Shadow (Bit 4)
    
    // Apply masks
    image = image.updateMask(cloud);
    image = image.updateMask(cloudEdge);
    image = image.updateMask(shadow);
    
    return image;
};

```
### How It Works?

#### Example: Extraction of Bit 3 (Cloud)
Suppose the value `qaBand = 53248`.

In binary: `53248 = 1101000000000000`

- After `rightShift(3)`: `1101000000000`
- Applying `bitwiseAnd(1)`: Isolates the least significant bit: `0` (no cloud).
- Applying `.not()`: Inverts: `1` (keep).


### 1.7.2 Apply the cloud masking function to each image

```javascript
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

```

![Add data to map](./Assets/collection-without-clouds.png)
<!--[Link](https://code.earthengine.google.com/da0ca4df28c4868b253ae89d31d23df9)-->

## 1.8 Calculate NDVI, EVI and NDWI for each image
### 1.8.1 Defining NDVI, EVI and NDWI functions
```javascript
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

```

### 1.8.2 Apply the functions to each image

```javascript
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
```
![calculate indexes](./Assets/indexes.png)
<!--[Link](https://code.earthengine.google.com/3d676a7c143134d03365db9aaddbe8d9)-->

## 1.9 Make the median, minimum and maximum mosaics

```javascript
// Generate median, minimum, and maximum mosaics from the image collection.
var median = collectionWithIndexes.reduce(ee.Reducer.median()); // Computes the median value for each pixel across all images in the collection.
var minimum = collectionWithIndexes.reduce(ee.Reducer.min());   // Computes the minimum value for each pixel across all images in the collection.
var maximum = collectionWithIndexes.reduce(ee.Reducer.max());   // Computes the maximum value for each pixel across all images in the collection.

// Print the resulting mosaics to verify.
print('Median Mosaic:', median);
print('Minimum Mosaic:', minimum);
print('Maximum Mosaic:', maximum);
```
<p align="center">
    <img src="./Assets/median-scheme.jpeg" alt="drawing" width="500"/>
</p>

<!--[Link](https://code.earthengine.google.com/90268061b7d91c9cf9ef94bd9963f9a2)-->

## 1.10 Make the final mosaic

```javascript
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
```
![Reduce to median](./Assets/median-mosaic.png)
<!--[Link](https://code.earthengine.google.com/c94e177102c39e27d58a48768f793666)-->

## 1.11 Export mosaic to GEE asset

```javascript
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

```
<!--[Link](https://code.earthengine.google.com/eed6fdc8eea16380af8d73d8109161e5)-->

[Previous: Class 1 - Introduction to Google Earth Engine](https://github.com/mapbiomas/training/tree/main/Class_1/README.md) | [Next: Class 3 - Classification using Random Forest](https://github.com/mapbiomas/training/tree/main/Class_3/README.md)

