// -- -- -- -- 09_frequency
// post-processing filter: stabilize areas of native vegetation that have remained for at least 90% of the data time series
// barbara.silva@ipam.org.br and dhemerson.costa@ipam.org.br
// update for Guyanas and Suriname
// joaquim.pereira@ipam.org.br


// Set the country biome extent 
var territory_name = 'SURINAME';  // Define the name of the country or territory to be processed (Suriname in this case).

// Define region id
var region_id = '1';  // Define the region ID (this could represent a specific area in the country).

// Define input version
var input_version = '5';  // Set the version of the input classification data to be processed (version 3).

// Collection ID and version for the stable map.
var collection_id = 1.0;  // Set the collection ID for the output map (used for versioning).
var output_version = '5a';  // Set the output version of the processed classification map.

// Preview year
var preview_year = 2023;


// Pattern for naming the exported trained samples.
// Use '{year}' as a placeholder to be replaced with each processing year.
// Use '{version}' as a placeholder for the version number.
// Use '{region_id}' to specify the region ID.
// Example: 'SURINAME_1_5' for the classification of region with region_id 1 and input_version 1.
var pattern_name = '{territory_name}_{region_id}_{version}';  // Define the pattern to create output file names based on territory, region, and version.


// Path for input asset
var input_asset = 'projects/mapbiomas-suriname/assets/LAND-COVER/COLLECTION-1/TRAINING/classification-ft';  // Define the path to the input classification data stored in Google Earth Engine assets.

// Path for the output asset
var output_asset = 'projects/mapbiomas-suriname/assets/LAND-COVER/COLLECTION-1/TRAINING/classification-ft';  // Define the path to store the processed output data.

// Set input classification
var input_path = input_asset + '/' + pattern_name
    .replace('{territory_name}', territory_name)  // Replace the placeholders with the appropriate values.
    .replace('{region_id}', region_id)
    .replace('{version}', input_version);  // Construct the full path for the input classification image based on the specified region and version.

var input_classification = ee.Image(input_path);  // Load the input classification image into an Earth Engine Image object.
print('Input classification', input_classification);  // Print the input classification to the console for verification.


/**
 * Import mapbiomas color schema for visualization in the map.
 * This palette is used to display the classified data with appropriate colors for each class.
 */
var vis = {
    min: 0,  // Set the minimum value for the color scale.
    max: 62,  // Set the maximum value for the color scale.
    palette: require('users/mapbiomas/modules:Palettes.js').get('classification8')  // Import a predefined color palette for visualization of the classification.
};


/**
 * Define the function to calculate frequency for native vegetation and stabilize areas
 * that have remained the same (i.e., native vegetation) for at least 90% of the time series.
 */
var filterFreq = function(image) {

    // Expression to calculate the frequency for 24 years
    var exp = '100*((b(0)+b(1)+b(2)+b(3)+b(4)+b(5)+b(6)+b(7)+b(8)+b(9)+b(10)' +
                '+b(11)+b(12)+b(13)+b(14)+b(15)+b(16)+b(17)+b(18)+b(19)+b(20)' +
                '+b(21)+b(22)+b(23))/24)';  // Calculate the frequency by summing pixel values over 24 years and dividing by 24 to get the percentage.

    // Get frequency of different classes of vegetation
    var forest = image.eq(3).expression(exp);  // Calculate frequency for forest class (value 3).
    // var savanna = image.eq(4).expression(exp);  // (Commented out) Calculate frequency for savanna class (value 4).
    var wetland = image.eq(11).expression(exp);  // Calculate frequency for wetland class (value 11).
    var grassland = image.eq(12).expression(exp);  // Calculate frequency for grassland class (value 12).

    // Create a new image where pixels are set to 1 if the native vegetation class was stable (present for at least 90% of the time series)
    var stable_native = ee.Image(0)
        .where(forest  // If the vegetation is forest and has been stable for at least 90% of the time series...
         //.add(savanna)  // (Not used) If savanna class is also stable for at least 90% (commented out).
         .add(wetland)  // If wetland class is stable for at least 90%.
         .add(grassland)  // If grassland class is stable for at least 90%.
         .gte(90), 1);  // Check if the frequency is greater than or equal to 90%, and set to 1 (stable).

    // Visualize the stable native vegetation on the map (not displayed initially).
    Map.addLayer(stable_native.neq(0).selfMask(), {palette: 'darkgreen'}, "stable_native", false);

    // Now, stabilize the native vegetation classes: forest, wetland, and grassland.
    // If the area has been stable (90% of the time), and the frequency threshold for each class is met, set those areas to the respective class.
    var filtered = ee.Image(0).where(stable_native.eq(1).and(forest.gte(75)), 3)  // Set to forest (3) if stable for at least 75% of the time.
                            .where(stable_native.eq(1).and(wetland.gte(60)), 11)  // Set to wetland (11) if stable for at least 60% of the time.
                            //.where(stable_native.eq(1).and(savanna.gt(50)), 4)  // (Commented out) Set to savanna (4) if stable for at least 50% (not used).
                            .where(stable_native.eq(1).and(grassland.gt(50)), 12);  // Set to grassland (12) if stable for at least 50% of the time.

    // Get only the pixels that need to be filtered (i.e., non-zero values).
    filtered = filtered.updateMask(filtered.neq(0));  // Mask out zero values to retain only the pixels that are to be modified.

    // Return the modified image, where the filtered pixels are replaced with the corresponding class values.
    return image.where(filtered, filtered);  // Replace the original pixels with the stabilized ones.

};

// Apply the filter function to the input classification image
var classification_filtered = filterFreq(input_classification);

// Display the filtered classification for the year 2023
Map.addLayer(input_classification.select(['classification_' + preview_year]), vis, 'original');  // Add the filtered classification of the year 2023 to the map.
Map.addLayer(classification_filtered.select(['classification_' + preview_year]), vis, 'filtered');  // Add the filtered classification of the year 2023 to the map.
print('Output classification', classification_filtered);  // Print the output filtered classification to the console for verification.


// Write metadata to the output classification (important for tracking and exporting)
classification_filtered = classification_filtered
    .set('collection_id', collection_id)  // Set the collection ID metadata.
    .set('version', output_version)  // Set the output version metadata.
    .set('territory', territory_name)  // Set the territory metadata (e.g., Suriname).
    .set('step', 'frequency_filter');  // Set the processing step metadata (this is a frequency filter step).

// Define output path name based on the naming pattern
var output_name = pattern_name
    .replace('{territory_name}', territory_name)  // Replace the placeholder for territory name in the output path.
    .replace('{region_id}', region_id)  // Replace the placeholder for region ID.
    .replace('{version}', output_version);  // Replace the placeholder for output version.


// Export the processed classification image as a GEE asset
Export.image.toAsset({
    image: classification_filtered,  // The filtered classification image to be exported.
    description: output_name,  // The description for the exported asset.
    assetId: output_asset + '/' + output_name,  // The asset ID for the exported image in GEE.
    pyramidingPolicy: {'.default': 'mode'},  // Define how the image should be aggregated when exporting (mode aggregation).
    region: classification_filtered.geometry().bounds(),  // Define the region to export (bounds of the filtered image).
    scale: 30,  // Set the spatial resolution for the export (30 meters).
    maxPixels: 1e13  // Set the maximum number of pixels that can be exported (1e13 is a very large number to allow full coverage).
});