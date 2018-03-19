const readTestCaseFiles = require('./fileHandler.js').readTestCaseFiles;
const readTestFile = require('./fileHandler.js').readTestFile;

const getAllTestsNames = (exports.getAllTestsNames = (dirs) => {

    let tests = {};
    dirs.forEach(function (dir) {

        let testData = readTestCaseFiles(dir);
        // for each test file get the suite name and each testcase names
        testData.forEach(function (content) {
            // get the suite name
            let suiteName = content['content'].match(/describe(.*?)\)/g);
            if (suiteName.length > 0) {
                suiteName = suiteName[0].replace('describe(\'', '').replace(/'.*/g, '');


                //check for duplicate suite names
                if (tests.hasOwnProperty(suiteName)) {
                    if (tests[suiteName].fileName !== content['fileName']) {
                        throw new Error('\n\n Duplicate Suite Name > ' + suiteName + '\n  Make sure each suite name is unique \n');
                    }
                }


                // get testcases names
                let testsNames = content['content'].match(/it\('(.*?)',/g);
                testsNames = testsNames.map(function (testName) {
                    return testName.replace('it(\'', '').replace(/'.*/g, '');
                });

                tests[suiteName] = tests[suiteName] || {};
                tests[suiteName].fileName = content['fileName'];
                if (!Array.isArray(tests[suiteName].testcases))
                    tests[suiteName].testcases = [];

                tests[suiteName].testcases = tests[suiteName].testcases.concat(testsNames);
            }
        });
    })

    return tests;
});

const getTestsFromFile = (exports.getTestsFromFile = (filePaths) => {

    let tests = {};

    filePaths.forEach(function (filePath) {
        let testData = readTestFile(filePath);

        // for each test file get the suite name and each testcase names
        // get the suite name
        let suiteName = testData['content'].match(/describe(.*?)\)/g);
        if (suiteName.length > 0) {
            suiteName = suiteName[0].replace('describe(\'', '').replace(/'.*/g, '');
            // get testcases names
            let testsNames = testData['content'].match(/it\('(.*?)',/g);
            testsNames = testsNames.map(function (testName) {
                return testName.replace('it(\'', '').replace(/'.*/g, '');
            });
            tests[suiteName] = {};
            tests[suiteName].testcases = testsNames;
            tests[suiteName].fileName = testData['fileName'];
        }
    })


    return tests;
});

const getTestsByName = (exports.getTestsByName = (dir, testCaseNames) => {
    let test = {};
    let allTests = {}
    allTests = this.getAllTestsNames(dir.split(','));
    for (testSuiteName in allTests) {
        testCaseNames.forEach(function (testName) {
            if (allTests[testSuiteName].testcases.includes(testName)) {
                test[testSuiteName] = {};
                test[testSuiteName].testcases = []
                test[testSuiteName].testcases.push(testName);
                test[testSuiteName].fileName = allTests[testSuiteName].fileName;
            }
        })

    }
    return test;
});