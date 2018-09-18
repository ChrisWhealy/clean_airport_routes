#!/usr/bin/env node

/***********************************************************************************************************************
 * Generate airport and route CSV files that contain consistent data suitable for the TechEd 2018 Space Travel Agency
 * data model.
 * 
 * The file extra_airports.csv contains manually defined airport information to fill in the gaps in the data supplied by
 * OpenFlights.org
 * 
 * THIS APP IS DESIGNED TO RUN FROM YOUR LOCAL MACHINE, *NOT* IN THE CLOUD!
 * 
 */
var http_req    = require("request")
var fs          = require("fs")
var utils       = require("./modules/utils.js")
var openflights = require("./modules/openflights.js")

Array.prototype.partitionWith = utils.partitionWith

// System files to ignore
const ignore_files = [".DS_Store", "airports.dat", "routes.dat"]

const local_path          = "./data/"
const local_file_airports = local_path + "airports.dat"
const local_file_routes   = local_path + "routes.dat"
const local_filename      = iata3 => local_path + iata3 + ".json"

const local_file_extras_airports = "extra_airports.csv"
const local_file_extras_routes   = "extra_routes.csv"

const output_csv_airports = "airports.csv"
const output_csv_routes   = "earthroutes.csv"

// *********************************************************************************************************************
// Get the source data from OpenFlights.org
const fetch_file = (url, filename) =>
  new Promise((resolve, reject) =>
    http_req.get(url, openflights.save_http_response_promise(filename, resolve, reject))
  )


// *********************************************************************************************************************
// Start here...
// *********************************************************************************************************************

// Ensure that the directory for local files exists
utils.ensureDir(local_path)

fetch_file(openflights.urls.airports, local_file_airports)
  .then(() => fetch_file(openflights.urls.routes, local_file_routes))
  .then(() => {
    // Convert CSV files to object arrays
    var openflights_airports = utils.csv_to_object_array(local_file_airports, openflights.dat_properties.airports, false)

    // The airline operating a route is not necessarily identified by its 2-character IATA code. Some routes list the
    // 3-character ICAO code instead - and this will break the data import into HANA.
    // So these routes must also be filtered out
    var openflights_routes = utils
      .csv_to_object_array(local_file_routes, openflights.dat_properties.routes, false)
      .filter(el => el.airline.length === 2)

    // Extract a list of unique airports from the routes object array
    // JavaScript will do all the hard work for us here if we first create an intermediate Set object, then convert it
    // back to an array
    var unique_route_airports = Array.from(new Set(openflights_routes.reduce((acc, el) =>
        ((_v1, _v2) => acc)                 // Inner anon fn ignores argument values and returns accumulator
        (acc.push(el.source_airport),       // Add source airport to the accumulator
         acc.push(el.destination_airport))  // Add destination airport to the accumulator
      , [])))

    console.log("routes.dat describes %i routes between %i unique airports", openflights_routes.length, unique_route_airports.length)
    console.log("airports.dat contains %i airports", openflights_airports.length)

    // Strip the openflights_airports down to an array of only those airports that have an IATA location code
    // Some airports genuinely have no IATA code (only an ICAO code) but for other airports, their IATA code is missing
    var [airports_with_iata3, _] = openflights_airports.partitionWith(el => el.iata === "\\N" || el.iata === "")
    var airports_with_iata3_codes = openflights_airports.reduce((acc, el) => (el.iata !== "\\N" && el.iata !== "") ? utils.push(acc, el.iata) : acc, [])

    console.log("Only %i airports have a 3-character IATA location code", airports_with_iata3.length)

    // Make sure that all the airports listed in unique_route refer to airports with IATA locations coded
    var [_, airports_missing_from_routes] = unique_route_airports.partitionWith(el => airports_with_iata3_codes.indexOf(el) === -1)

    console.log("%i airports are listed in routes.dat that cannot be found in airports.dat", airports_missing_from_routes.length)

    // Only request airport data if the local file cannot be found
    var request_airport_info = airports_missing_from_routes.reduce((acc,airport) =>
      fs.existsSync(local_filename(airport))
      ? acc
      : utils.push(acc,airport)
    , [])
    
    console.log("Need to fetch data for %i missing airports", request_airport_info.length)

    // Use the OpenFlights API to fetch the data for an airport not listed in routes.dat
    // If this request does not return any useful data, then remove that airport from both the airports and routes arrays
    var idx = 0

    const fetch_missing_airports = () => {
      // Have we retrieved information for all the missing airports?
      if (idx >= request_airport_info.length) {
        // Yup
        console.log("Data for %i missing airports now retrieved", idx)

        clearInterval(timerId)

        // Transform the data in the openflights_airports and openflights_routes object arrays into an object arrays
        // that match the required CSV output format
        var airports_csv = airports_with_iata3.map(utils.dat_to_csv_mapper(openflights.csv_properties.airports))
        console.log("Airports CSV object array contains %i entries", airports_csv.length)

        // Now we know which airports cannot be cross-referenced between routes.dat and airports.dat, and we have
        // attempted to download this missing data using OpenFlights.org's query API, we can now establish which
        // airports are genuinely unknown (the "airports" property in the downloaded JSON file for such an airport will
        // be an empty array)
        var nothing = []
        var airport_data_via_api = fs.readdirSync(local_path).reduce((acc1, filename) =>
          (ignore_files.indexOf(filename) > -1)
          ? acc1
          : (airportInfo =>
              (airportInfo.airports.length > 0)
              ? (thisAirport =>
                  utils.push(
                    acc1
                  , openflights.csv_properties.airports.reduce((acc2, propertyEl) =>
                      (_ => acc2)
                      (acc2[propertyEl.csv_property] = thisAirport[propertyEl.query_property])
                    , {}))
                )
                (airportInfo.airports[0])
              : ((_1,_2) => acc1)
                (console.log("OpenFlights has no data for airport %s",filename.substr(0,3)), nothing.push(filename.substr(0,3)))
            )
            (JSON.parse(fs.readFileSync(local_path + filename, "utf-8")))
        , [])

        // Concatenate the existing airports array with both the data retrieved for the missing airports and the data
        // from the extra airports file
        var extra_airports = utils.csv_to_object_array(local_file_extras_airports, openflights.csv_properties.extra_airports, true)

        console.log("%i airports added to airports_csv array by reading OpenFlights API", airport_data_via_api.length)
        console.log("%i airports added to airports_csv array from extra_airports.csv file", extra_airports.length)

        var all_airports = airports_csv.concat(airport_data_via_api).concat(extra_airports)
        var find_airport = utils.find_kv_in_obj_array(all_airports)

        // -------------------------------------------------------------------------------------------------------------
        // Write out airports.csv
        utils.write_as_csv_file(all_airports, output_csv_airports, true)
        // -------------------------------------------------------------------------------------------------------------

        // Subtract the airports listed in extra_airports from those listed in the nothing array.
        // This will then leave the true number of airports for which we still can't find any data
        var [still_nothing, _] = nothing.partitionWith(el1 => extra_airports.filter(el2 => el2.IATA3 === el1).length > 0)

        console.log("Still can't find any data for %i airport%s", still_nothing.length, (still_nothing.length === 1 ? "" : "s"))
        console.log("Routes to/from the following airport(s) will be removed\n[%s]", still_nothing.join(","))
        console.log("Calculating route distances")

        // Remove any routes to airports that we can't identify (hopefully, not too many)
        var clean_routes_csv = openflights_routes
          .filter(el =>
            still_nothing.indexOf(el.source_airport)      === -1 &&
            still_nothing.indexOf(el.destination_airport) === -1
          )
          // Calculate distance between route airports
          .reduce((acc, dat_el, idx) => {
              // Write a progress dot for every 100 routes
              if (idx % 100 === 0) process.stdout.write(".")

              var start_airport = find_airport("IATA3",dat_el.source_airport)
              var dest_airport  = find_airport("IATA3",dat_el.destination_airport)

              if (start_airport === undefined ||
                  dest_airport  === undefined) {
                console.log("\nAirport information missing\n  Start = %s\n  Dest  = %s", dat_el.source_airport, dat_el.destination_airport)
                return acc
              }
              else {
                var newRoute = {}

                newRoute["ID"]                 = dat_el.source_airport + dat_el.destination_airport + dat_el.airline
                newRoute["StartingAirport"]    = dat_el.source_airport
                newRoute["DestinationAirport"] = dat_el.destination_airport
                newRoute["Airline"]            = dat_el.airline
                newRoute["Distance"]           = utils.haversine(start_airport.Latitude, start_airport.Longitude
                                                               , dest_airport.Latitude,  dest_airport.Longitude)
                // Assign the equipment codes to the respective fields in the newRoute object
                var equip_codes = dat_el.equipment.split(" ")

                // Even if this route does not have all 9 equipment codes assigned, always assign the 9 required fields
                for (var i=0; i<9; i++) {
                  newRoute["Equipment" + (i+1)] = equip_codes[i]
                }
                
                return acc.concat([newRoute])
              }
            }
          , [])

        // -------------------------------------------------------------------------------------------------------------
        // Write out routes.csv
        var extra_routes = utils.csv_to_object_array(local_file_extras_routes, openflights.csv_properties.extra_routes, true)
        console.log("\n%i routes added to clean_routes_csv array from extra_routes.csv file", extra_routes.length)

        utils.write_as_csv_file(clean_routes_csv.concat(extra_routes), output_csv_routes, true)
        // -------------------------------------------------------------------------------------------------------------

        // Pack up and go home...
        console.log("\nDONE\n")
      }
      else {
        // Nope, still need to fire off more HTTP requests...
        var airport = request_airport_info[idx++]

        http_req.post(
          {"url":openflights.urls.api,"form":openflights.airport_form(airport)}
        , openflights.save_http_response(local_filename(airport))
        )
      }
    }

    // Use setInterval to slow down the HTTP request rate in order to avoid looking like a DoS attack...
    var timerId = setInterval(fetch_missing_airports, 250)
  })

