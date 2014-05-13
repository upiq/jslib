/** 
 * criteria.js: criteria editor / support advanced and basic criteria query
 *              editing.
 */

/*jshint browser: true, nomen: false, eqnull: true, es5:true, trailing:true,
         undef:true
 */
/*global jQuery, console, QUnit, COREMODELNS, window, alert */


// org namespace:
var uu = uu || {};


// queryschema module:
uu.queryschema = (function ($, ns, uu, core, global) {

    var c = {};

    ns.schemaURL = function () {
        return ($('base').attr('href') || '') + '/@@searchapi/fields';
    };

    /**
     * cAjax(): cached ajax GET requests
     */
    ns.cAjax = function (options) {
        var url = options.url,
            callback = options.success,
            wrapper = function (data) {
                callback.call(this, data);
                ns.apiCallCache[url] = data;
            },
            context = options.context || options,
            cachedResult;
        if (!url || options.type === 'POST') return;  // uncachable
        cachedResult = ns.apiCallCache[url];
        if (cachedResult) {
            return callback.call(context, cachedResult);
        }
        options.success = wrapper;
        $.ajax(options);
    };

    // module-scoped data:
    ns.apiCallCache = {};  // cache url to parsed JSON for GET requests

    // TermInfo: vocabulary term for choices of Comparator, Value
    ns.TermInfo = function (value, label, prefix) {

        this.init = function (value, label, prefix) {
            this.value = value || null;
            this.label = label || this.value;
            this.prefix = prefix || null;  // label prefix
        };

        this.display_label = function () {
            if (typeof this.prefix === 'string') {
                return this.prefix + ' ' + this.label;
            }
            return this.label;
        };

        this.init(value, label, prefix);
    };

    // Field: object representing metadata for a single schema field:
    ns.Field = function Field(name, data) {

        this.init = function (name, data) {
            this.name = name;
            Object.keys(data).forEach(function (k) {
                var v = data[k],
                    name = (k === 'vocabulary') ? '_vocabulary' : k;
                this[name] = (typeof v !== 'function') ? v : undefined;
            }, this);
        };

        // is field a Choice or collection of multiple Choice?
        this.isChoice = function () {
            return (
                this.fieldtype === 'Choice' ||
                this.value_type === 'Choice' ||
                this.fieldtype === 'Bool'
            );
        };

        this.vocabulary = function () {
            if (!this.isChoice()) {
                return null;
            }
            return this._vocabulary.map(function (v) {
                return new ns.TermInfo(v);
            });
        };

        this.init(name, data);
    };

    /**
     * Schema: mapping of field names to Field objects, may preserve order
     */
    ns.Schema = function Schema(data) {

        this.init = function (data) {
            var pairs = data;
            // superclass ctor wants Array of k/v pair tuple arrays
            if (!(data instanceof Array) && data) {
                pairs = Object.keys(data).map(function (name) {
                    return [name, new ns.Field(name, data[name])];
                }, this);
            }
            ns.Schema.prototype.init.call(this, {iterable: pairs});
        };

        this.init(data);
    };
    core.klass.subclasses(ns.Schema, core.Container);

    ns.comparators = c;

    c.ALL = new ns.TermInfo('All', 'contains all of','\u2286');
    c.ANY = new ns.TermInfo('Any', 'includes any of','*');
    c.CONTAINS = new ns.TermInfo('Contains', 'contains','\u2208');
    c.DOESNOTCONTAIN = new ns.TermInfo(
        'DoesNotContain',
        'does not contain',
       '\u2209'
        );
    c.EQ = new ns.TermInfo('Eq', 'is equal to','=');
    c.GE = new ns.TermInfo('Ge', 'is greater than or equal to','\u2264');
    c.GT = new ns.TermInfo('Gt', 'is greater than','>');
    c.INRANGE = new ns.TermInfo('InRange', 'is between','(\u2026)');
    c.LE = new ns.TermInfo('Le', 'is less than or equal to','\u2265');
    c.LT = new ns.TermInfo('Lt', 'is less than','<');
    c.NOTEQ = new ns.TermInfo('NotEq', 'is not','\u2260');
    c.NOTINRANGE = new ns.TermInfo('NotInRange', 'is not between','\u2209');

    ns.COMPARATORS_BY_INDEX = {
        'field': [
            c.ANY, c.EQ, c.GE, c.GT, c.INRANGE, c.LE, c.LT, c.NOTEQ,
            c.NOTINRANGE
        ],
        'text': [c.CONTAINS, c.DOESNOTCONTAIN],
        'keyword': [c.ANY, c.ALL, c.DOESNOTCONTAIN]
        };

    ns.CHOICE_OMIT = [c.LT, c.LE, c.GT, c.GE, c.INRANGE, c.NOTINRANGE];

    /**
     * Comparators: global adapts schema, can apply comparator choices
     *              to a callback for a field via applyComparators.
     */
    ns.Comparators = function Comparators(schema) {

        this.init = function (schema) {
            this.schema = schema;
            this._cache = {};
        };

        this._field = function (spec) {
            return (typeof spec === 'string') ? this.schema.get(spec) : spec;
        };

        this.vocabulary = function (spec) {
            var field = this._field(spec),
                choice = field.isChoice(),
                omit = (choice) ? ns.CHOICE_OMIT : [],
                idxTypes = field.index_types || ['field'],
                comparators = [].concat.apply(
                    [],
                    idxTypes.map(
                        function (idxtype) {
                            return ns.COMPARATORS_BY_INDEX[idxtype];
                        }
                    )
                ).filter(
                    function (info) {
                        return (omit.indexOf(info) === -1);
                    }
                );
            return comparators;
        };

        this.init(schema);
    };
    return ns;

}(jQuery, uu.queryschema || {}, uu, window[COREMODELNS], window));


// queryeditor module:
uu.queryeditor = (function ($, ns, uu, core, global) {
    "use strict";

    var cAjax = uu.queryschema.cAjax,
        schemaURL = uu.queryschema.schemaURL;

    /**
     * schema acquisition functions, used for property descriptor on
     * the containment chain of objects, such that contained FieldQuery,
     * RecordFilter, and FilterGroup items could get the schema from
     * the containing ComposedQuery object:
     */

    function acquire_schema(context) {
        var parent = context.context;
        if (parent) {
            return context._schema || parent.schema;
        }
        return context._schema;  // end of chain, may be undefined or null
    }

    function initSchemaContext(context) {
        Object.defineProperty(
            context,
            'schema',
            {
                get: function () {
                    return acquire_schema(this);
                }
            }
        );
    }

    // invariant for component construction options:
    function validateOptions(options) {
        // no empty options, given other constraints:
        if (!options) {
            throw new Error('no provided construction options');
        }
        // EVERY component must be constructed with either a schema or
        // a context that can provide the schema.
        if (!(options.schema instanceof uu.queryschema.Schema)) {
            if (!options.context) {
                throw new Error(
                    'Construction must be provided either schema or context.'
                    );
            }
        }
    }

    // unloaded singleton default values:
    ns.schema = null;           // will be ns.Schema instance
    ns.comparators = null;      // later ns.Comparators instance

    // named snippets of HTML for use in creation:
    ns.snippets = {};

    // RecordFilter (inner) HTML: must be modified to change ids
    ns.snippets.RECORDFILTER = String() +
        '  <table class="queries">' +
        '   <tbody>' +
        '    <tr class="headings">' +
        '      <th class="display-queryop">&nbsp;</th>' +
        '      <th>Field</th><th>Comparison</th>' +
        '      <th>Value</th>' +
        '      <th class="rowcontrol">&nbsp;</th>' +
        '    </tr>' +
        '    <tr class="placeholder">' +
        '      <td class="noqueries" colspan="4">' +
        '        <em>There are no queries defined for this filter.</em>' +
        '      </td>' +
        '    </tr>' +
        '   </tbody>' +
        '  </table>' +
        '  <a class="addquery">' +
        '    <span>' +
        '      <strong>&#x2b;</strong>' +
        '      Add a field query to this filter' +
        '    </span>' +
        '  </a>' +
        '  <div class="queryop-selection">' +
        '    <h5>' +
        '      Select an operation to apply across' +
        '      multiple selected fields.</h5>' +
        '    <input type="radio"' +
        '           name="queryop"' +
        '           value="AND"' +
        '           checked="CHECKED"' +
        '           id="queryop-AND" />' +
        '    <label for="queryop-AND">AND</label>' +
        '    <input type="radio"' +
        '           name="queryop"' +
        '           value="OR"' +
        '           id="queryop-OR"' +
        '           />' +
        '    <label for="queryop-OR">OR</label>' +
        '  </div>';

    ns.snippets.NEWROW = String() +
        '<tr>' +
        ' <td class="display-queryop">&nbsp;</td>' +
        ' <td class="fieldspec"></td>' +
        ' <td class="compare"></td>' +
        ' <td class="value"></td>' +
        ' <td class="rowcontrol">' +
        '  <a class="removerow" title="Remove query row">' +
        '   <img src="./delete_icon.png" alt="delete"/>' +
        '  </a>' +
        ' </td>' +
        '</tr>';

    ns.snippets.PLACEHOLDER = String() +
        '<tr class="placeholder">' +
        ' <td class="noqueries" colspan="5">' +
        '  <em>There are no queries defined for this filter.</em>' +
        ' </td>' +
        '</tr>';

    ns.snippets.NOVALUE = String() +
        '<option value="--NOVALUE--">--Select a value--</option>';

    ns.NOVALUE = $(ns.snippets.NOVALUE).attr('value');

    ns.warnfn = null;

    // warn function, can be overridden if needed:
    ns.warn = function warn(message) {
        var fn = ns.warnfn || alert;
        fn(message);
    };

    /**
     * FieldQuery:  item contains info for one basic query of a single
     *              field.
     */
    ns.FieldQuery = function FieldQuery(options) {

        initSchemaContext(this);

        // normalize and validate field, return normalized value
        this.validateField = function (v) {
            var existing = this._field;
            if (v === null) {
                return v;
            }
            if (typeof v === 'string') {
                v = this.schema.get(v);  // fieldname -> field
            }
            if (!(v instanceof uu.queryschema.Field)) {
                throw new TypeError('Invalid field type');
            }
            if (this.schema.keys().indexOf(v.name) === -1) {
                throw new Error('improper field, not in schema');
            }
            if (this.context && this.context.fieldnameInUse(v.name)) {
                if (!existing || (existing && existing.name !== v.name)) {
                    // fieldname is in use, but not by this FieldQuery:
                    // treat as duplicate/conflict, warn and return existing:
                    ns.warn('Field already in use in this filter: ' + v.title);
                    return this._field;
                }
            }
            return v;
        };

        Object.defineProperties(
            this,
            {
                field: {
                    get: function () {
                        return this._field;
                    },
                    set: function (v) {
                        v = this.validateField(v);  // validate, normalize
                        this._field = v;
                        this.sync();
                    },
                    enumerable: true
                },
                comparator: {
                    get: function () {
                        return this._comparator;
                    },
                    set: function (v) {
                        this._comparator = v;
                        this.sync();
                    },
                    enumerable: true
                },
                value: {
                    get: function () {
                        return this._value;
                    },
                    set: function (v) {
                        this._value = v;
                        this.sync();
                    },
                    enumerable: true
                },
            }
        );

        this._mktarget = function () {
            var self = this,
                target = $(ns.snippets.NEWROW),
                context = this.context || {},
                container = $(context.target);
            if (container.length) {
                target.appendTo($('table.queries tbody', container));
                this.target = target;
                target.attr('id', this.targetId);
                $('a.removerow', target).click(function () {
                    target.remove();
                    context.delete(self.id);
                    context.sync(self);
                });
                this.sync();
            }
        };

        this.init = function (options) {
            validateOptions(options);
            ns.FieldQuery.prototype.init.apply(this, [options]);
            this._field = options.field || null;
            this._comparator = options.comparator || null;
            this._value = options.value || null;
            this._schema = options.schema || undefined;
            if (this._field && this.schema) {
                if (!this.schema.has(this._field.name)) {
                    throw new Error('Field in ctor not in bound schema');
                }
            }
            if (!options.target && options.context) {
                this._mktarget();
            }
        };

        this.completionState = function () {
            var field = this._field,
                comparator = this._comparator,
                value = this._value;
            if (!field && !comparator && !value) {
                return null;   // EMPTY, nothing defined yet
            }
            if (field && comparator && value) {
                if (value instanceof Array && value.length === 0) {
                    return false;  // empty selection is incomplete
                }
                return true;
            }
            return false;  // incomplete, but not empty
        };

        // value widget type determiner:
        this.inputType = function () {
            var field = this.field,
                comparator = this.comparator || 'Eq',
                choice = (!!field) ? field.isChoice() : false,
                chooseOnlyOne = (['Any', 'All'].indexOf(comparator) === -1),
                select;
            if (!field || !comparator) {
                return null;
            }
            if (choice) {
                select = (field.vocabulary().length <= 3) ? 'radio' : 'select';
                return (chooseOnlyOne) ? select : 'multi';
            }
            return 'input';  // fallback/default
        };

        // UI/view sync:

        this.initFieldWidget = function () {
            var self = this,
                schema = this.schema,
                //fields = this.context.fields,
                rowname = this.targetId,
                row = $('#'+rowname, this.context.target),
                cell = $('td.fieldspec', row),
                selname = rowname + '-fieldname',
                select = $('<select />');
            select.attr('name', selname);
            // clear any existing content of cell (empty)
            cell.empty();
            // append select to cell
            select.appendTo(cell);
            // no-value sentinel for dropdown:
            $(ns.snippets.NOVALUE).appendTo(select);
            select.val(ns.NOVALUE);
            // options, given params
            schema.forEach(function (field) {
                var fieldname = field.name,
                    isSelected = (self.field && self.field.name === fieldname),
                    option = $('<option />')
                        .appendTo(select)
                        .attr('value', fieldname)
                        .text(field.title);
                if (isSelected) {
                    select.val(fieldname);
                }
            });
            // event callback for change of selected field
            select.change(function () {
                var fieldname = select.val(),
                    field = schema.get(fieldname);
                self.field = (field) ? field : null;
            });
        };

        // hooks to sync dependent components
        this.preSync = function (observed) {};
        this.postSync = function (observed) {};
        this.syncTarget = function (observed) {
            this.initFieldWidget();
        };

        this.init(options);
    };
    core.klass.subclasses(ns.FieldQuery, core.Item);

    /**
     * RecordFilter: Container of ordered FieldQuery objects
     */
    ns.RecordFilter = function (options) {

        initSchemaContext(this);

        Object.defineProperties(
            this,
            {
                operator: {
                    get: function () {
                        return this._operator || 'AND';
                    },
                    set: function (v) {
                        if (v !== 'AND' && v !== 'OR') {
                            throw new Error('invalid operator value');
                        }
                        this._operator = v;
                    }
                }
            }
        );

        this.syncQueryOpDisplay = function () {
            var table = $('table.queries', this.target),
                showrows = $('tr', table).not('.headings').slice(1),
                queryOpCells = $('td.display-queryop', showrows);
            queryOpCells.text(this.operator);
        };

        this.newQuery = function () {
            var q = new ns.FieldQuery({
                context: this
            });
            this.add(q);
            if (this.target) {
                this.syncQueryOpDisplay();
            }
        };

        this.initView = function () {
            var self = this,
                target = $(this.target),
                innerhtml = $(ns.snippets.RECORDFILTER),
                addHandler = function () {
                    var btn = $(this);
                    self.newQuery();
                    self.sync();
                };
            if (!target.length) {
                throw new Error('no DOM target for record filter.');
            }
            target.attr('id', this.targetId);
            target.addClass('record-filter');
            target.empty();
            innerhtml.appendTo(target);
            $('a.addquery', target).click(addHandler);
            this.initQueryopInputs();
            this.sync();
        };

        this.init = function (options) {
            validateOptions(options);
            ns.RecordFilter.prototype.init.apply(this, [options]);
            this._schema = options.schema || undefined;
            if ($(this.target).length) {
                this.initView();
            }
        };


        // UI bits:

        this.syncQueryOperatorSelector = function () {
            var opdiv = $('div.queryop-selection', this.target);
            if (this.size() >= 2) {
                opdiv.show();
            } else {
                opdiv.hide();
            }
        };

        this.initQueryopInputs = function () {
            var self = this,
                opdiv = $('div.queryop-selection', this.target),
                opinputs = $('input', opdiv);
            this._operator = 'AND';
            opinputs.change(function () {
                var showOp = (self.size() >= 2),
                    table = $('table.queries', self.target),
                    showrows = $('tr', table).not('.headings').slice(1),
                    queryOpCells = $('td.display-queryop', showrows),
                    operator = opinputs.filter(':checked').val() || 'AND';
                self.operator = operator;
                if (showOp) {
                    queryOpCells.text(self.operator);
                } else {
                    queryOpCells.text(' ');
                }
                self.sync();
            });
        };

        // hooks to sync dependent components
        this.preSync = function (observed) {};
        this.postSync = function (observed) {};
        this.syncTarget = function (observed) {
            var tbody = $('table.queries tbody', this.target),
                placeholder = $('tr.placeholder', tbody);
            if (this.size()) {
                placeholder.remove();
            } else {
                if (!placeholder.length) {
                    $(ns.snippets.PLACEHOLDER).appendTo(tbody);
                }
            }
            this.syncQueryOperatorSelector();
        };

        // container change hooks:
        this.afterAdd = function (key, value) {
            this.sync();
        };

        this.afterDelete = function (key, value) {
            this.sync();
        };

        this.onReorder = function (previous, current, note) {
            this.sync();
        };

        // factory methods for ns.FieldQuery objects contained:
        this.addQuery = function (options) {
            var query = new ns.FieldQuery(options);
        };

        // de-dupe checker, used by FieldQuery validation
        this.fieldnameInUse = function (name) {
            var qField = function (q) { return (q.field && q.field.name); },
                inUse = this.values().map(qField);
            return (inUse.indexOf(name) !== -1);
        };

        this.init(options);
    };
    core.klass.subclasses(ns.RecordFilter, core.Container);

    /**
     * FilterGroup: Container of ordered RecordFilter objects
     */
    ns.FilterGroup = function (options) {

        initSchemaContext(this);

        this.init = function (options) {
            validateOptions(options);
            ns.FilterGroup.prototype.init.apply(this, [options]);
            this._schema = options.schema || undefined;
        };

        this.init(options);
    };
    core.klass.subclasses(ns.FilterGroup, core.Container);

    /**
     * ComposedQuery: Container of ordered FilterGroup objects
     */
    ns.ComposedQuery = function (options) {

        initSchemaContext(this);

        this.init = function (options) {
            validateOptions(options);
            ns.ComposedQuery.prototype.init.apply(this, [options]);
            this._schema = options.schema || undefined;
        };

        this.init(options);
    };
    core.klass.subclasses(ns.ComposedQuery, core.Container);


    // application initialization

    ns.editorReady = function () {
    };

    ns.initUI = function () {
        // load global configuration for editor, then call editorReady
        // as callback.
        cAjax({
            url: schemaURL(),
            success: function (data) {
                ns.schema = new uu.queryschema.Schema(data);
                ns.comparators = new uu.queryschema.Comparators(ns.schema);
                ns.editorReady();
            }
        });
    };

    $(document).ready(function () {
        var target = $('<div>').appendTo($('div.editor')),
            schema = new uu.queryschema.Schema(uu.queryschema.mockSchema),
            rfilter = new uu.queryeditor.RecordFilter({
                target: target,
                schema: schema
            });

        //ns.initUI();
    });

    return ns;

}(jQuery, uu.queryeditor || {}, uu, window[COREMODELNS], window));
