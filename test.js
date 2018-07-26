//var pdf2table = require('./lib/pdf2table');
var pdf2table = require('./lib/extractMPAN');
var fs = require('fs');

const pdfPaths = [
    'avro.pdf',
    'edf.pdf',
    'isupply.pdf',
    'octopus.pdf'
];

pdfPaths.forEach(function (path) {
    fs.readFile(path, function (err, buffer) {
        if (err) return console.log(err);

        pdf2table.parse(buffer, function (err, rows, rowsdebug) {
            if(err) return console.log(err);
            console.log('-------------------');
            console.log(path);
            console.log(rows);
        });
    });
});
