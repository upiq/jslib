/** 
 * criteria.js: criteria editor / support advanced and basic criteria query
 *              editing.
 */

/*jshint browser: true, nomen: false, eqnull: true, es5:true, trailing:true,
         undef:true
 */
/*global jQuery, console, QUnit, COREMODELNS, window */


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
    ns.cAjax = function (config) {
        var url = config.url,
            callback = config.success,
            wrapper = function (data) {
                callback.call(this, data);
                ns.apiCallCache[url] = data;
            },
            context = config.context,
            cachedResult;
        if (!url || config.type === 'POST') return;  // uncachable
        cachedResult = ns.apiCallCache[url];
        if (cachedResult) {
            return (context) ? callback.call(context, cachedResult) : callback(cachedResult);
        }
        config.success = wrapper;
        $.ajax(config);
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

    // unloaded singleton default values:
    ns.schema = null;           // will be ns.Schema instance
    ns.comparators = null;      // later ns.Comparators instance

    // named snippets of HTML for use in creation:
    ns.snippets = {};

    ns.snippets.NOVALUE = String() +
        '<option value="--NOVALUE--">--Select a value--</option>';

    ns.NOVALUE = $(ns.snippets.NOVALUE).attr('value');

    /**
     * FieldQuery:  item contains info for one basic query of a single
     *              field.
     */
    ns.FieldQuery = function FieldQuery(kwargs) {

        Object.defineProperties(
            this,
            {
                field: {
                    get: function () {},
                    set: function (v) {},
                    enumerable: true
                },
                comparator: {
                    get: function () {},
                    set: function (v) {},
                    enumerable: true
                },
                value: {
                    get: function () {},
                    set: function (v) {},
                    enumerable: true
                }
            }
        );

        this.init = function (kwargs) {
            ns.FieldQuery.prototype.init.apply(this, [kwargs]);
        };

        // hooks to sync dependent components
        this.preSync = function (observed) {};
        this.postSync = function (observed) {};
        this.syncTarget = function (observed) {};

        this.init(kwargs);
    };
    core.klass.subclasses(ns.FieldQuery, core.Item);

    /**
     * RecordFilter: Container of ordered FieldQuery objects
     */
    ns.RecordFilter = function (kwargs) {

        this.init = function (kwargs) {
            ns.RecordFilter.prototype.init.apply(this, [kwargs]);
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


        this.init(kwargs);
    };
    core.klass.subclasses(ns.RecordFilter, core.Container);

    /**
     * FilterGroup: Container of ordered RecordFilter objects
     */
    ns.FilterGroup = function (kwargs) {

        this.init = function (kwargs) {
            ns.FilterGroup.prototype.init.apply(this, [kwargs]);
        };

        this.init(kwargs);
    };
    core.klass.subclasses(ns.FilterGroup, core.Container);

    /**
     * CompositeQuery: Container of ordered FilterGroup objects
     */
    ns.CompositeQuery = function (kwargs) {

        this.init = function (kwargs) {
            ns.CompositeQuery.prototype.init.apply(this, [kwargs]);
        };

        this.init(kwargs);
    };
    core.klass.subclasses(ns.CompositeQuery, core.Container);


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
