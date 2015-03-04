$(document).ready(function() {

    // Load all writable dashboards in the global registry first.
    $.ajax({
        url: appPrefixed('/a/dashboards/writable'),
        success: function(data) {
            globalDashboards = data;
            applyDashboardsToAllSelectors();
        }
    });

    if ($(".gridster").size() > 0){
        /* ducksboard/gridster.js#147 Hotfix - Part 1 */
        var items = $(".gridster ul li");
        items.detach();

        dashboardGrid = $(".gridster ul").gridster({
            widget_margins: [10, 10],
            widget_base_dimensions: [400, 150],
            draggable: {
                stop: function() {
                    var positions = this.serialize();
                    var dashboardId = $(".gridster").attr("data-dashboard-id");

                    var payload = {
                        positions: positions
                    };

                    $.ajax({
                        url: appPrefixed('/a/dashboards/' + dashboardId + '/positions'),
                        type: 'POST',
                        data: JSON.stringify(payload),
                        processData: false,
                        contentType: 'application/json',
                        success: function(data) {
                            // not doing anything here for now. no need to notify user about success IMO
                        },
                        error: function(data) {
                            showError("Could not save widget positions.");
                        }
                    });
                }
            },
            serialize_params: function(widgetListItem, pos) {
                var widget = $(".widget", widgetListItem);

                return {
                    id: widget.attr("data-widget-id"),
                    col: pos.col,
                    row: pos.row,
                    size_x: pos.size_x,
                    size_y: pos.size_y
                }
            }
        }).data('gridster').disable();

        /* ducksboard/gridster.js#147 Hotfix - Part 2 */
        $.each(items , function (i, e) {
            var item = $(this);
            var columns = parseInt(item.attr("data-sizex"));
            var rows = parseInt(item.attr("data-sizey"));
            var col = parseInt(item.attr("data-col"));
            var row = parseInt(item.attr("data-row"));
            dashboardGrid.add_widget(item, columns, rows, col, row);
        });
    } else {
        $(".unlock-dashboard-widgets").hide();
        $(".lock-dashboard-widgets").hide()
    }

    function applyDashboardsToAllSelectors() {
        var dashboardSelectors = $(".dashboard-selector[data-widget-type]");
        if (Object.keys(globalDashboards).length > 0) {
            dashboardSelectors.each(function() {
                var dashboardList = $(this);
                $("li", dashboardList).remove();

                for (var key in globalDashboards) {
                    var dashboard = globalDashboards[key];
                    var link = "<li><a href='#' data-dashboard-id='" + key + "'>" + htmlEscape(dashboard.title) + "</a></li>";
                    dashboardList.append(link);
                }
            });
        }

        // Show helper message if there are no options in the dropdown
        dashboardSelectors.each(function() {
            var dashboardSelector = $(this);
            if (dashboardSelector.children().length === 0) {
                var link = "<li><a href='#'>You cannot add widgets to any dashboard</a></li>";
                dashboardSelector.append(link);
            }
        });
    }

    function configuration(widgetType, element, callback) {
        var funcName = "configureDialog_" + widgetType;
        var func = window[funcName];
        if (func) {
            func(callback, element);
        } else {
            var description = prompt("Give the widget a title:");
            if (description != null && description != "") {
                callback(description);
            }
        }
    }

    $(document).on("click", "ul.dashboard-selector li a[data-dashboard-id]", function () {
        var elem = $(this).closest("ul.dashboard-selector");
        var widgetType = elem.attr("data-widget-type");
        var dashboardId = $(this).attr("data-dashboard-id");
        configuration(widgetType, elem, createDashboard);
        function createDashboard(description) {
            delegateAddToDashboard(
                widgetType,
                dashboardId,
                description,
                elem
            );
        }
    });

    $(document).on("click", ".dashboard .widget .remove-widget", function(e) {
        e.preventDefault();

        if(!confirm("Really remove widget? The page will reload after removing it.")) {
            return;
        }

        var widget = $(this).closest(".widget");

        $.ajax({
            url: appPrefixed('/a/dashboards/' + widget.attr("data-dashboard-id") + '/widgets/' + widget.attr("data-widget-id") + '/delete'),
            type: 'POST',
            success: function() {
                showSuccess("Widget has been removed from dashboard!");
                widget.parent().remove();
                location.reload();
            },
            error: function(data) {
                showError("Could not remove widget from dashboard.");
            }
        });
    });

    $(document).on("click", ".dashboard .widget .show-config", function(e) {
        var widget = $(this).closest(".widget");

        $(".widget-config[data-widget-id=" + widget.attr("data-widget-id") + "]").modal();
    });

    function delegateAddToDashboard(widgetType, dashboardId, description, elem) {
        var funcName = "addWidget_" + widgetType;
        window[funcName](dashboardId, description, elem);
    }

    // Periodically poll every widget.
    (function updateDashboardWidgets() {

        if (!assertUpdateEnabled(updateDashboardWidgets)) return;

        $(".dashboard .widget[data-widget-type]").each(function() {
            var widget = $(this);
            var dashboardId = widget.attr("data-dashboard-id");
            var widgetId = widget.attr("data-widget-id");
            var cacheTimeInSecs = parseInt(widget.attr("data-cache-time") || 0);

            function reloadWidget() {
                if (!assertUpdateEnabled(reloadWidget)) return;

                $(".reloading", widget).show();

                // XXX: This is just the fixed resolution of the Rickshaw graph as defined in "search_result_chart.js"
                var resolution = 800;

                var url;
                if (resolution) {
                    url = appPrefixed('/a/dashboards/' + dashboardId + '/widgets/' + widgetId  + '/resolution/' + resolution + '/value');
                } else {
                    url = appPrefixed('/a/dashboards/' + dashboardId + '/widgets/' + widgetId + '/value');
                }

                $.ajax({
                    url: url,
                    type: 'GET',
                    success: function(data) {
                        // Pass to widget specific function to display actual value(s).

                        var widgetType = widget.attr("data-widget-type");
                        if (widgetType !== "map") {
                            var funcName = "updateWidget_" + widgetType;
                            window[funcName](widget, data);
                        }

                        $(".calculated-at", widget).attr("title", data.calculated_at);
                        $(".calculated-at", widget).text(moment(data.calculated_at).fromNow());
                    },
                    error: function(data) {
                        showErrorInWidget(widget);
                    },
                    complete: function(data) {
                        $(".reloading", widget).hide();
                        setTimeout(reloadWidget, cacheTimeInSecs * 1000);
                    }
                });
            }
            reloadWidget();
        });
    })();

    // Change dashboard title.
    $(".edit-dashboard").on("click", function(e) {
        e.preventDefault();
        $(this).closest("h1").hide();
        $(".dashboard-description").hide();
        var editDashboardForm = $("form.edit-dashboard-form");
        editDashboardForm.show();
        focusFirstFormInput(editDashboardForm);
    });

    function displayUpdateUnfocussed(updateUnfocussed) {
        if (updateUnfocussed) {
            $(".update-onfocussed-on").hide();
            $(".update-onfocussed-off").show();
        } else {
            $(".update-onfocussed-on").show();
            $(".update-onfocussed-off").hide();
        }
    }
    displayUpdateUnfocussed(userPreferences && userPreferences.updateUnfocussed);

    $(".update-onfocussed-on").on("click", function() {
        displayUpdateUnfocussed(true);
        setUpdateUnfocussedMode(true);
        alert("Window will be updated even when unfocussed");
    });

    $(".update-onfocussed-off").on("click", function() {
        displayUpdateUnfocussed(false);
        setUpdateUnfocussedMode(false);
        alert("Window will no longer be updated when unfocussed");
    });

    $(".unlock-dashboard-widgets").on("click", function() {
        dashboardGrid.enable();
        $(".dashboard .gridster .gs-w").css("cursor", "move");
        $(this).hide();
        $(".only-unlocked").show();
        $(".hidden-unlocked").hide();
        $(".lock-dashboard-widgets").show();

        // Replay links fix. We don't want the links to be clickable when dragging.
        $(".dashboard .widget a.replay-link").each(function() {
            $(this).css("cursor", "move")
                .attr("data-original-href", $(this).attr("href"))
                .attr("href", "javascript: void(0)");
        })
    });

    $(".lock-dashboard-widgets").on("click", function() {
        dashboardGrid.disable();
        $(".dashboard .gridster .gs-w").css("cursor", "default");
        $(this).hide();
        $(".hidden-unlocked").show();
        $(".only-unlocked").hide();
        $(".unlock-dashboard-widgets").show();

        // Replay links fix. Make the links clickable again.
        $(".dashboard .widget a.replay-link").each(function() {
            $(this).css("cursor", "pointer")
                .attr("href", $(this).attr("data-original-href"));
        })
    });

    $(".dashboard .widget .edit-description").on("click", function(e) {
        e.preventDefault();
        var widget = $(this).closest(".widget");

        $(".description", widget).hide();

        var descriptionForm = $(".description-form", widget);
        descriptionForm.show();
        focusFirstFormInput(descriptionForm);
    });

    $(".dashboard .widget .description-form input").on("keyup", function() {
        var widget = $(this).closest(".widget");

        if ($(this).val().length > 0) {
            $("button.update-description", widget).prop("disabled", false);
        } else {
            $("button.update-description", widget).prop("disabled", true);
        }
    });

    $(".dashboard .widget .edit-cache-time").on("click", function(e) {
        e.preventDefault();
        var widget = $(this).closest(".widget");

        var dashboardId = widget.attr("data-dashboard-id");
        var widgetId = widget.attr("data-widget-id");

        var modalWindow = $("#dashboardwidget-cache-time");
        var button = $("button.update-cachetime", modalWindow);

        $("input.cachetime-value", modalWindow).val($(".cache-time-value", widget).text());
        button.attr("data-dashboard-id", dashboardId);
        button.attr("data-widget-id", widgetId);

        modalWindow.modal();
    });

    $("#dashboardwidget-cache-time").on("shown", focusFirstFormInput);

    $("#dashboardwidget-cache-time input.cachetime-value").on("keyup", function() {
        if ($(this).val().length > 0 && isNumber($(this).val()) && parseInt($(this).val()) >= 1) {
            $("#dashboardwidget-cache-time button.update-cachetime").prop("disabled", false);
        } else {
            $("#dashboardwidget-cache-time button.update-cachetime").prop("disabled", true);
        }
    });

    $("#dashboardwidget-cache-time button.update-cachetime").on("click", function(e) {
        e.preventDefault();
        var widget = $('.dashboard .widget[data-widget-id="' + $(this).attr("data-widget-id") + '"]')
        var newVal = $("#dashboardwidget-cache-time input.cachetime-value").val();

        var dashboardId = widget.attr("data-dashboard-id");
        var widgetId = widget.attr("data-widget-id");

        $.ajax({
            url: appPrefixed('/a/dashboards/' + dashboardId + '/widgets/' + widgetId + '/cachetime'),
            data: {
                cacheTime: newVal
            },
            type: 'POST',
            success: function(data) {
                $(".info .cache-info .cache-time .cache-time-value", widget).text(newVal);

                showSuccess("Widget cache time updated!")
            },
            error: function(data) {
                showError("Could not update widget cache time.")
            },
            complete: function(data) {
                $("#dashboardwidget-cache-time").modal('hide');
            }
        });
    });

    $("button.update-description").on("click", function(e) {
        e.preventDefault();
        var widget = $(this).closest(".widget");
        var dashboardId = widget.attr("data-dashboard-id");
        var widgetId = widget.attr("data-widget-id");

        var newVal = $(".description-value", widget).val().trim();

        $.ajax({
            url: appPrefixed('/a/dashboards/' + dashboardId + '/widgets/' + widgetId + '/description'),
            data: {
                description: newVal
            },
            type: 'POST',
            success: function(data) {
                $(".description .widget-title", widget).text(newVal);
                $(".description", widget).show();
                $(".description-form", widget).hide();
                $(".description", widget).show();

                showSuccess("Widget description updated!")
            },
            error: function(data) {
                showError("Could not update widget description.")
            }
        });
    });

    function showErrorInWidget(widget) {
        $(".widget-error-hidden", widget).hide();

        $(".value, .dashboard-chart, .widget-error-active", widget)
            .show()
            .html("<i class='icon icon-warning-sign loading-failed'></i>");
    }

});

function addWidget(dashboardId, description, params) {
    if (description !== undefined && description !== "") {
        params.description = description;
    }

    $.ajax({
        url: appPrefixed('/a/dashboards/' + dashboardId + '/widgets'),
        type: 'POST',
        data: params,
        success: function() {
            showSuccess("Widget added to dashboard!")
        },
        error: function(data) {
            showError("Could not add widget to dashboard.");
        }
    });
}