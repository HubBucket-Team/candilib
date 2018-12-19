/*
  csv-express
  Forked and modified by John J Czaplewski <jczaplew@gmail.com>

  Copyright 2011 Seiya Konno <nulltask@gmail.com>
  MIT Licensed
 */

const res = require('http').ServerResponse.prototype
const iconv = require('iconv-lite')

// Configurable settings
exports.separator = ';'
exports.preventCast = false
exports.ignoreNullOrUndefined = true

/*
 * Escape CSV field
 *
 * @param {Mixed} field
 * @return {String}
 * @api private
 */

function escape (field) {
  if (exports.ignoreNullOrUndefined && field === undefined) {
    return ''
  }
  if (exports.preventCast) {
    return `= ${String(field).replace(/"/g, '""')}`
  }
  return String(field).replace(/"/g, '""')
}

/*
 Send CSV response

 {data} - Array objects or arrays
 {csvHeaders} - If true uses the keys of the objects in {obj} to set a header row
 {headers} - Optional HTTP response headers
 {status} - Optional status code
*/

export default (res.csv = function sendCsv (
  data,
  charset,
  csvHeaders,
  headers,
  status,
) {
  let body = ''
  const headerRow = []
  let statusCodeSet = true

  this.charset = charset || 'utf-8'
  this.header('Content-Type', 'text/csv')

  // Set custom headers
  if (headers && headers instanceof Object) {
    // Use res.header() instead of res.set() to maintain backward compatibility with Express 2
    // Change to res.set() in next major version so that iteration is not required
    Object.keys(headers).forEach((header) => {
      this.header(header, headers[header])
    })
  }

  // Set response status code
  if (status && Number.isInteger(status)) {
    // res.status does not work in Express 2, so make sure the error would be trapped
    try {
      this.status(status)
    } catch (error) {
      statusCodeSet = false
    }
  }

  // headerRow is used to ensure key order
  Object.keys(data[0]).map((prop) => {
    if (data[0].hasOwnProperty(prop)) { // eslint-disable-line no-prototype-builtins
      headerRow.push(prop)
    }
  })

  // Append the header row to the response if requested
  if (csvHeaders) {
    body += `${headerRow.join(exports.separator)}\r\n` // TODO remettre avec retour chariot sous linux \r\n
  }

  // Convert the data to a CSV-like structure
  // eslint-disable-next-line no-restricted-syntax
  for (const line of data) {
    let convertedLine = line
    if (!(line instanceof Array)) {
      convertedLine = headerRow.map((key) => {
        if (line.hasOwnProperty(key)) { // eslint-disable-line no-prototype-builtins
          return line[key]
        }
        return null
      })
    }

    body += `${convertedLine.map(escape).join(exports.separator)}\r\n` // TODO remettre avec retour chariot sous linux \r\n
  }

  if (this.charset !== 'utf-8') {
    body = iconv.encode(body, this.charset)
  }

  if (!statusCodeSet) {
    return this.send(body, status)
  }

  return this.send(body)
})
