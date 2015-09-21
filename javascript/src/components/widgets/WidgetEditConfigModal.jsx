/* global momentHelper */

'use strict';

var React = require('react');
var Input = require('react-bootstrap').Input;

var FieldStatisticsStore = require('../../stores/field-analyzers/FieldStatisticsStore');
var FieldGraphsStore = require('../../stores/field-analyzers/FieldGraphsStore');
var BootstrapModal = require('../bootstrap/BootstrapModal');

var WidgetEditConfigModal = React.createClass({
    getInitialState() {
        return {
            title: this.props.widget.title,
            type: this.props.widget.type,
            cacheTime: this.props.widget.cacheTime,
            config: this.props.widget.config,
            errors: {}
        };
    },
    open() {
        this.refs.editModal.open();
    },
    hide() {
        this.refs.editModal.close();
    },
    _getWidgetData() {
        var widget = {};
        var stateKeys = Object.keys(this.state);

        stateKeys.forEach((key) => {
            if (this.state.hasOwnProperty(key) && key !== "errors") {
                widget[key] = this.state[key];
            }
        });

        return widget;
    },
    save() {
        var errorKeys = Object.keys(this.state.errors);
        if (!errorKeys.some((key) => this.state.errors[key] === true)) {
            this.props.onUpdate(this._getWidgetData());
        }
        this.hide();
    },
    _onTitleChange(event) {
        this.setState({title: event.target.value});
    },
    _onCacheTimeChange(event) {
        this.setState({cacheTime: event.target.value});
    },
    _onConfigurationChange(key, value) {
        var config = this.state.config;
        config[key] = value;
        this.setState({config: config});
    },
    _onQueryChange(event) {
        this._onConfigurationChange("query", event.target.value);
    },
    _onConfigurationCheckboxChange(key) {
        return (event) => {
            this._onConfigurationChange(key, event.target.checked);
        };
    },
    _onRelativeTimeRangeChange(event) {
        this._onConfigurationChange("range", event.target.value);
    },
    _onAbsoluteTimeRangeFromChange(event) {
        var from = momentHelper.parseUserLocalFromString(event.target.value);
        var hasError = !from.isValid();

        var errors = this.state.errors;
        errors["from"] = hasError;
        this.setState({errors: errors});
        if (!hasError) {
            this._onConfigurationChange("from", from.tz("utc").format());
        }
    },
    _onAbsoluteTimeRangeToChange(event) {
        var to = momentHelper.parseUserLocalFromString(event.target.value);
        var hasError = !to.isValid();

        var errors = this.state.errors;
        errors["to"] = hasError;
        this.setState({errors: errors});
        if (!hasError) {
            this._onConfigurationChange("to", to.tz("utc").format());
        }
    },
    _onKeywordTimeRangeChange(event) {
        this._onConfigurationChange("keyword", event.target.value);
    },
    _onSeriesChange(seriesNo, field) {
        return (event) => {
            var newSeries = this.state.config.series;
            newSeries[seriesNo][field] = event.target.value;
            console.log(newSeries);

            this._onConfigurationChange("series", newSeries);
        };
    },
    _onStatisticalFunctionChange(field) {
        return (event) => {
            this._onConfigurationChange(field, event.target.value);
        };
    },
    _formatDateTime(dateTime) {
        return momentHelper.toUserTimeZone(dateTime).format(momentHelper.DATE_FORMAT_NO_MS);
    },
    _getTimeRangeFormControls() {
        var rangeTypeSelector = (
            <Input type="text"
                   label="Time range type"
                   disabled
                   value={this.state.config.range_type.capitalize()}
                   help="Type of time range to use in the widget."/>
        );

        var rangeValueInput;

        switch (this.state.config.range_type) {
            case 'relative':
                rangeValueInput = (
                    <Input type="number"
                           label="Search relative time"
                           required
                           min="0"
                           defaultValue={this.state.config.range}
                           onChange={this._onRelativeTimeRangeChange}
                           help="Number of seconds relative to the moment the search executes. 0 searches in all messages."/>
                );
                break;
            case 'absolute':
                rangeValueInput = (
                    <div>
                        <Input type="text"
                               label="Search from"
                               required
                               bsStyle={this.state.errors["from"] === true ? "error" : null}
                               defaultValue={this._formatDateTime(this.state.config.from)}
                               onChange={this._onAbsoluteTimeRangeFromChange}
                               help="Earliest time to be included in the search. E.g. 2015-03-27 13:23:41"/>
                        <Input type="text"
                               label="Search to"
                               required
                               bsStyle={this.state.errors["to"] === true ? "error" : null}
                               defaultValue={this._formatDateTime(this.state.config.to)}
                               onChange={this._onAbsoluteTimeRangeToChange}
                               help="Latest time to be included in the search. E.g. 2015-03-27 13:23:41"/>
                    </div>
                );
                break;
            case 'keyword':
                rangeValueInput = (
                    <Input type="text"
                           label="Search keyword"
                           required
                           defaultValue={this.state.config.keyword}
                           onChange={this._onKeywordTimeRangeChange}
                           help="Search keyword representing the time to be included in the search. E.g. last day"/>
                );
                break;
        }

        return (
            <div>
                {rangeTypeSelector}
                {rangeValueInput}
            </div>
        );
    },
    _getSpecificConfigurationControls() {
        var controls = [];

        if (this.state.type !== this.props.widgetTypes.STACKED_CHART) {
            controls.push(
                <Input type="text"
                       key="query"
                       label="Search query"
                       defaultValue={this.state.config.query}
                       onChange={this._onQueryChange}
                       help="Search query that will be executed to get the widget value."/>
            );
        }

        switch (this.state.type) {
            case this.props.widgetTypes.STATS_COUNT:
                var defaultStatisticalFunction = this.state.config["stats_function"] === 'stddev' ? 'std_deviation' : this.state.config["stats_function"];
                controls.push(
                    <Input key="statsCountStatisticalFunction"
                           type="select"
                           label="Statistical function"
                           defaultValue={defaultStatisticalFunction}
                           onChange={this._onStatisticalFunctionChange("stats_function")}
                           help="Statistical function applied to the data.">
                        {FieldStatisticsStore.FUNCTIONS.keySeq().map((statFunction) => {
                            return (
                                <option key={statFunction} value={statFunction}>
                                    {FieldStatisticsStore.FUNCTIONS.get(statFunction)}
                                </option>
                            );
                        })}
                    </Input>
                );
                /* falls through */
            case this.props.widgetTypes.SEARCH_RESULT_COUNT:
            case this.props.widgetTypes.STREAM_SEARCH_RESULT_COUNT:
                controls.push(
                    <Input key="trend"
                           type="checkbox"
                           label="Display trend"
                           defaultChecked={this.state.config.trend}
                           onChange={this._onConfigurationCheckboxChange("trend")}
                           help="Show trend information for this number."/>
                );

                controls.push(
                    <Input key="lowerIsBetter"
                           type="checkbox"
                           label="Lower is better"
                           disabled={this.state.config.trend === false}
                           defaultChecked={this.state.config.lower_is_better}
                           onChange={this._onConfigurationCheckboxChange("lower_is_better")}
                           help="Use green colour when trend goes down."/>
                );
                break;
            case this.props.widgetTypes.QUICKVALUES:
                controls.push(
                    <Input key="showPieChart"
                           type="checkbox"
                           label="Show pie chart"
                           defaultChecked={this.state.config.show_pie_chart}
                           onChange={this._onConfigurationCheckboxChange("show_pie_chart")}
                           help="Represent data in a pie chart"/>
                );

                controls.push(
                    <Input key="showDataTable"
                           type="checkbox"
                           label="Show data table"
                           defaultChecked={this.state.config.show_data_table}
                           onChange={this._onConfigurationCheckboxChange("show_data_table")}
                           help="Include a table with quantitative information."/>
                );
                break;
            case this.props.widgetTypes.FIELD_CHART:
                controls.push(
                    <Input key="fieldChartStatisticalFunction"
                           type="select"
                           label="Statistical function"
                           defaultValue={this.state.config["valuetype"]}
                           onChange={this._onStatisticalFunctionChange("valuetype")}
                           help="Statistical function applied to the data.">
                        {FieldGraphsStore.constructor.FUNCTIONS.keySeq().map((statFunction) => {
                            return (
                                <option key={statFunction} value={statFunction}>
                                    {FieldGraphsStore.constructor.FUNCTIONS.get(statFunction)}
                                </option>
                            );
                        })}
                    </Input>
                );
                break;
            case this.props.widgetTypes.STACKED_CHART:
                this.state.config.series.forEach((series) => {
                    var seriesNo = this.state.config.series.indexOf(series);
                    controls.push(
                        <fieldset key={"series" + seriesNo}>
                            <legend>Series #{seriesNo + 1}</legend>
                            <Input type="text"
                                   label="Field"
                                   defaultValue={series["field"]}
                                   onChange={this._onSeriesChange(seriesNo, "field")}
                                   help="Field used to get the series value."
                                   required/>
                            <Input type="text"
                                   label="Search query"
                                   defaultValue={series["query"]}
                                   onChange={this._onSeriesChange(seriesNo, "query")}
                                   help="Search query that will be executed to get the series value."/>
                            <Input type="select"
                                   label="Statistical function"
                                   defaultValue={series["statistical_function"]}
                                   onChange={this._onSeriesChange(seriesNo, "statistical_function")}
                                   help="Statistical function applied to the series.">
                                {FieldGraphsStore.constructor.FUNCTIONS.keySeq().map((statFunction) => {
                                    return (
                                        <option key={statFunction} value={statFunction}>
                                            {FieldGraphsStore.constructor.FUNCTIONS.get(statFunction)}
                                        </option>
                                    );
                                })}
                            </Input>
                        </fieldset>
                    );
                }, this);
                break;
        }

        return controls;
    },
    render() {
        var configModalHeader = <h2 className="modal-title">Edit widget "{this.state.title}"</h2>;
        var configModalBody = (
            <fieldset>
                <Input type="text"
                       label="Title"
                       required
                       defaultValue={this.state.title}
                       onChange={this._onTitleChange}
                       help="Type a name that describes your widget."/>
                <Input type="number"
                       min="1"
                       required
                       label="Cache time"
                       defaultValue={this.state.cacheTime}
                       onChange={this._onCacheTimeChange}
                       help="Number of seconds the widget value will be cached."/>
                {this._getTimeRangeFormControls()}
                {this._getSpecificConfigurationControls()}
            </fieldset>
        );

        return (
            <BootstrapModal ref="editModal"
                            onCancel={this.hide}
                            onConfirm={this.save}
                            onHidden={this.props.onModalHidden}
                            cancel="Cancel"
                            confirm="Update">
                {configModalHeader}
                {configModalBody}
            </BootstrapModal>
        );
    }
});

module.exports = WidgetEditConfigModal;