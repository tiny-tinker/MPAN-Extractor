
var path = require('path');
var PDFParser = require("pdf2json/pdfparser");


function parse (pdfBuffer, callback) {
    var pdfParser = new PDFParser();

    // adding try/catch/printstack 'cause pdfParser seems to prevent errors from bubbing up (weird implementation).
    // It also doesn't seem to implement the callback(err, otherdata) convention used in most Node.js modules, so let's fix that here.
    pdfParser.on("pdfParser_dataReady", function (data) {
        try{
            pdfParserCallback(null, data);
        }catch(err){
            console.log(err.stack);
        }
    });

    pdfParser.on("pdfParser_dataError", function (err) {
        try{
            pdfParserCallback(err, null);
        }catch(err){
            console.log(err.stack);
        }
    });


    function pdfParserCallback (err, data) {
        if (err) return callback(err);

        let mpanPossibilities = []; // Store some MPAN possibility numbers
        let pageTexts = data.data.Pages;
        let pageTextsBackup = data.data.Pages;

        let searchStepX = 0;
        let searchStepY = 0.5;


        // #1. Find the letter 'S'
        for (let p = 0; p < pageTexts.length; p++) {
            let page = pageTexts[p];

            for (let t = 0; t < page.Texts.length; t++) {
                if (decodeURIComponent(page.Texts[t].R[0].T) === 'S')
                {
                    mpanPossibilities.push([page.Texts[t]]);
                    searchStepX = page.Texts[t].w;
                    pageTextsBackup[p].Texts.splice(pageTextsBackup[p].Texts.indexOf(page.Texts[t]), 1);
                }
            }
        }

        let orgPageTexts = pageTextsBackup;
        let currSearchStepX = searchStepX;
        let currSearchSteypY = searchStepY;

        console.log(searchStepX);
        // #2. Increase the step and find letters
        let notMpan = [];
        for (let i = 0; i < mpanPossibilities.length; i++) {

            let comparePos = {
                x: mpanPossibilities[i][0].x,
                y: mpanPossibilities[i][0].y
            };
            pageTextsBackup = orgPageTexts;
            currSearchStepX = searchStepX;
            currSearchSteypY = searchStepY;
            while (1) {
                pageTexts = pageTextsBackup;
                for (let p = 0; p < pageTexts.length; p++) {
                    let page = pageTexts[p];

                    for(let t = 0; t < page.Texts.length; t++) {
                        let str = decodeURIComponent(page.Texts[t].R[0].T);
                        let letterPos = {
                            x: page.Texts[t].x,
                            y: page.Texts[t].y
                        };
                        if (!isNaN(str)) {

                            // Illegal numbers are skipped
                            if (str === '0') {
                                continue;
                            }
                            if (parseInt(str) < 0) {
                                continue;
                            }
                            // Check if the string is near the letter 'S'

                            if (inRange(comparePos, letterPos, currSearchStepX, currSearchSteypY)) {
                                mpanPossibilities[i].push(page.Texts[t]);
                                pageTextsBackup[p].Texts.splice(pageTextsBackup[p].Texts.indexOf(page.Texts[t]), 1);
                            }
                        }
                    }
                }

                // To skip infinity loop
                if (currSearchStepX > 700) {
                    notMpan.push(mpanPossibilities[i]);
                    break;
                }

                // MPAN array completed
                if (mpanPossibilities[i].length > 7) {
                    break;
                }
                else {
                    currSearchStepX += 1;
                    currSearchSteypY += 0.05;
                }
            }
        }

        // Remove not finished array(breaked to avoid infinity loops) in mpanPossibilities array;
        for (let i = 0; i < notMpan.length; i++) {
            mpanPossibilities.splice(mpanPossibilities.indexOf(notMpan[i]), 1);
        }

        let mpanArr = [];
        // Calculate the middle y point of per possibilities
        for (let i = 0; i < mpanPossibilities.length; i++) {

            // Calculate averageY
            let avgY = 0, sumY = 0;
            for (let j = 1; j < mpanPossibilities[i].length; j++) {
                sumY += mpanPossibilities[i][j].y;
            }
            avgY = sumY / (mpanPossibilities[i].length - 1);

            let topLine = [];
            let bottomLine = [];

            // Divide and sort the MAPN Numbers
            for (let j = 1; j < mpanPossibilities[i].length; j++) {
                if (mpanPossibilities[i][j].y <= avgY) {
                    topLine.push(mpanPossibilities[i][j]);
                } else {
                    bottomLine.push(mpanPossibilities[i][j]);
                }
            }

            topLine.sort(function (a, b) {
                return a.x - b.x;
            });

            bottomLine.sort(function (a, b) {
                return a.x - b.x;
            });


            // Make MPAN string
            let mpanStr = 'S ';
            for (let j = 0; j < topLine.length; j++) {
                mpanStr += decodeURIComponent(topLine[j].R[0].T) + ' ';
            }
            for (let j = 0; j < bottomLine.length; j++) {
                mpanStr += decodeURIComponent(bottomLine[j].R[0].T) + ' ';
            }
            mpanStr = mpanStr.substring(0, mpanStr.length - 1);
            mpanArr.push(mpanStr);
        }

        let rows = mpanArr;
        callback(null, rows, null);
    }

    pdfParser.parseBuffer(pdfBuffer);
}

function inRange(pos1, pos2, xRange, yRange) {
    return pos2.x >= pos1.x && pos2.x <= (pos1.x + xRange) && pos2.y >= (pos1.y - yRange) && pos2.y <= (pos1.y + yRange);
}
exports.parse = parse;

