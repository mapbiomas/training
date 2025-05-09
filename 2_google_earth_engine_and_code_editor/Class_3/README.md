# Class 3 - Classification using Random Forest

# Concepts
**Random Forest**: Random Forest is a supervised classifier, made up of decision trees, which uses statistical concepts such as **randomness** and **majority** decision, to add more flexibility to the classifier.

<p align="center">
    <img src="./Assets/random-forest.jpeg" alt="drawing" width="500"/>
</p>

If you want more details, check this Youtube Video: [StatQuest - Random Forest](https://youtu.be/J4Wdy0Wc_xQ)

**Variability**: Generally speaking, variability is how spread out or closely clustered a set of data is. In this sense, when capturing samples to train a supervised algorithm, the variability concept must always be in our minds. Let's think of beaches along a coastline; 

A beach is most often a white and shiny sand surface, but that is not always true. Along the US or Brazil coasts, there are variations of this pattern. The geochemistry of sediments, humidity levels, and geological origin are all variables that influence the beach's spectral patterns.  A good classifier must be capable of capturing such variability.

# 2. Classification using Random Forest

In this section, we will cover how to load an image, collect samples, train a Random Forest model, and perform land cover classification.

## 2.1. Load data from asset

### 2.1.1. Load the mosaic as an ee.Image

Use `ee.Image()` function to load the image mosaic.

```javascript
// Choose an image asset id
var imageId = "projects/mapbiomas-suriname/assets/mosaic-2024";

// Load as an image
var mosaic = ee.Image(imageId);

// prints the collection structure
print('Mosaic:', mosaic);
```

### 2.2. Add mosaic to map
```javascript
// Set the visualization parameters
var visParams = {
    bands: ['SR_B6_median','SR_B5_median','SR_B4_median'],
    gain: [0.08,0.06,0.2]
};

// Add image to map
Map.addLayer(mosaic, visParams, 'Mosaic');

// Zoom into the image
Map.centerObject(mosaic, 9);
```
![load image](./Assets/load-image.png)
[Link](https://code.earthengine.google.com/f4fd395fee6b2e8e8d1cac0718d62f3f)

## 2.2. Collect manual samples

In this step, we will manually collect samples for the classification process. Using the code editor's shape editing tool, we will draw polygons representing each class and import them as a FeatureCollection

### 2.2.1. Create a feature collection

In this example, we will classify three land cover classes: `vegetation`, `notVegetation`, and `water`. To achieve this, we need to collect samples for each class. Using the shape editing tool in the code editor ![edit-tool](./Assets/edit-tool.png), we will create three sets of polygons and import them as a FeatureCollection. Each set of geometries will also be assigned a name. 

The script is designed to accept the following class names: `vegetation`, `notVegetation`, and `water`. For each category, a property called class will be added, with values of 1, 2, or 3 corresponding to vegetation, notVegetation, and water, respectively. You can assign a reference color to each class. See the figure below:

![load image](./Assets/create-feature-collection.png)

Sample collection results in a set of polygons similar to what we see in the next figure:

![samples](./Assets/samples.png)
[Link](https://code.earthengine.google.com/ec0fb9fe4cff4f69b80a0a99c10f673e)

## 2.3. Generate random points

After collecting the samples, the next step is to generate random points within these regions. Proper distribution of the sampling polygons, combined with the random placement of points within them, ensures better representation of class variability. In this section, we introduce a function to generate random points within the previously defined polygons.

```javascript
// Create a function to collect random point inside the polygons
var generatePoints = function(polygons, nPoints){
    
    // Generate N random points inside the polygons
    var points = ee.FeatureCollection.randomPoints(polygons, nPoints);
    
    // Get the class value propertie
    var classValue = polygons.first().get('class');
    
    // Iterate over points and assign the class value
    points = points.map(
        function(point){
            return point.set('class', classValue);
        }
    );
    
    return points;
};
```

Then, we use this function to collect the points in each group of polygons created. Note that the function takes two arguments: _polygons_ and _nPoints_. These arguments are the drawn polygons and the number of points we want to collect.

There are other, more accurate ways to define the number of points to be collected. For example, we can determine the size of the set of points using the proportion of the known area of your region of interest (ROI) as a reference. However, the purpose of this tutorial is to demonstrate an introductory approach. For simplicity, we empirically define 100 points for vegetation, 100 points for notVegetation, and 50 points for water.

```javascript
// Collect random points inside your polygons
var vegetationPoints = generatePoints(vegetation, 100);

var notVegetationPoints = generatePoints(notVegetation, 100);

var waterPoints = generatePoints(water, 50);
```

To use acquired points/samples as training data, it is necessary to join the three sets in a single collection.

```javascript
// Merge all samples into a featureCollection
var samples = vegetationPoints.merge(notVegetationPoints).merge(waterPoints);

print(samples);

Map.addLayer(samples.filter(ee.Filter.eq('class', 1)), {color: '#005b2b'}, 'samples');
Map.addLayer(samples.filter(ee.Filter.eq('class', 2)), {color: '#fff104'}, 'samples');
Map.addLayer(samples.filter(ee.Filter.eq('class', 3)), {color: '#1488ff'}, 'samples');
```
![samples](./Assets/generate-random-points.png)
[Link](https://code.earthengine.google.com/5dd147661fd363d47970d49f8eabd9bd)

## 2.4. Collect the spectral information

Once we have the samples for the defined classes, the next step is to extract the spectral information from their pixels.

```javascript
// Collect the spectral information to get the trained samples
var trainedSamples = mosaic.reduceRegions({
    'collection': samples, 
    'reducer': ee.Reducer.first(), 
    'scale': 30,
  });

trainedSamples = trainedSamples.filter(ee.Filter.notNull(['SR_B2_max']));

print(trainedSamples);
```

:heavy_exclamation_mark: Now check the console, and besides the property `class`, the points/samples are presenting the pixel value of each band.

<p align="center">
    <img src="./Assets/trained-samples.png" alt="drawing" width="400"/>
</p>

[Link](https://code.earthengine.google.com/2fa841a3f02abe28dfe7d881592a338d)

## 2.5. Training the Random Forest classifier

We will use the `ee.Classifier.smileRandomForest()` function to configure our Random Forest model. According to the documentation, this function allows us to set the following parameters:

**Arguments:**
- **numberOfTrees (Integer)**: The number of decision trees to create.
- **variablesPerSplit (Integer, default: null)**: The number of variables per split. If unspecified, uses the square root of the number of variables.
- **minLeafPopulation (Integer, default: 1)**: Only create nodes whose training set contains at least this many points.
- **bagFraction (Float, default: 0.5)**: The fraction of input to bag per tree.
- **maxNodes (Integer, default: null)**: The maximum number of leaf nodes in each tree. If unspecified, defaults to no limit.
- **seed (Integer, default: 0)**: The randomization seed.

Vamos configurar apenas a variável `numberOfTrees` neste exercício.

```javascript
// Set up the Random Forest classifier
var classifier = ee.Classifier.smileRandomForest({
    'numberOfTrees': 50
});
```

Our model is configured, but we still need to train it with the sample points we selected. In this step, we use the `train()` function and will receive at least three arguments: `features`, `classProperties` and `inputProperties`. In `features`, we insert the variable `trainedSamples` that stores our points containing the class value and the pixel value in all bands. We define `classProperties` equal to 'class', because it is the property that stores the point's class number value. Finally, we insert in `inputProperties` a list with the names of the bands that we will use to train the classifier. We are using all the median, minimum, and maximum bands, but feel free to test the combination you want. There is a more robust method to define each band's relevance within the Random Forest training model. Let's speak of attribute/band relevance in future opportunities! That's all for today!

Our model is configured, but we still need to train it using the sample points we collected. For this step, we use the `train()` function, which requires at least three arguments: `features`, `classProperty`, and `inputProperties`.

* In `features`, we pass the variable `trainedSamples`, which contains our points along with their class values and pixel values for all bands.
* For `classProperty`, we set it to 'class', as this property stores the numerical value representing each point's class.
* Finally, in `inputProperties`, we provide a list of band names that will be used to train the classifier. In this example, we are using all the median, minimum, and maximum bands, but feel free to experiment with different combinations.
There are more advanced methods to evaluate the importance of each band in the Random Forest training process. We’ll explore band/attribute relevance in future discussions.

```javascript
// Training the classifier
classifier = classifier.train({
    'features': trainedSamples, 
    'classProperty': 'class', 
    'inputProperties': [
        'SR_B2_max',
        'SR_B2_median',
        'SR_B2_min',
        'SR_B3_max',
        'SR_B3_median',
        'SR_B3_min',
        'SR_B4_max',
        'SR_B4_median',
        'SR_B4_min',
        'SR_B5_max',
        'SR_B5_median',
        'SR_B5_min',
        'SR_B6_max',
        'SR_B6_median',
        'SR_B6_min',
        'SR_B7_max',
        'SR_B7_median',
        'SR_B7_min',
        'evi_max',
        'evi_median',
        'evi_min',
        'ndvi_max',
        'ndvi_median',
        'ndvi_min',
        'ndwi_max',
        'ndwi_median',
        'ndwi_min',
    ]
    });
```

## 2.6. Run the classifier

Para executar a classificação usamos a função `classify()` e passamos como argumento o modelo Random Forest treinado.

```javascript
// Run the Random Forest classifier
var classification = mosaic.classify(classifier);

// Add classification to map
Map.addLayer(classification, {
        'min': 0,
        'max': 3,
        'palette': ['#ffffff','#005b2b','#fff104','#1488ff'],
        'format': 'png'
    },
    'classification'
);
```

![samples](./Assets/classification.png)
[Link](https://code.earthengine.google.com/765caed56a3c4456333da73f9b18ba2d)

## 2.7. Export classification to asset

```javascript
// Export the classification to your asset
Export.image.toAsset({
    image: classification, 
    description: 'classification-2024', 
    assetId: 'classification-2024', 
    pyramidingPolicy: {'.default': 'sample'}, // use sample for classification data
    region: classification.geometry(), 
    scale: 30, 
    maxPixels: 1e13
});
```

[Link](https://code.earthengine.google.com/2ac1d4e36ccaa4e209703a51b18b5082)

[Previous: Class 2 - Accessing Satellite Images and Creating Mosaics](https://github.com/mapbiomas-brazil/mapbiomas-training/tree/main/MapBiomas_101/Day_2/README.md) | [Next: Class 4 - Spatial filter, Temporal Filter and Area Calculation](https://github.com/mapbiomas/mapbiomas/tree/main/Class_4/README.md)
