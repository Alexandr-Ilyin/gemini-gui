'use strict';

var _ = require('lodash'),
    AllSuitesRunner = require('./all-suites-runner'),
    SpecificSuitesRunner = require('./specific-suites-runner'),
    FilterSuitesRunner = require('./filter-suites-runner');

exports.create = function(collection, specificSuites, filter) {
    if (!_.isEmpty(specificSuites))
        return new SpecificSuitesRunner(collection, [].concat(specificSuites));
    if (filter)
        return new FilterSuitesRunner(collection, filter);
    return new AllSuitesRunner(collection);
};
