(function () {
    var customFieldsListTemplate;
    var customFieldsTemplates;

    function getTemplates() {
        customFieldsListTemplate = _.template($('#customFieldsListTemplate').text());
        customFieldsTemplates = {
            picklist: _.template($('#customFieldsPicklistTemplate').text()),
            checkbox: _.template($('#customFieldsCheckboxTemplate').text()),
            textarea: _.template($('#customFieldsTextareaTemplate').text()),
            input: _.template($('#customFieldsInputTemplate').text()),
            upload: _.template($('#customFieldsUploadTemplate').text()),
            boolean: _.template($('#customFieldsBooleanTemplate').text()),
        };
    }

    var CustomFieldsModule = function (opts) {
        this.options = opts || {};

        this.render = function (target) {
            if (!customFieldsListTemplate) {
                getTemplates();
            }

            var $el = target || this.options.el;
            $el = $el instanceof $ ? $el : $($el);
            var html = customFieldsListTemplate({
                fields: this.options.fields || {},
                values: this.options.values || {},
                textareas: this.options.textareas || {},
                folders: this.options.folders || {},
                folderOrder: this.options.folderOrder || null,
                pipelineFilters: this.options.pipelineFilters || {},
                item: this.options.item || {id: 0},
                itemType: this.options.itemType || '',
                fieldClass: this.options.fieldClass + ' ' || '',
                templates: customFieldsTemplates,
                fieldFilter: _.isFunction(this.options.fieldFilter) ? this.options.fieldFilter : null,
            });
            $el.html(html);

            $el.find('.datepicker').datepicker({
                dateFormat: 'yy-mm-dd',
                onSelect: function (dateText) {
                    $(this).attr('value', dateText).change();
                },
            });

            $el.find('.datetimepicker').each(function () {
                const format = $(this).attr('format');
                console.log('custom_fields format:', format);
                $(this).datetimepicker({
                    defaultTime: '00:00:00',
                    format: format || 'Y-m-d H:i:s',
                });
            });
        };
    };

    // todo - proper module?
    window.CustomFieldsModule = CustomFieldsModule;
    return CustomFieldsModule;
})();
