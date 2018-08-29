# TechEd 2018

## Generate Data Airport and Route Data for the Space Flight Data Model

**THIS APP IS DESIGNED TO RUN FROM YOUR LOCAL MACHINE, *NOT* IN THE CLOUD!**

Unfortunately, the data supplied by the OpenFlights.org source files is not entirely consistent, and if the data is not cleaned up, the HANA database will throw up errors when creating graphs and calculation views.

This NodeJS app generates consistent versions of the files `airport.csv` and `earthroute.csv` suitable for the TechEd 2018 Space Travel Agency data model.

Once generated, the `airports.csv` and `earthroutes.csv` files must be uploaded into the Web IDE project from which the HANA database is defined and loaded.

## Operation

1. Clone this repo to a local directory
1. Open a terminal and change into that local directory
1. Install using `npm install`
1. Ensure that file `extra_airports.csv` contains data for the required airports that OpenFlights.org does ***not*** know about
1. If running within an intranet, ensure that the NodeJS proxy settings are correct for external network access
1. Run `node app.js`
1. The files `airlines.csv` and `earthroutes.csv` will be generated and appear in the local directory

## Functionality

This app performs the following functionality:

1. [airports.dat](https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat) and [routes.dat](https://raw.githubusercontent.com/jpatokal/openflights/master/data/routes.dat) are downloaded from <https://OpenFlights.org>
1. `routes.dat` is scanned to obtain a list of unique airport location codes.  
   Only the 3-character IATA location code is considered.  The 4-character ICAO location code is not used here (with hindsight, it would have been better to use both types of location code, but anyway...)
1. For each location code referenced in `routes.dat`, check that `airports.dat` contains a corresponding entry for that airport
1. If `routes.dat` references an airport that is not listed in `airports.dat`, then use OpenFlights.org's API to request the missing information
1. The OpenFlights.org API always returns a JSON object and HTTP 200, even if no data can be found for the requested airport.  In the returned JSON object, the `airports` array will contain zero or more elements
    1. If the `airports` array contains 1 or more elements, arbitrarily select the first element and add it to our list of airports
    1. If the `airports` array is empty, then OpenFlights.org knows nothing about this airport.  In this case, this missing data can be supplied by manually entering it into the `extra_airports.csv` file
    1. If the airport data is also missing from `extra_airports.csv`, then we genuinely have no information about this airport
1. Ensure our data is consistent by removing all reference to unknown airports from both our list of routes and airports.
1. Output these arrays as CSV files using the structure required by the TechEd data model

## IMPORTANT
The file `extra_airports.csv` contains manually defined airport information to fill in the gaps in the data supplied by OpenFlights.org.  If you delete this file or remove any of its entries, then these airports will be considered missing, and all the routes between them will be deleted from `earthroutes.csv`.

