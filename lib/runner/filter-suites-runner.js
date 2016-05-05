'use strict';

var inherit = require('inherit'),
    Runner = require('./runner');

var FilterSuitesRunner = inherit(Runner, {
    __constructor: function(collection, filter) {
        this.__base(collection);
        this._filter = filter;
    },

    run: function(runHandler) {
        var _this = this;
        this._collection.disableAll();
        _this._collection.allSuites().forEach(function(test) {
            if (test.name && test.name.indexOf(_this._filter)>=0)
                _this._collection.enable(test);
        });
        return this.__base(runHandler);
    },

});

module.exports = FilterSuitesRunner;
