#!/usr/bin/env node

/***********************************************************************************************************************
 * Data obtained from OpenFlights.org website
 */

const fs = require("fs")

// ---------------------------------------------------------------------------------------------------------------------
// URLS to access raw data from OpenFlights.org
const urls = {
  "api"       : "https://openflights.org/php/apsearch.php"
, "airports"  : "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat"
, "routes"    : "https://raw.githubusercontent.com/jpatokal/openflights/master/data/routes.dat"
, "airlines"  : "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airlines.dat"
, "equipment" : "https://raw.githubusercontent.com/jpatokal/openflights/master/data/planes.dat"
}

// ---------------------------------------------------------------------------------------------------------------------
// Columns names of the raw data CSV files obtained from OpenFlights
const dat_properties = {
  "airports"  : ["id", "name", "city", "country", "iata", "icao", "lat", "lng", "elevation", "tz", "dst", "olson_tz_name", "type", "source"]
, "routes"    : ["airline", "airline_id", "source_airport", "source_airport_id", "destination_airport", "destination_airport_id", "codeshare", "stops", "equipment"]
, "airlines"  : ["id", "name", "alias", "iata", "icao", "callsign", "country", "active"]
, "equipment" : ["name", "iata", "icao"]
}

// ---------------------------------------------------------------------------------------------------------------------
// Mapping between the columns in a raw .dat file and the objects that will later be output as the CSV files used to
// populate the TechEd data model
const csv_properties = {
  "extra_airports" : [
    "IATA3", "Name", "City", "Country", "Elevation", "Latitude", "Longitude"
  ]
, "extra_routes" : [
    "ID", "StartingAirport", "DestinationAirport", "Airline", "Distance"
  , "Equipment1", "Equipment2", "Equipment3", "Equipment4", "Equipment5"
  , "Equipment6", "Equipment7", "Equipment8", "Equipment9"
  ]
// The "query_property" is used only when extracting data from the response to a direct API request for airport information
, "airports" : [
    {"dat_property" : "iata"      , "csv_property" : "IATA3"     , "query_property" : "iata"      }
  , {"dat_property" : "name"      , "csv_property" : "Name"      , "query_property" : "name"      }
  , {"dat_property" : "city"      , "csv_property" : "City"      , "query_property" : "city"      }
  , {"dat_property" : "country"   , "csv_property" : "Country"   , "query_property" : "country"   }
  , {"dat_property" : "elevation" , "csv_property" : "Elevation" , "query_property" : "elevation" }
  , {"dat_property" : "lat"       , "csv_property" : "Latitude"  , "query_property" : "x"         }
  , {"dat_property" : "lng"       , "csv_property" : "Longitude" , "query_property" : "y"         }
  ]
}

// ---------------------------------------------------------------------------------------------------------------------
// Return a form object needed during a POST request to read airport information from the OpenFlights API
const airport_form = iata => ({
  "action"    : "SEARCH"
, "apid"      : ""
, "city"      : ""
, "code"      : ""
, "country"   : "ALL"
, "db"        : "airports"
, "dst"       : "U"
, "elevation" : ""
, "iata"      : iata
, "iatafilter": "false"
, "icao"      : ""
, "name"      : ""
, "offset"    : "0"
, "timezone"  : ""
, "x"         : ""
, "y"         : ""
})

// *********************************************************************************************************************
// As long as there is some data, write the HTTP response body to a JSON file
const save_body = (body, filename) =>
  body
  ? fs.writeFileSync(filename, body, "utf8")
  : console.log("Empty HTTP response body returned for %s", filename)

const report_status = (filename, response) => console.log("%s: HTTP %s", filename, response.statusCode)
const report_error  = error                => (error !== null) ? console.log(error) : undefined

const save_http_response = filename =>
  (error, response, body) =>
    error
    ? report_error(error)
    : (() => {
        save_body(body, filename)
        report_status(filename, response)
      })()

const save_http_response_promise = (filename, resolveFn, rejectFn) =>
  (error, response, body) =>
    error
    ? (() => {
        report_error(error)
        rejectFn(error)
      })()
    : (() => {
        report_status(filename, response)
        save_body(body, filename)
        resolveFn()
      })()



/***********************************************************************************************************************
 * Public API
 */
module.exports.urls           = urls
module.exports.dat_properties = dat_properties
module.exports.csv_properties = csv_properties
module.exports.airport_form   = airport_form

module.exports.save_http_response         = save_http_response
module.exports.save_http_response_promise = save_http_response_promise

