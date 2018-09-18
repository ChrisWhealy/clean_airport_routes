# TechEd 2018

## Generate Consistent Airport and Route Data for the Space Flight Data Model

This app generates mutually consistent CSV files for use in the Core Data Services data model used by <https://github.com/SAP/cloud-sample-spaceflight>.

This data is obtained from <https://openflights.org>

Unfortunately, the data supplied by the OpenFlights.org source files is not entirely consistent, and if it is not cleaned up, the HANA database will throw up errors when creating graphs and calculation views.

This NodeJS app generates consistent versions of the files `airport.csv` and `earthroute.csv` suitable for the TechEd 2018 Space Travel Agency data model.

Once generated, the `airports.csv` and `earthroutes.csv` files must be uploaded into the Web IDE project from which the HANA database is defined and loaded.

## Operation

1. Clone this repo to a local directory
1. Open a terminal and change into that local directory
1. Install using `npm install`
1. Ensure that file `extra_airports.csv` contains data for the required airports that OpenFlights.org does ***not*** know about
1. Ensure that file `extra_routes.csv` contains data for the required direct flights that OpenFlights.org does ***not*** know about
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
1. ***Important***  
    The OpenFlights.org API always returns a JSON object and HTTP 200, even if no data can be found for the requested airport!
    
    Therefore, in the returned JSON object, the `airports` array will contain zero or more elements:
    1. If the `airports` array contains 1 or more elements, arbitrarily select the first element and add it to our list of airports
    1. If the `airports` array is empty, then OpenFlights.org knows nothing about this airport.  In this case, this missing data can be supplied by manually entering it into the `extra_airports.csv` file
    1. If the airport data is missing from both the `airports` array in the JSON response and `extra_airports.csv`, then we genuinely have no information about this airport
1. Ensure our data is consistent by removing all reference to unknown airports from both our list of routes and airports.
1. Add the extra information about direct flights found in `extra_routes.csv` into the `clean_routes_csv` array
1. Output these arrays as CSV files using the structure required by the TechEd data model

## IMPORTANT

### File `extra_airports.csv`

The file `extra_airports.csv` contains manually defined airport information to fill in the gaps in the data supplied by OpenFlights.org.  If you delete this file or remove any of its entries, then these airports will be considered missing, and all the routes between missing airports will be deleted from `earthroutes.csv`.

### File `extra_routes.csv`

The file `extra_routes.csv` contains manually information about direct flights flown between missing airports.  It is important to add as much route information as you can, otherwise the HANA graph analysis of this data will shown orphaned vertices (I.E. airports that have no flights in or out of them)

