#!/usr/bin/env node

const fs = require("fs")

// *********************************************************************************************************************
// General utilities
// *********************************************************************************************************************

const compose = fn1 => fn2 => val => fn2(fn1(val))

// Remove only the start and end double quotes in a string
const stripQuotes  = str => str.replace(/(^")|("$)/g,"")

// Remove commas that might occur inside names
const removeCommas = str => str.replace(/,/g,"")

// Compose 'stripQuotes' and 'removeCommas' together to perform both tasks at once
const cleanTxt = compose(stripQuotes)(removeCommas)

const push        = (array,el) => (_ => array)(array.push(el))
const hasElements = arr => arr & arr.length > 0
const notNull     = el => el !== null

const ensureDir = dirname => fs.existsSync(dirname) ? undefined : fs.mkdirSync(dirname)

/***********************************************************************************************************************
 * Partition an array into two arrays based on whether or not the items match a given predicate function.
 *
 * This function is designed to extend the Array prototype, but only by the explicit action of the consuming library.
 * E.G. you must write code similar to the following:
 * 
 * const utils = require('./utils.js')
 * Array.prototype.partitionWith = utils.partitionWith
 * 
 * This function must be defined using a traditional "function" declaration instead of an arrow function.  If an arrow
 * function were used, then the reference to "this.reduce" wouldn't work...
 *  
 * partitionWith takes a simple predicate function as an argument and returns an array containing two other arrays.
 * The first array contains all the elements that do not match the predicate, and the second, all the elements that do
 * match the predicate
 * 
 * E.G.
 * 
 * var isEven      = x => x % 2 === 0
 * var numbers     = [1,2,3,4,5,6,7,8,9,10]
 * var [odd, even] = numbers.partitionWith(isEven)
 * 
 * odd  = [1,3,5,7,9]
 * even = [2,4,6,8,10]
 */
const partitionWith = function(predFn) {
  const partitionReducer = (acc,el) =>
    (success => success ? [acc[0], acc[1].concat(el)]
                        : [acc[0].concat(el), acc[1]])
    (predFn(el))

  return this.reduce(partitionReducer, [[],[]])                              
}

/***********************************************************************************************************************
 * Read a CSV file (with an optional header line) and transform it into an array of objects.
 * The properties of each object are supplied in the array prop_list.  The number and order of the names in prop_list
 * must match the number and order of the columns in the CSV file
 */
const csv_to_object_array = (filename, prop_list, hasHdr) =>
  ((lineArray =>                                        // 2) Arg "lineArray" is the CSV file now as a line array
    (hasHdr ? (lineArray.slice(1)) : lineArray)         // 3) Optionally remove the header line
    .map(                                               // 4) For each line in the CSV file...
      line =>                                           //    "line" is the arg to the mapper function
        (line.length > 0)                               // 5) Ignore empty lines
        ? line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)   // 6) Split line using positive lookahead to ignore quoted commas
              .reduce(                                  // 7) Transform field array into new object
                (acc, el, idx) =>                       // 8) Reducer function
                  (_ => acc)                            // 11) Ignore arg value and return accumulator
                  (acc[prop_list[idx]] = cleanTxt(el))  // 10) Add new value to accumulator and pass to inner, anon predFn
                , {}                                    // 9) Accumulator starts as an empty array
              )                                         //
        : null                                          // 12) Empty lines become null
    )                                                   //
    .filter(notNull))                                   // 13) Finally remove any null entries
  )                                                     //
  ((fs.readFileSync(filename, "utf-8")).split(/\r?\n/)) // 1) Read CSV file, split into lines & pass to anon inner predFn


/***********************************************************************************************************************
 * Find a specific airport in the airports object array
 */
const find_kv_in_obj_array = obj_array => (key,value) => (obj_array.find(el => el[key] === value))

/***********************************************************************************************************************
 * Transform an object array into a CSV file and write it to a local file
 */
const write_as_csv_file = (objArray, filename, hasHdr) => fs.writeFileSync(filename, object_array_to_csv(objArray, hasHdr))

const object_array_to_csv = (objArray,hasHdr) =>
  ((hasHdr) ? [Object.keys(objArray[0]).join(",")] : [])
  .concat(objArray.map(obj => Object.values(obj).join(",")))
  .join("\n")

/***********************************************************************************************************************
 * Generic map function that performs a 1:1 mapping between the columns in a raw .dat file and the properties of some
 * object that will later be output as a CSV file.
 * 
 * The mapping information must be supplied in the array argument 'csv_properties'.  Each element of this array contains
 * an object having at least the properties 'csv_property' and 'dat_property' where 'dat_property' is the name of the
 * column in the raw .dat file and 'csv_property' is the name of the property in what will become the target CSV output
 * file
 */
const dat_to_csv_mapper = csv_properties =>
  datEl =>
    csv_properties.reduce((acc, propertyEl) =>
      (_ => acc)(acc[propertyEl.csv_property] = datEl[propertyEl.dat_property])
    , {})


/***********************************************************************************************************************
 * Calculate great circle distance
 */
const degToRad = val => (deg => (deg / 180.0) * Math.PI)(typeof val === "number" ? val : Number.parseFloat(val))
const kmPerRadian = 6372.8

const haversine = (lat1val, lng1val, lat2val, lng2val) => {
  var lat1 = degToRad(lat1val)
    , lng1 = degToRad(lng1val)
    , lat2 = degToRad(lat2val)
    , lng2 = degToRad(lng2val)

  var deltaLat = lat2 - lat1
  var deltaLng = lng2 - lng1
  var sinDeltaLatBy2 = Math.sin(deltaLat / 2)
  var sinDeltaLngBy2 = Math.sin(deltaLng / 2)

  var a = sinDeltaLatBy2 * sinDeltaLatBy2 + sinDeltaLngBy2 * sinDeltaLngBy2 * Math.cos(lat1) * Math.cos(lat2)

  // Round the answer to the nearest kilometre
  return Math.round(2 * Math.asin(Math.sqrt(a)) * kmPerRadian)
}

/***********************************************************************************************************************
 * Public API
 */
module.exports.dat_to_csv_mapper    = dat_to_csv_mapper
module.exports.stripQuotes          = stripQuotes
module.exports.push                 = push
module.exports.notNull              = notNull
module.exports.hasElements          = hasElements
module.exports.ensureDir            = ensureDir
module.exports.partitionWith        = partitionWith
module.exports.csv_to_object_array  = csv_to_object_array
module.exports.write_as_csv_file    = write_as_csv_file
module.exports.haversine            = haversine
module.exports.find_kv_in_obj_array = find_kv_in_obj_array

