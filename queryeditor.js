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

    ns.schemaURL = function () {
        return ($('base').attr('href') || '') + '/@@searchapi/fields';
    };

    ns.comparatorsBase = ($('base').attr('href') || '') +
        '/@@searchapi/comparators?symbols=1';

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

    // Field: object representing metadata for a single schema field:
    ns.Field = function Field(name, data) {

        this.init = function (name, data) {
            this.name = name;
            Object.keys(data).forEach(function (k) {
                var v = data[k];
                this[k] = (typeof v !== 'function') ? v : undefined;
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

    /**
     * Comparators: global adapts schema, can apply comparator choices
     *              to a callback for a field via applyComparators.
     */
    ns.Comparators = function Comparators(schema) {
        var apiBase = ns.comparatorsBase;

        this.init = function (schema) {
            this.schema = schema;
            this._cache = {};
        };

        this._field = function (spec) {
            return (typeof spec === 'string') ? this.schema.get(spec) : spec;
        };

        // async get and apply callback to fetched comparators
        this.applyComparators = function (fieldspec, callback) {
            var field = this._field(fieldspec),
                cachedResult = this._cache[field.name],
                idxtypes = 'byindex=' + field.index_types.join('+'),
                choice = field.isChoice(),
                url = apiBase + '&' + idxtypes + (choice ? '&choice=1' : '');
            if (cachedResult) {
                return callback(field, cachedResult);
            }
            ns.cAjax({
                url: url,
                async: true,
                context: this,
                success: function (data) {
                    this._cache[field.name] = data;
                    callback(field, data);
                }
            });
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
            return context._schema || context.context.schema;
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

    ns.snippets.NOVALUE = String() +
        '<option value="--NOVALUE--">--Select a value--</option>';

    ns.NOVALUE = $(ns.snippets.NOVALUE).attr('value');

    // warn function, can be overridden if needed:
    ns.warn = function warn(message) {
        alert(message);
    };

    /**
     * FieldQuery:  item contains info for one basic query of a single
     *              field.
     */
    ns.FieldQuery = function FieldQuery(options) {

        initSchemaContext(this);

        // normalize and validate field, return normalized value
        this.validateField = function (v) {
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
                if (this._field && this._field.name !== v.name) {
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
                }
            }
        );

        this.init = function (options) {
            validateOptions(options);
            ns.FieldQuery.prototype.init.apply(this, [options]);
            this._field = options.field || null;
            this._comparator = options.comparator || null;
            this._value = options.value || null;
            this._schema = options.schema || undefined;
        };

        // hooks to sync dependent components
        this.preSync = function (observed) {};
        this.postSync = function (observed) {};
        this.syncTarget = function (observed) {};

        this.init(options);
    };
    core.klass.subclasses(ns.FieldQuery, core.Item);

    /**
     * RecordFilter: Container of ordered FieldQuery objects
     */
    ns.RecordFilter = function (options) {

        initSchemaContext(this);

        this.init = function (options) {
            validateOptions(options);
            ns.RecordFilter.prototype.init.apply(this, [options]);
            this._schema = options.schema || undefined;
        };

        // hooks to sync dependent components
        this.preSync = function (observed) {};
        this.postSync = function (observed) {};
        this.syncTarget = function (observed) {};

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
        ns.initUI();
    });

    return ns;

}(jQuery, uu.queryeditor || {}, uu, window[COREMODELNS], window));
