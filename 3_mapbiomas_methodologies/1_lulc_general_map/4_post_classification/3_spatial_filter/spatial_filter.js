// -- -- -- -- 11_spatial
// post-processing filter: eliminate isolated or edge transition pixels, minimum area of 6 pixels
// barbara.silva@ipam.org.br and dhemerson.costa@ipam.org.br
// update for Guyanas and Suriname
// joaquim.pereira@ipam.org.br


// Set the country biome extent 
var territory_name = 'SURINAME';  // Define the name of the territory being processed (e.g., 'SURINAME').

// Define region id
var region_id = '2';  // Define the region ID, which could represent different parts of the territory for separate processing.

// Define input version
var input_version = '5';  // Set the input classification version for the analysis.

// Collection ID and version for the stable map.
var collection_id = 1.0;  // Set the collection ID for the output map (used for version control).
var output_version = '3';  // Define the output version of the processed classification map.

// Set root directory
var root = 'projects/mapbiomas-suriname/assets/MAPBIOMAS-LULC/COLLECTION1/C1-GENERAL-POST/';  // Root path for asset storage in Google Earth Engine.
var out = 'projects/mapbiomas-suriname/assets/MAPBIOMAS-LULC/COLLECTION1/C1-GENERAL-POST/';  // Set the output directory for the processed maps.

// Set the list of years to be filtered
var years = [
    2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015,
    2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023,  // List the years for which the classification maps will be processed.
];

// Import MapBiomas color schema
var vis = {
    'min': 0,
    'max': 62,
    'palette': require('users/mapbiomas/modules:Palettes.js').get('classification8')  // Import a predefined color palette from MapBiomas to visualize the classification.
};

// Pattern for naming the exported trained samples.
// Use '{year}' as a placeholder to be replaced with each processing year.
// Use '{version}' as a placeholder for the version number.
// Use '{region_id}' to specify the region ID.
// Example: 'SURINAME_1_5' for the classification of region with region_id 1 and input_version 1.
var pattern_name = '{territory_name}_{region_id}_{version}';  // Define the naming pattern for exported classification maps based on region, version, and year.

// Path for input asset
var input_asset = 'projects/mapbiomas-suriname/assets/LAND-COVER/COLLECTION-1/TRAINING/classification-ft';  // Path to the input classification data stored in Google Earth Engine.

// Path for the output asset
var output_asset = 'projects/mapbiomas-suriname/assets/LAND-COVER/COLLECTION-1/TRAINING/classification-ft';  // Path to save the output processed classification data.

// Set input classification
var input_path = input_asset + '/' + pattern_name
    .replace('{territory_name}', territory_name)
    .replace('{region_id}', region_id)
    .replace('{version}', input_version);  // Construct the full path to the input classification map for the selected region and version.

var input_classification = ee.Image(input_path);  // Load the input classification image into an Earth Engine Image object.
print('Input classification', input_classification);  // Print the input classification image to the console for verification.

// Plot input version
Map.addLayer(input_classification.select(['classification_2010']), vis, 'input 2010');  // Display the input classification map for 2010 on the map using the color palette.

// Create an empty container to store the filtered results
var filtered = ee.Image([]);  // Initialize an empty image to store the filtered classification maps.

// Set filter size (minimum area for pixels to be considered valid)
var filter_size = 6;  // Set the minimum number of connected pixels to consider as valid (to remove isolated pixels).

// Apply the first sequence of the spatial filter
ee.List.sequence({'start': 2000, 'end': 2023}).getInfo()  // Create a list of years from 2000 to 2023 and loop over each year.
    .forEach(function(year_i) {
        // Compute the focal mode (neighborhood operation) for the classification of the current year.
        var focal_mode = input_classification.select(['classification_' + year_i])
                .unmask(0)  // Replace no-data values with 0 (ensure the region has valid data).
                .focal_mode({'radius': 1, 'kernelType': 'square', 'units': 'pixels'});  // Apply a 3x3 square kernel to compute the mode in the neighborhood of each pixel.

        // Compute the number of connected pixels of the same class
        var connections = input_classification.select(['classification_' + year_i])
                .unmask(0)
                .connectedPixelCount({'maxSize': 100, 'eightConnected': false});  // Count how many connected pixels of the same class are around each pixel.

        // Mask out pixels with fewer than the filter_size number of connected pixels
        var to_mask = focal_mode.updateMask(connections.lte(filter_size));  // Mask out pixels that are isolated (have fewer than 6 connected pixels).

        // Apply the filter by blending the original classification with the mask and reproject the image
        var classification_i = input_classification.select(['classification_' + year_i])
                .blend(to_mask)
                .reproject('EPSG:4326', null, 30);  // Blend the original classification with the filtered result and reproject to a resolution of 30 meters.

        // Stack the filtered classification image into the filtered container
        filtered = filtered.addBands(classification_i.updateMask(classification_i.neq(0)));  // Add the filtered image to the container, masking out no-data pixels.
    });

// Plot first sequence of the spatial filter
Map.addLayer(filtered.select(['classification_2010']), vis, 'filtered 2010 - round 1');  // Plot the filtered classification for 2010 after the first filtering pass.

// Set container for the second sequence of filtering
var container = ee.Image([]);  // Create another empty image container for the second filtering pass.

// Apply the second sequence of the spatial filter (similar to the first one, but using the already filtered image)
ee.List.sequence({'start': 2000, 'end': 2023}).getInfo()
    .forEach(function(year_i) {
        // Compute the focal mode for the current year using the already filtered image
        var focal_mode = filtered.select(['classification_' + year_i])
                .unmask(0)
                .focal_mode({'radius': 1, 'kernelType': 'square', 'units': 'pixels'});

        // Compute the number of connected pixels for the current year
        var connections = filtered.select(['classification_' + year_i])
                .unmask(0)
                .connectedPixelCount({'maxSize': 100, 'eightConnected': false});

        // Mask out pixels with fewer than the filter_size number of connected pixels
        var to_mask = focal_mode.updateMask(connections.lte(filter_size));

        // Apply the filter and reproject the image
        var classification_i = filtered.select(['classification_' + year_i])
                .blend(to_mask)
                .reproject('EPSG:4326', null, 30);

        // Add the filtered image to the container
        container = container.addBands(classification_i.updateMask(classification_i.neq(0)));
    });

// Plot second sequence of the spatial filter
Map.addLayer(container.select(['classification_2010']), vis, 'filtered 2010 - round 2');  // Plot the filtered result for 2010 after the second filtering pass.

// Set container for the final sequence of filtering (filling in blank spaces)
var container2 = ee.Image([]);  // Initialize another container for the final step of filtering (filling blank spaces).

// Apply the final filtering pass to fill zero-value pixels (blank regions)
ee.List.sequence({'start': 2000, 'end': 2023}).getInfo()
    .forEach(function(year_i) {
        // Compute the focal mode with an extended kernel to fill in the blank spaces
        var focal_mode = container.select(['classification_' + year_i])
                .unmask(0)
                .focal_mode({'radius': 4, 'kernelType': 'square', 'units': 'pixels'});

        // Mask only the blank pixels (pixels with zero value)
        var to_mask = focal_mode.updateMask(container.select(['classification_2010']).unmask(0).eq(0));

        // Apply the filter and reproject the image
        var classification_i = container.select(['classification_' + '2010'])
                .blend(to_mask)
                .reproject('EPSG:4326', null, 30);

        // Add the filtered result to the final container
        container2 = container2.addBands(classification_i.updateMask(classification_i.neq(0)));
    });

// Plot final sequence of the spatial filter
Map.addLayer(container2.select(['classification_2010']), vis, 'final filled');  // Plot the final result after all filtering passes.

// Print the final filtered classification to the console
print('Output classification', container2);

// Write metadata to the output classification
container2 = container2
    .set('collection_id', collection_id)  // Set the collection ID for the output.
    .set('version', output_version)  // Set the version for the output.
    .set('territory', territory_name)  // Set the territory name for metadata.
    .set('step', 'spatial_filter');  // Set the step description for metadata.

// Define output path name based on the naming pattern
var output_name = pattern_name
    .replace('{territory_name}', territory_name)
    .replace('{region_id}', region_id)
    .replace('{version}', output_version);  // Generate the output name based on the region and version.

// Export as GEE asset
Export.image.toAsset({
    image: container2,  // Export the final filtered image.
    description: output_name,  // Set the description for the export.
    assetId: output_asset + '/' + output_name,  // Set the asset ID for the exported image.
    pyramidingPolicy: {'.default': 'mode'},  // Define the pyramiding policy for the export (mode aggregation).
    region: container2.geometry().bounds(),  // Define the region for the export.
    scale: 30,  // Define the spatial resolution of the export.
    maxPixels: 1e13  // Define the maximum number of pixels for the export.
});
