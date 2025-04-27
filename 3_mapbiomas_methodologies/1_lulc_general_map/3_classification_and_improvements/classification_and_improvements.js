// ========================
// Initial Configuration
// ========================

// Define the country or territory name
// This should match the name used in the training samples and mosaics
// The name should be in uppercase and without spaces or separated by underscores
// For example, 'SURINAME' for Suriname
var territory_name = 'SURINAME';

// Folder containing the training samples
var trained_samples_folder = 'projects/mapbiomas-suriname/assets/LAND-COVER/TRAINING/SAMPLES/STABLE-1';

// Pattern for sample file names
// The pattern should include a placeholder for the year, e.g., 'suriname_training_samples_{year}_1'
// The placeholder will be replaced with the actual year during processing
// For example, 'suriname_training_samples_2000_1' for the year 2000
var trained_samples_pattern = 'suriname_training_samples_{year}_1';

// Annual mosaics for the territory
var mosaics_asset = 'projects/mapbiomas-mosaics/assets/SURINAME/mosaics-1';

// Output asset for the stable classification map
var output_asset = 'projects/mapbiomas-suriname/assets/LAND-COVER/TRAINING/stable';

// Collection ID and version of the stable map
var collection_id = 1.0;
var output_version = '1';


var vis_landsat = { 'bands': 'swir1_median,nir_median,red_median', 'gain': '0.08,0.06,0.2', 'gamma': 0.5 };

var get_mosaic = require('users/marcosrosaUSP/MapBiomas_International_Training:mosaics/01_monthly_mosaics_v1');

var year = '2000'
var dateStart = year + '-01-01'
var dateEnd = year + '-12-31'
var Landsat_annual_mosaic = get_mosaic.getMosaic(year, dateStart, dateEnd, region_limit, territory_name, version)
Map.addLayer(Landsat_annual_mosaic, vis_landsat, 'Landsat Mosaic ' + year, true);


var year = '2024'
var dateStart = year + '-01-01'
var dateEnd = year + '-12-31'
var Landsat_annual_mosaic = get_mosaic.getMosaic(year, dateStart, dateEnd, region_limit, territory_name, version)
Map.addLayer(Landsat_annual_mosaic, vis_landsat, 'Landsat Mosaic ' + year, true);


// Create stable samples
//'projects/ee-marcosrosausp/assets/India/India-STABLE-MAP-reg-1-1''
var assetStable = asset_in + territory_name + '-STABLE-MAP-reg-' + regionId.toString() + '-' + version;
var stable = ee.Image(assetStable).rename('class');
Map.addLayer(stable, { 'min': 1, 'max': 5, 'palette': ['#0ddf06', '#98ff00', '#d94fff', '#ff2d1c', '#00ffff'], 'format': 'png' }, 'Stable', true);

var nSamplesPerClass = [
    { 'class_id': 1, 'n_samples': 500 },
    { 'class_id': 2, 'n_samples': 300 },
    { 'class_id': 3, 'n_samples': 500 },
    { 'class_id': 4, 'n_samples': 10 },
    { 'class_id': 5, 'n_samples': 10 },
];

var classValues = nSamplesPerClass.map(
    function (item) {
        return item.class_id;
    }
);

var classPoints = nSamplesPerClass.map(
    function (item) {
        return item.n_samples;
    }
);


var stableSamples = stable.stratifiedSample({
    'numPoints': 0,
    'classBand': 'class',
    'region': region_limit,
    'classValues': classValues,
    'classPoints': classPoints,
    'scale': 30,
    'seed': 1,
    'geometries': true
});

print('Forest_Stable_Samples', stableSamples.filter(ee.Filter.eq('class', 1)));
print('Savanna_Stable_Samples', stableSamples.filter(ee.Filter.eq('class', 2)));
print('Agriculture_Stable_Samples', stableSamples.filter(ee.Filter.eq('class', 3)));
print('Urban_Stable_Samples', stableSamples.filter(ee.Filter.eq('class', 4)));
print('Water_Stable_Samples', stableSamples.filter(ee.Filter.eq('class', 5)));


Map.addLayer(stableSamples.filter(ee.Filter.eq('class', 1)), { color: '#0ddf06' }, 'Forest_Samples', false);
Map.addLayer(stableSamples.filter(ee.Filter.eq('class', 2)), { color: '#98ff00' }, 'Savanna_Samples', false);
Map.addLayer(stableSamples.filter(ee.Filter.eq('class', 3)), { color: '#d94fff' }, 'Agriculture_Samples', false);
Map.addLayer(stableSamples.filter(ee.Filter.eq('class', 4)), { color: '#ff2d1c' }, 'Urban_Samples', false);
Map.addLayer(stableSamples.filter(ee.Filter.eq('class', 5)), { color: '#00ffff' }, 'Water_Samples', false);

//
//// Create a function to collect random point inside the polygons
//var generatePoints = function(polygons, nPoints){
//  // Generate N random points inside the polygons
//  var points = ee.FeatureCollection.randomPoints(polygons, nPoints);
//  // Get the class value propertie
//  var classValue = polygons.first().get('class');
//  // Iterate over points and assign the class value
//  points = points.map(
//      function(point){
//          return point.set('class', classValue);
//      }
//  );
//  return points;
//};
//
//// Collect random points inside your polygons
//var Forest_Samples = generatePoints(forest, 50);
//var Savanna_Samples = generatePoints(savanna, 30);
//var Agriculture_Samples = generatePoints(agriculture, 50);
//var Urban_Samples = generatePoints(urban, 20);
//var Water_Samples = generatePoints(water, 20);
//
//// Merge all samples into a featureCollection
//var trainingSamples = Forest_Samples.merge(Savanna_Samples).merge(Agriculture_Samples).merge(Urban_Samples).merge(Water_Samples);
//
//print('trainingSamples',trainingSamples);
//


// Collect the spectral information to get the trained samples
var trainedSamples = Landsat_annual_mosaic.reduceRegions({
    'collection': stableSamples,
    'reducer': ee.Reducer.first(),
    'scale': 30,
});

trainedSamples = trainedSamples.filter(ee.Filter.notNull(['red_amp']));

//print('Forest_Samples',trainedSamples.filter(ee.Filter.eq('class', 1)).aggregate_mean('ndvi_median'));
//print('Savanna_Samples',trainedSamples.filter(ee.Filter.eq('class', 2)).aggregate_mean('ndvi_median'));
//print('Agriculture_Samples',trainedSamples.filter(ee.Filter.eq('class', 3)).aggregate_mean('ndvi_median'));
//print('Urban_Samples',trainedSamples.filter(ee.Filter.eq('class', 4)).aggregate_mean('ndvi_median'));
//print('Water_Samples',trainedSamples.filter(ee.Filter.eq('class', 5)).aggregate_mean('ndvi_median'));




// Set up the Random Forest classifier
var classifier = ee.Classifier.smileRandomForest({
    'numberOfTrees': 50
});

// Training the classifier
classifier = classifier.train({
    'features': trainedSamples,
    'classProperty': 'class',
    'inputProperties': [
        'red_amp', 'red_median',
        'green_amp', 'green_median',
        'blue_amp', 'blue_median',
        'nir_amp', 'nir_median',
        'swir1_amp', 'swir1_median',
        'swir2_amp', 'swir2_median',
        'evi2_median_dry', 'evi2_median_wet', 'evi2_stdDev',
        'ndvi_median_dry', 'ndvi_median_wet', 'ndvi_stdDev',
        'ndwi_median_dry', 'ndwi_median_wet', 'ndwi_stdDev',
        'slope',
    ]
});


// Run the Random Forest classifier
var classification = Landsat_annual_mosaic.classify(classifier);

// Add classification to map
Map.addLayer(classification, {
    'min': 1,
    'max': 5,
    'palette': ['#0ddf06', '#98ff00', '#d94fff', '#ff2d1c', '#00ffff'],
    'format': 'png'
},
    'LULC RF classification'
);


////Define years to process.
//var years = [
//           2000,2001,2002,2003,2004,2005,2006,2007,2008,2009,
//           2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,
//           2020,2021,2022,2023,2024
//           ];
//
//years.forEach(
//  function (year) {
//    var Landsat_annual_mosaic = get_mosaic.getMosaic(year, year+'-01-01', year+'-12-31', region_limit, territory_name, version)
//    // Collect the spectral information to get the trained samples
//    var trainedSamples = Landsat_annual_mosaic.reduceRegions({
//        'collection': stableSamples, 
//        'reducer': ee.Reducer.first(), 
//        'scale': 30,
//      });
//    trainedSamples = trainedSamples.filter(ee.Filter.notNull(['red_amp']));
//    // Export the training data to an asset.
//    Export.table.toAsset({
//      collection: stableSamples, 
//      description: 'trainedSamples_'+year, 
//      assetId: 'projects/ee-marcosrosausp/assets/trainedSamples_v1_'+year,
//    });
//  }
//)
//
//