MapBiomas Training: Remote Sensing & Google Earth Engine
Welcome to the official repository for MapBiomas Training materials. This space is dedicated to providing high-level educational resources for Remote Sensing (RS) and cloud computing via Google Earth Engine (GEE).

The primary objective of this repository is to share the expertise developed by the MapBiomas network, offering the scripts and logic used to produce our annual Land Use and Land Cover (LULC) collections and supporting the replication of this methodology in other countries and biomes.

🚀 Getting Started
The JavaScript scripts provided in this repository are specifically designed for use within the Google Earth Engine (GEE) Code Editor. To utilize these tools, simply copy the code from the desired .js file and paste it directly into the GEE web interface. These scripts leverage the MapBiomas API and Earth Engine's distributed computing power to perform advanced temporal analysis, allowing for seamless replication of the environmental metrics described in this documentation.

📚 Repository Content
This repository is organized into modules that cover the entire workflow of a MapBiomas-style analysis:

1. Remote Sensing Fundamentals
Introductory materials for those starting with satellite imagery, including pre-processing, atmospheric correction, and spectral signatures.

2. GEE for LULC Mapping
Practical scripts to handle large-scale datasets, including:

Classification Algorithms: Implementation of Random Forest and other machine learning models.

Temporal Filters: Logic to reduce classification "noise" across the time series.

Integration: Merging different thematic maps into a single final coverage product.

3. Advanced LULC Dynamics (Thematic Analysis)
Specialized scripts to extract deep insights from the data, such as:

Class Age: Measures how long a specific land use has persisted.

Transition Dynamics: Calculates the number of changes and land-use "swaps."

Stability & Footprints: Identifies areas that never changed or the historical spatial reach of a class.

Frequency: Temporal recurrence of specific classes over the decades.

🌎 Global Replication
A core mission of MapBiomas is to be an open-source initiative. These materials are designed to be adaptable, helping teams across the Amazon, Chaco, Pampa, and other international regions to implement their own monitoring systems using a proven, peer-reviewed methodology.

🛠️ How to Use
Navigate to the folder containing the script of interest.

Open the .js file and copy the content.

Go to code.earthengine.google.com.

Paste the code and click Run.

Note: Ensure you have access to the necessary MapBiomas Assets or update the asset paths to your local data.

🤝 Contributions and Support
The MapBiomas network is collaborative. If you find a bug or have a suggestion for improvement in the training scripts, please open an Issue or submit a Pull Request.

For more information about our methodology and data, visit mapbiomas.org.
