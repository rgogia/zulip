const render_admin_filter_list = require("../templates/admin_filter_list.hbs");

const meta = {
    loaded: false,
};

exports.reset = function () {
    meta.loaded = false;
};

exports.maybe_disable_widgets = function () {
    if (page_params.is_admin) {
        return;
    }
};

exports.populate_filters = function (filters_data) {
    if (!meta.loaded) {
        return;
    }

    const filters_table = $("#admin_filters_table").expectOne();
    const filters_list = list_render.create(filters_table, filters_data, {
        name: "linkifiers_list",
        modifier: function (filter) {
            return render_admin_filter_list({
                filter: {
                    pattern: filter[0],
                    url_format_string: filter[1],
                    id: filter[2],
                },
                can_modify: page_params.is_admin,
            });
        },
        filter: {
            element: filters_table.closest(".settings-section").find(".search"),
            predicate: function (item, value) {
                return item[0].toLowerCase().includes(value) ||
                item[1].toLowerCase().includes(value);
            },
            onupdate: function () {
                ui.reset_scrollbar(filters_table);
            },
        },
        parent_container: $("#filter-settings").expectOne(),
    }).init();

    function compare_by_index(a, b, i) {
        if (a[i] > b[i]) {
            return 1;
        } else if (a[i] === b[i]) {
            return 0;
        }
        return -1;
    }

    filters_list.add_sort_function("pattern", function (a, b) {
        return compare_by_index(a, b, 0);
    });

    filters_list.add_sort_function("url", function (a, b) {
        return compare_by_index(a, b, 1);
    });

    const active_col = $('.admin_filters_table th.active').expectOne();
    filters_list.sort(
        active_col.data('sort'),
        undefined,
        undefined,
        undefined,
        active_col.hasClass('descend'));

    loading.destroy_indicator($('#admin_page_filters_loading_indicator'));
};

exports.set_up = function () {
    exports.build_page();
    exports.maybe_disable_widgets();
};

exports.build_page = function () {
    meta.loaded = true;

    // create loading indicators
    loading.make_indicator($('#admin_page_filters_loading_indicator'));

    // Populate filters table
    exports.populate_filters(page_params.realm_filters);

    $('.admin_filters_table').on('click', '.delete', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const btn = $(this);

        channel.del({
            url: '/json/realm/filters/' + encodeURIComponent(btn.attr('data-filter-id')),
            error: function (xhr) {
                ui_report.generic_row_button_error(xhr, btn);
            },
            success: function () {
                const row = btn.parents('tr');
                row.remove();
            },
        });
    });

    $(".organization form.admin-filter-form").off('submit').on('submit', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const filter_status = $('#admin-filter-status');
        const pattern_status = $('#admin-filter-pattern-status');
        const format_status = $('#admin-filter-format-status');
        const add_filter_button = $('.new-filter-form button');
        add_filter_button.attr("disabled", "disabled");
        filter_status.hide();
        pattern_status.hide();
        format_status.hide();
        const filter = {};

        for (const obj of $(this).serializeArray()) {
            filter[obj.name] = obj.value;
        }

        channel.post({
            url: "/json/realm/filters",
            data: $(this).serialize(),
            success: function (data) {
                $('#filter_pattern').val('');
                $('#filter_format_string').val('');
                add_filter_button.removeAttr("disabled");
                filter.id = data.id;
                ui_report.success(i18n.t("Custom filter added!"), filter_status);
            },
            error: function (xhr) {
                const errors = JSON.parse(xhr.responseText).errors;
                add_filter_button.removeAttr("disabled");
                if (errors.pattern !== undefined) {
                    xhr.responseText = JSON.stringify({msg: errors.pattern});
                    ui_report.error(i18n.t("Failed"), xhr, pattern_status);
                }
                if (errors.url_format_string !== undefined) {
                    xhr.responseText = JSON.stringify({msg: errors.url_format_string});
                    ui_report.error(i18n.t("Failed"), xhr, format_status);
                }
                if (errors.__all__ !== undefined) {
                    xhr.responseText = JSON.stringify({msg: errors.__all__});
                    ui_report.error(i18n.t("Failed"), xhr, filter_status);
                }
            },
        });
    });


};

window.settings_linkifiers = exports;
