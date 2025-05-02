// -- -- -- -- 06_gapFill
// post-processing filter: fill gaps (nodata) with data from previous years
// barbara.silva@ipam.org.br and dhemerson.costa@ipam.org.br
// update for Guyanas and Suriname
// joaquim.pereira@ipam.org.br, emanuel.valero@gaiaamazonas.org


// Set the country biome extent 
var territory_name = 'SURINAME';


// Define region id
var region_id = '1';


// Define input version
var input_version = '5';


// Collection ID and version for the stable map.
var collection_id = 1.0;
var output_version = '5';


// Set the list of years to be filtered
var years = [
    2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007,
    2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015,
    2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023,
];


// Pattern for naming the exported trained samples.
// Use '{year}' as a placeholder to be replaced with each processing year.
// Use '{version}' as a placeholder for the version number.
// Use '{region_id}' to specify the region ID.
// Example: 'SURINAME_1_5' for the classification of region with region_id 1 and input_version 1.
var pattern_name = '{territory_name}_{region_id}_{version}';


// Path for input asset
var input_asset = 'projects/mapbiomas-suriname/assets/LAND-COVER/COLLECTION-1/TRAINING/classification';


// Path for the output asset
var output_asset = 'projects/mapbiomas-suriname/assets/LAND-COVER/COLLECTION-1/TRAINING/classification-ft';


// Set input classification
var input_path = input_asset + '/' + pattern_name
    .replace('{territory_name}', territory_name)
    .replace('{region_id}', region_id)
    .replace('{version}', input_version);


var input_classification = ee.Image(input_path);
print('Input classification', input_classification);


// User defined functions
var applyGapFill = function (image) {

    // apply the gapfill from t0 until tn
    var imageFilledt0tn = bandNames.slice(1)
        .iterate(
            function (bandName, previousImage) {

                var currentImage = image.select(ee.String(bandName));

                previousImage = ee.Image(previousImage);

                currentImage = currentImage.unmask(
                    previousImage.select([0]));

                return currentImage.addBands(previousImage);

            }, ee.Image(imageAllBands.select([bandNames.get(0)]))
        );

    imageFilledt0tn = ee.Image(imageFilledt0tn);

    // apply the gapfill from tn until t0
    var bandNamesReversed = bandNames.reverse();

    var imageFilledtnt0 = bandNamesReversed.slice(1)
        .iterate(
            function (bandName, previousImage) {

                var currentImage = imageFilledt0tn.select(ee.String(bandName));

                previousImage = ee.Image(previousImage);

                currentImage = currentImage.unmask(
                                previousImage.select(previousImage.bandNames().length().subtract(1)));

                return previousImage.addBands(currentImage);

            }, ee.Image(imageFilledt0tn.select([bandNamesReversed.get(0)]))
        );

    imageFilledtnt0 = ee.Image(imageFilledtnt0).select(bandNames);

    return imageFilledtnt0;
};

// Get band names list 
var bandNames = ee.List(
    years.map(
        function (year) {
            return 'classification_' + String(year);
        }
    )
);

// Generate a histogram dictionary of [bandNames, image.bandNames()]
var bandsOccurrence = ee.Dictionary(
    bandNames.cat(input_classification.bandNames()).reduce(ee.Reducer.frequencyHistogram())
);

// Insert a masked band 
var bandsDictionary = bandsOccurrence.map(
    function (key, value) {
        return ee.Image(
            ee.Algorithms.If(
                ee.Number(value).eq(2),
                input_classification.select([key]).byte(),
                ee.Image().rename([key]).byte().updateMask(input_classification.select(0))
            )
        );
    }
);

// Convert dictionary to image
var imageAllBands = ee.Image(
    bandNames.iterate(
        function (band, image) {
            return ee.Image(image).addBands(bandsDictionary.get(ee.String(band)));
        },
        ee.Image().select()
    )
);

// Apply the gapfill function
var imageFilledtnt0 = applyGapFill(imageAllBands);


// Add filtered image to map
print('Output classification', imageFilledtnt0);
var palette = require('users/mapbiomas/modules:Palettes.js').get('classification8');
var vis = { min: 0, max: 62, palette: palette };
Map.addLayer(input_classification.select(['classification_2022']), vis, 'Input classification');
Map.addLayer(imageFilledtnt0.select('classification_2022'), vis, 'filtered');

// Write metadata
imageFilledtnt0 = imageFilledtnt0
    .set('collection_id', collection_id)
    .set('version', output_version)
    .set('territory', territory_name)
    .set('step', 'gapfill');

// Define output path name
var output_name = pattern_name
    .replace('{territory_name}', territory_name)
    .replace('{region_id}', region_id)
    .replace('{version}', output_version);

// Export as GEE asset
Export.image.toAsset({
    image: imageFilledtnt0,
    description: output_name,
    assetId: output_asset + '/' + output_name,
    pyramidingPolicy: {'.default': 'mode'},
    region: imageFilledtnt0.geometry().bounds(),
    scale: 30,
    maxPixels: 1e13
});