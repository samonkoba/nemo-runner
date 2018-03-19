'use strict';

var Util = require('localizedtestdata');


const readFile = require('./fileHandler.js').readFileSynchronously;
const allLocales = require('./locales')

const setupUser = (user, localeData, locale) => {

    let country = localeData.hasOwnProperty('locale') ?
        (allLocales.hasOwnProperty(localeData.locale) ? allLocales[localeData.locale].country : console.log('\n\n Locale ' + locale + ' was not found \n\n')) :
        (allLocales.hasOwnProperty(locale) ? allLocales[locale].country : console.log('\n\n Locale ' + locale + ' was not found \n\n'));

    let defaultUser = {};
    defaultUser.country = country;
    Object.assign(defaultUser, user);
    let bank = {};
    let funds = Util.getFund(country);
    defaultUser.currency = localeData.currency || funds.currency;
    defaultUser.bankaccounts = localeData.bankaccounts || [bank = Util.getBank(country)];
    if (!bank) {
        delete defaultUser.bankaccounts;
    }
    defaultUser.funds = localeData.funds || [funds];
    defaultUser.creditcards = localeData.creditcards || [
        Util.getCreditCard(country)
    ];
    defaultUser.locale = localeData.locale || locale;
    defaultUser.type = localeData.type || defaultUser.type;
    defaultUser.firstName = localeData.firstName || Util.getFirstName(country);
    defaultUser.lastName = localeData.lastName || Util.getLastName(country);
    defaultUser.preferredLanguage = localeData.preferredLanguage || allLocales[defaultUser.locale].language;
    if (defaultUser.type.toLowerCase() === 'BUSINESS'.toLowerCase()) {
        defaultUser.businessType =
            localeData.biztype || Util.getBusinessType(country);
        defaultUser.businessName = localeData.firmName || Util.getFirmName(country);
        defaultUser.bizUrl = localeData.bizurl || Util.getBusinessUrl(country);
    }

    return defaultUser;
};


/**
 * The test data provider utility
 */

const getLocalizedTestData = (testData, urls) => {
    let allLocales = testData.locales || {};
    let testsArray = {};
    if (Object.keys(allLocales).length <= 0) {
        allLocales.en_US = {};
    }
    for (let multilocales in allLocales) {
        // noinspection Annotator
        let tests = JSON.parse(JSON.stringify(testData.default));
        let localeData = allLocales[multilocales];

        if (!localeData.hasOwnProperty('sender'))
            localeData.sender = {}
        if (!localeData.hasOwnProperty('receiver'))
            localeData.receiver = {}

        tests.locale = localeData.locale || tests.locale;
        tests.baseUrl = tests.baseUrl || urls.baseUrl;
        tests.productUrl = tests.productUrl || urls.productUrl;

        // setup default sender and receiver
        tests.sender = {};
        tests.receiver = {};
        tests.sender.currency = tests.receiver.currency = 'USD';
        tests.sender.type = tests.receiver.type = 'PERSONAL';
        tests.sender.firstName = tests.receiver.firstName = '';
        tests.sender.lastName = tests.receiver.lastName = '';
        tests.sender.businessType = tests.receiver.businessType = '';
        tests.sender.businessName = tests.receiver.businessName = '';
        tests.sender.bizUrl = tests.receiver.bizUrl = '';
        tests.sender.funds = tests.receiver.funds = [];
        tests.sender.creditcards = tests.receiver.creditcards = [];
        tests.sender.bankaccounts = tests.receiver.bankaccounts = [];
        tests.sender.preferredLanguage = tests.receiver.preferredLanguage = 'en_US';

        let locales = [];
        locales = multilocales.split(",");
        let tempTests = {};
        locales.forEach(function (locale) {
            Object.assign(tempTests, tests);
            tempTests.sender = setupUser(tests.sender, localeData.sender, locale);
            tempTests.receiver = setupUser(tests.receiver, localeData.receiver, locale);
            testsArray[localeData.locale || locale] = {};
            Object.assign(testsArray[localeData.locale || locale], tempTests);
        })


    }


    return testsArray; // /tests array for  each locale for that description
};


/*
 * The getTestData method reads all the tests at a given dataprovider file, filters the tests that needs to be executed and returns the final set of tests that need to be executed.
 * @param  {string} testCaseName  the testcasename for the data to be provided
 * @param {string}               the test data provider file for that given test
 * @return {json}               the test data for that given test case
 *
 *  getTestsData("test_amount_property_file",'bizwalletnodeweb/transferMoney.json')
 */
const getTestsData = (testCaseName, dataProviderFile, urls) => {
    let testData = {}
    try {
        testData = JSON.parse(
            readFile(dataProviderFile));
    } catch (error) {
        console.log(error)
        console.error("\n Error in file " + dataProviderFile + "\n")
    }

    let testName = dataProviderFile.replace(/^.*[\\\/]/, '').replace('.json', '');
    let testDescription = testData[testCaseName] || {};
    if (Object.keys(testDescription).length <= 0) {
        console.log('No test case data found with the name: \'' + testCaseName + '\' in file: \'' + dataProviderFile + '\'');
        return;
    }
    testDescription.testName = testName;
    return getLocalizedTestData(testDescription, urls);
};

/*
 * The getTestDataByCountry method reads all the tests at a given dataprovider file, filters the tests that needs to be executed by the locale provided in the parameters
 * and returns the final set of tests that need to be executed.
 * @param  {string} testCaseName  the testcasename for the data to be provided
 * @param {string}               the test data provider file for that given test
 * @return {json}               the test data for that given test case
 *
 *
 *  getTestsData("test_amount_property_file",'bizwalletnodeweb/transferMoney.json',['US','FR'])
 */
const getTestsDataByCountry = (testCaseName, dataProviderFile, locales, urls) => {
    let testData = {}
    try {
        testData = JSON.parse(
            readFile(dataProviderFile));
    } catch (error) {
        console.log(error)
        console.error("\n Error in file " + dataProviderFile + "\n")
    }

    let testName = dataProviderFile.replace(/^.*[\\\/]/, '').replace('.json', '');
    let testDescription = testData[testCaseName] || {};
    if (Object.keys(testDescription).length <= 0) {
        console.log('No test case data found with the name: \'' + testCaseName + '\' in file: \'' + dataProviderFile + '\'');
        return;
    }
    testDescription.testName = testName;
    Object.keys(testDescription.locales).forEach(
        locale =>
            locales.includes(locale) || delete testDescription.locales[locale]
    );

    locales.forEach(function (locale) {
        if (!testDescription.locales.hasOwnProperty(locale)) {
            testDescription.locales[locale] = {};
            testDescription.locales[locale].sender = {};
            testDescription.locales[locale].receiver = {};
        }
    });


    return getLocalizedTestData(testDescription, urls);
};

module.exports = {
    getTestsData: getTestsData,
    getTestsDataByCountry: getTestsDataByCountry
};

// getTestData("../spec/dataprovider/bizwalletnodeweb/transferMoney.json");
