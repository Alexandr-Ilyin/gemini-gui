/*jshint browser:true*/
'use strict';

var SectionList = require('./section-list'),
    xhr = require('./xhr'),
    byId = document.getElementById.bind(document),
    byClass = document.getElementsByClassName.bind(document);

var RunStates = {
    RUNNING: 'running',
    PENDING: 'pending'
};

function Controller() {
    this._sections = new SectionList(this);
    this._runButton = byId('run');
    this._runFailedButton = byId('runFailed');

    this.state = RunStates.PENDING;

    this._handleButtonClicks();
    this._listenForEvents();
}

Controller.prototype = {
    runState: function(state) {
        this._run(state);
    },

    _runAllFailed: function() {
        var failed = this._sections.findFailedStates();

        if (failed.length) {
            this._run(this._sections.findFailedStates());
        }
    },

    _run: function(failed) {
        var _this = this;

        this._toggleButtons(false);
        this.state = RunStates.RUNNING;

        var url = window.location.href.replace(/#.*/,"");
        var match = /filter\=([^&]*)/.exec(url);
        var filter = match ? match[1] : "";

        var postUrl;
        if (!filter)
            postUrl = '/run';
        else
            postUrl = '/run?filter=' + filter;

        xhr.post(postUrl, failed, function(error) {
            if (error) {
                this.state = RunStates.PENDING;
                return;
            }
            return failed? _this._sections.markAsQueued(failed) : _this._sections.markAllAsQueued();
        });
    },

    _toggleButtons: function(isEnabled) {
        Array.prototype.forEach.call(byClass('button_togglable'), function(element) {
            element.disabled = !isEnabled;
        });

        this._sections.toggleRetry(isEnabled);
    },

    _handleButtonClicks: function() {
        var sections = this._sections,
            _this = this;

        byId('expandAll').addEventListener('click', sections.expandAll.bind(sections));
        byId('collapseAll').addEventListener('click', sections.collapseAll.bind(sections));
        byId('expandErrors').addEventListener('click', sections.expandErrors.bind(sections));

        this._runButton.addEventListener('click', function() {
            _this._run();
        });
        this._runFailedButton.addEventListener('click', this._runAllFailed.bind(this));
    },

    _listenForEvents: function() {
        var eventSource = new EventSource('/events'),
            _this = this;

        eventSource.addEventListener('beginSuite', function(e) {
            var data = JSON.parse(e.data),
                section = _this._sections.findSection({suite: data.suite});

            if (section && section.status === 'queued') {
                section.status = 'running';
            }
        });

        eventSource.addEventListener('beginState', function(e) {
            var data = JSON.parse(e.data),
                section = _this._sections.findSection({
                    suite: data.suite,
                    state: data.state
                });

            if (section && section.status === 'queued') {
                section.status = 'running';
            }
        });

        eventSource.addEventListener('endTest', function(e) {
            var data = JSON.parse(e.data),
                section = _this._sections.findSection({
                    suite: data.suite,
                    state: data.state,
                    browserId: data.browserId
                });

            if (data.equal) {
                section.setAsSuccess(data);
            } else {
                section.setAsFailure(data);
                section.expand();
                _this._sections.markBranchAsFailed(section);
            }
        });

        eventSource.addEventListener('skipState', function(e) {
            var data = JSON.parse(e.data),
                section = _this._sections.findSection({
                    suite: data.suite,
                    state: data.state,
                    browserId: data.browserId
                });
            section.setAsSkipped();
            var stateSection = _this._sections.findSection({
                suite: data.suite,
                state: data.state
            });

            _this._sections.markIfFinished(stateSection);
        });

        eventSource.addEventListener('err', function(e) {
            var data = JSON.parse(e.data),
                section = _this._sections.findSection({
                    suite: data.suite,
                    state: data.state,
                    browserId: data.browserId
                });
            section.setAsError({stack: data.stack});
            section.expand();
            _this._sections.markBranchAsFailed(section);
        });

        eventSource.addEventListener('noReference', function(e) {
            var data = JSON.parse(e.data),
                section = _this._sections.findSection({
                    suite: data.suite,
                    state: data.state,
                    browserId: data.browserId
                });

            section.setAsNewReference(data);
            section.expand();
            _this._sections.markBranchAsFailed(section);
        });

        eventSource.addEventListener('endState', function(e) {
            var data = JSON.parse(e.data),
                section = _this._sections.findSection({
                    suite: data.suite,
                    state: data.state
                });

            _this._sections.markIfFinished(section);
        });

        eventSource.addEventListener('endSuite', function(e) {
            var data = JSON.parse(e.data),
                section = _this._sections.findSection({
                    suite: data.suite,
                    state: data.state,
                    browserId: data.browserId
                });

            _this._sections.markIfFinished(section);
        });

        eventSource.addEventListener('end', function(e) {
            _this._toggleButtons(true);
            _this.state = RunStates.PENDING;
        });
    }
};

module.exports = Controller;
