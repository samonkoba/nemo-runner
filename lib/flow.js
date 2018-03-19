'use strict';

var merge = require('lodash.merge');
var debug = require('debug');
var log = debug('nemo-runner:log');
var error = debug('nemo-runner:error');
var filenamify = require('filenamify');
var reporter = require('../lib/reporter');
var Glob = require('glob');
var path = require('path');
var moment = require('moment');
var data = require('../util/dataProviderUtil');
var allData = require('../util/multipleTestsCapabilities');
const isFile = require('../util/fileHandler.js').isFile;
const isDirectory = require('../util/fileHandler.js').isDirectory;

let profile = function profile(cb) {
    var base = this.config.get('profiles:base');
    var urls = this.config.get('data');

    let allBases = {};
    let locales = [];
    let testcaseName = '';
    let dataProviderFile = '';
    let allTestCases = {};
    let testPath = '';
    let maxConcurrent = 2;
    base.data = new Object;


    if (process.argv.slice(2).indexOf('-B') >= 0) {
        testPath = process.argv.slice(2)[process.argv.slice(2).indexOf('-B') + 1];
    }

    if (process.argv.slice(2).indexOf('-C') >= 0) {
        maxConcurrent = process.argv.slice(2)[process.argv.slice(2).indexOf('-C') + 1];
    }
    base.maxConcurrent = maxConcurrent;


    /*

    LOCAL DATA FILTER BEGIN

    */


    // console.log(JSON.stringify(base))

    // set the testcase name from commandline
    if (process.argv.slice(2).indexOf('-G') >= 0) {
        testcaseName = process.argv.slice(2)[process.argv.slice(2).indexOf('-G') + 1];
        let testcaseNames = testcaseName.split(',')
        if (isDirectory(testcaseNames[0])) {
            console.log('Running all tests in directory and subdirectories in: ' + JSON.stringify(testcaseNames));
            allTestCases = allData.getAllTestsNames(testcaseNames);
        } else if (isFile(testcaseNames[0])) {
            console.log('Runing all tests in File: ' + JSON.stringify(testcaseNames));
            allTestCases = allData.getTestsFromFile(testcaseNames)

        } else {
            allTestCases = allData.getTestsByName(testPath + 'spec/flow/', testcaseNames)

        }
    } else {
        console.log("Please remember to use the grep {-G (--grep) } option followed by either the testcase description, path to the testcases folder or path to test file")
    }

    // check and set local data from the commandline args

    if (process.argv.slice(2).indexOf('-L') >= 0) {
        locales = process.argv.slice(2)[process.argv.slice(2).indexOf('-L') + 1];
        locales = locales.split(',');
        if (!Array.isArray(locales)) {
            locales = [];
        }
    }

    var profiles = [];

    for (let testSuiteName in allTestCases) {
        allTestCases[testSuiteName].testcases.forEach(function (testCaseName) {
            allBases[testCaseName] = {};
            Object.assign(allBases[testCaseName], base)
            profiles.push(testCaseName)


            let projectPathName = testSuiteName.split('_')[0];
            let dataFileName = allTestCases[testSuiteName].fileName + '.json';
            // check and set local data from the commandline args
            if (process.argv.slice(2).indexOf('-M') >= 0) {
                dataProviderFile = process.argv.slice(2)[process.argv.slice(2).indexOf('-M') + 1];
            } else {
                dataProviderFile = testPath + 'spec/dataprovider/' + projectPathName + '/' + dataFileName || testPath + 'spec/dataprovider/' + projectPathName + '/template.json';
            }

            if (locales.length > 0) {
                allBases[testCaseName].data = data.getTestsDataByCountry(testCaseName, dataProviderFile, locales, urls);
            } else {
                allBases[testCaseName].data = data.getTestsData(testCaseName, dataProviderFile, urls);
            }

        })

    }


    /*

    LOCAL DATA FILTER END

    */


    profiles = (profiles instanceof Array) ? profiles : [profiles];
    this.instances = [];
    profiles.forEach(function (profil) {
        var conf;
        var instance;
        var profileObj = this.config.get(`profiles:${'base'}`);
        if (!profileObj) {
            error('flow:profile, profile %s is undefined', profil);
            return;
        }
        conf = merge({}, allBases[profil], profileObj || {});
        instance = {
            tags: {profile: profil},
            conf: conf
        };
        this.instances.push(instance);

    }.bind(this));
    cb(null, this);
};

let reportDir = function reportDir(cb) {
    let tsDirName = moment().format("MM-DD-YYYY/HH-mm-ss");
    let fullReportPath = `${this.config.get('profiles:base:reports')}/${tsDirName}`;
    this.config.set('profiles:base:reports', fullReportPath);
    log(`flow:reportDir: ${fullReportPath}`);
    this.instances.forEach(function (instance) {
        instance.conf.reports = fullReportPath;
        log(`flow:reportDir: instance.conf.reports ${instance.conf.reports}`)
    });
    cb(null, this);
};

let grep = function grep(cb) {
    var instances = [];
    var greps = this.program.grep || '';
    greps = (greps instanceof Array) ? greps : [greps];
    this.instances.forEach(function (instance) {

        var _instance = merge({}, instance);
        _instance.conf.mocha.grep = instance.tags.profile;
        _instance.tags.grep = instance.tags.profile;
        instances.push(_instance);

    });
    this.instances = instances;
    log('flow:grep, #instances: %d', this.instances.length);
    cb(null, this);
};

let glob = function glob(cb) {
    var instances = [];
    this.instances.forEach(function (instance, index, arr) {
        var testFileGlob = path.resolve(this.program.baseDirectory, instance.conf.tests);
        Glob(testFileGlob, {}, function (err, files) {
            var _instance = merge({}, instance);
            log('flow:glob, #files %d', files.length);
            if (err) {
                return cb(err);
            }
            _instance.conf.tests = files;
            instances.push(_instance);
            if (index === arr.length - 1) {
                this.instances = instances;
                log('flow:glob, #instances: %d', this.instances.length);
                cb(null, this);
            }
        }.bind(this));
    }.bind(this));
};

let pfile = function pfile(cb) {
    var base = this.config.get('profiles:base');
    var instances = [];
    if (this.program.file || base.parallel && base.parallel.indexOf('file') !== -1) {
        log('flow:pfile, parallel by file');
        this.instances.forEach(function (instance) {
            var files = instance.conf.tests;
            files.forEach(function (file) {
                var _instance;
                var justFile = file.split(this.program.baseDirectory)[1];
                justFile = filenamify(justFile);
                // remove file ext
                justFile = (justFile.endsWith('.js')) ? justFile.substr(0, justFile.length - 3) : justFile;
                log('flow:pfile, file %s', justFile);
                _instance = merge({}, instance);
                _instance.conf.tests = [file];
                _instance.tags.file = justFile;
                instances.push(_instance);
            }.bind(this));
        }.bind(this));
        this.instances = instances;
    }
    log('flow:pfile, #instances: %d', this.instances.length);
    cb(null, this);
};

let pdata = function pdata(cb) {
    var instances = [];
    var datas = this.config.get('profiles:base:data');
    var base = this.config.get('profiles:base');

    if (this.program.data || base.parallel && base.parallel.indexOf('data') !== -1) {
        datas = (typeof datas !== 'object') ? {} : datas;
        log('flow:pdata, parallel by data');
        this.instances.forEach(function (instance) {
            // check for local data
            datas = instance.conf.data || datas;
            for (let key in datas) {
                if (Object.prototype.hasOwnProperty.call(datas, key)) {
                    let _instance;
                    _instance = merge({}, instance);
                    _instance.tags.key = key;
                    _instance.tags.locale = key;
                    _instance.conf.data = datas[key];
                    instances.push(_instance);
                }
            }
        });
        this.instances = instances;
    }
    log('flow:pfile, #instances: %d', this.instances.length);
    cb(null, this);
};

let reportFiles = function reportFiles(cb) {
    log('flow:reportFiles:start');
    let instances = [];
    // let reporterFromConfig = this.config.get('profiles:base:mocha:reporter');
    this.instances.forEach(function (instance) {
        let reporterFromConfig = instance.conf.mocha.reporter;
        // set up reporter options
        if (reporter.hasOwnProperty(reporterFromConfig)) {
            log(`flow:reportFiles: we have a handler for ${reporterFromConfig}`);
            reporter[reporterFromConfig](instance);
        }
        instances.push(instance);
    });
    this.instances = instances;
    cb(null, this);
};
module.exports = [profile, reportDir, grep, glob, pfile, pdata, reportFiles];
