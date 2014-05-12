/*jshint browser: true, nomen: false, eqnull: true, es5:true, trailing:true, undef:true */
/*global jQuery, console, QUnit, COREMODELNS, window */

(function ($, qunit, core, uu, global) {
    "use strict";

    var test = qunit.test,
        ok = qunit.ok,
        module = qunit.module,
        equal = qunit.equal,
        deepEqual = qunit.deepEqual,
        strictEqual = qunit.strictEqual,
        throws = qunit.throws,
        mockSchema = {},
        comparatorMocks={},
        ns = {};  // internal namespace


    mockSchema = {
      "asthma_diagnosis_documented": {
        "description": "Asthma diagnosis (ICD-9 CD-9 range 493-493.92 or alternative practice codes) documented in the  problem list",
        "vocabulary": [
          "Yes",
          "No"
        ],
        "title": "Asthma Diagnosis Documented",
        "index_types": [
          "field"
        ],
        "fieldtype": "Choice",
        "name": "asthma_diagnosis_documented"
      },
      "appropirate__change__or__no_change_": {
        "description": "Appropriate change or appropriate \"no change\" in medication based on documented level of control",
        "vocabulary": [
          "Appropriate \"Change\"",
          "Appropriate \"No Change\"",
          "Inappropriate \"Change\"",
          "Inappropriate \"No Change\"",
          "No Documentation "
        ],
        "title": "Appropriate \"Change\" or \"No Change\"",
        "index_types": [
          "field"
        ],
        "fieldtype": "Choice",
        "name": "appropirate__change__or__no_change_"
      },
      "was_the_child_on_asthma_medication_prior_to_this_visit__": {
        "fieldtype": "Choice",
        "index_types": [
          "field"
        ],
        "name": "was_the_child_on_asthma_medication_prior_to_this_visit__",
        "vocabulary": [
          "Yes",
          "No"
        ],
        "title": "Was the child on asthma medication at the time of this visit? "
      },
      "use_of_asthma_inhalation_device_s__assessed": {
        "description": "Was the use of asthma inhalation device(s) assessed and proper technique reviewed?",
        "vocabulary": [
          "Yes",
          "No"
        ],
        "title": "Use of asthma inhalation device(s) assessed",
        "index_types": [
          "field"
        ],
        "fieldtype": "Choice",
        "name": "use_of_asthma_inhalation_device_s__assessed"
      },
      "patient_age_at_visit": {
        "index_types": [
          "field"
        ],
        "description": "Patient age in years",
        "name": "patient_age_at_visit",
        "fieldtype": "Int",
        "title": "Patient Age at Visit"
      },
      "asthma_severity": {
        "description": "This should only be documented if the child is not on medication. ",
        "vocabulary": [
          "Not Classified",
          "Intermittent",
          "Persistent: Mild",
          "Persistent: Moderate",
          "Persistent: Severe"
        ],
        "title": "Asthma Severity",
        "index_types": [
          "field"
        ],
        "fieldtype": "Choice",
        "name": "asthma_severity"
      },
      "follow_up_visit_with_pcp": {
        "fieldtype": "Choice",
        "index_types": [
          "field"
        ],
        "name": "follow_up_visit_with_pcp",
        "vocabulary": [
          "Yes: Scheduled",
          "Yes: Recommended",
          "No"
        ],
        "title": "Follow Up visit with PCP"
      },
      "date_of_visit": {
        "index_types": [
          "field"
        ],
        "name": "date_of_visit",
        "fieldtype": "Date",
        "title": "Date of Visit"
      },
      "ics_prescribed_": {
        "fieldtype": "Choice",
        "index_types": [
          "field"
        ],
        "name": "ics_prescribed_",
        "vocabulary": [
          "Yes",
          "No"
        ],
        "title": "ICS prescribed?"
      },
      "asthma_action_plan_up_to_date_and_on_file": {
        "fieldtype": "Choice",
        "index_types": [
          "field"
        ],
        "name": "asthma_action_plan_up_to_date_and_on_file",
        "vocabulary": [
          "Yes",
          "No"
        ],
        "title": "Asthma action plan up to date and on file"
      },
      "exposure_to_allergens_and_irritants_assessed_and_addressed": {
        "description": "Exposure to allergens and irritants assessed and addressed",
        "vocabulary": [
          "Yes",
          "No"
        ],
        "title": "Assess Exposure to Allergens/Irritants",
        "index_types": [
          "field"
        ],
        "fieldtype": "Choice",
        "name": "exposure_to_allergens_and_irritants_assessed_and_addressed"
      },
      "type_of_visit": {
        "index_types": [
          "text",
          "field"
        ],
        "name": "type_of_visit",
        "fieldtype": "TextLine",
        "title": "Type of Visit"
      },
      "asthma_control": {
        "description": "This should only be documented if the child is on medication at the time of the visit. ",
        "vocabulary": [
          "Well controlled",
          "Not well controlled",
          "Very poorly controlled",
          "Not assessed"
        ],
        "title": "Asthma Control",
        "index_types": [
          "field"
        ],
        "fieldtype": "Choice",
        "name": "asthma_control"
      },
      "referral": {
        "name": "referral",
        "vocabulary": [
          "Allergist",
          "Pulmonologist",
          "Other"
        ],
        "title": "Referral",
        "index_types": [
          "keyword"
        ],
        "value_type": "Choice",
        "fieldtype": "List"
      }
    };

    // comparatoryMocks keys are URL suffixes, which will be prepended
    // by the value of uu.queryschema.comparatorBase, then an ampersand
    comparatorMocks['byindex=field&choice=1'] = [
        ["Any", "* includes any of"],
        ["Eq", "= is equal to"],
        ["NotEq", "\u2260 is not"]
    ];

    comparatorMocks['byindex=keyword&choice=1'] = [
        ["All", "\u2286 contains all of"],
        ["Any", "* includes any of"],
        ["DoesNotContain", "\u2209 does not contain"]
    ];

    comparatorMocks['byindex=text+field'] = [
        ["Contains", "\u2208 contains"],
        ["DoesNotContain", "\u2209 does not contain"]
    ];

    ns.tests = {};

    ns.tests['Meta tests'] = {
        // QUnit is functioning properly:
        'tests run': function () {
            ok(1 == '1', 'QUnit loads, runs,');
        },
        // core is not undefined
        'core defined': function () {
            ok(core !== null && core !== undefined, 'Core namespace defined');
        },
        // expected packages available
        'module namespaces': function () {
            ok(!!global.uu, 'uu namespace');
            ok(!!uu.queryschema, 'uu.queryschema namespace');
            ok(!!uu.queryeditor, 'uu.queryeditor namespace');
        }
    };

    ns.tests['schema and comparator tests'] = function () {
        var schema, comparators, tests,
            callCache = uu.queryschema.apiCallCache,
            cAjax = uu.queryschema.cAjax,
            comparatorsBase = uu.queryschema.comparatorsBase + '&';

        // set up ajax mocks by pre-filling the cache (schema):
        callCache[uu.queryschema.schemaURL()] = mockSchema;

        // likewise for comparator result mocks:
        Object.keys(comparatorMocks).forEach(function (k) {
            var url = comparatorsBase + k,
                result = comparatorMocks[k];
            callCache[url] = result;
        }, this);

        tests = {
            'test schema ajax mock' : function () {
                var result = cAjax({
                    url: uu.queryschema.schemaURL(),
                    success: function (data) {
                        test('schema ajax mock result', function () {
                            deepEqual(data, mockSchema, 'mock data fetched');
                        });
                    }
                });
                ok(1===1);  // this test is a wrapper around async test
            },
            'test schema': function () {
                var schema = new uu.queryschema.Schema(mockSchema);
                deepEqual(schema.keys(), Object.keys(mockSchema), 'keys');
                schema.keys().forEach(function (k) {
                    var field = schema.get(k);
                    ok(field instanceof uu.queryschema.Field, 'field type');
                    equal(field.name, k, 'field name on field object');
                    equal(field.title, mockSchema[k].title, 'field title');
                    equal(field.description, mockSchema[k].description, 'desc');
                    equal(field.fieldtype, mockSchema[k].fieldtype, 'field type');
                    equal(field.valuetype, mockSchema[k].valuetype, 'value type');
                    if (['Choice', 'Bool', 'List'].indexOf(field.fieldtype) !== -1) {
                        ok(field.isChoice(), 'isChoice: ' + field.name);
                    }
                }, this);
                ok(1===1);
            },
            'test field comparators': function () {
                var schema = new uu.queryschema.Schema(mockSchema),
                    comparators = new uu.queryschema.Comparators(schema),
                    callback = function (field, data) {
                        if (field.fieldtype === 'List') {
                            test('applied callback: keyword index', function () {
                                var k = 'byindex=keyword&choice=1';
                                deepEqual(
                                    data,
                                    comparatorMocks[k],
                                    'Multiple choice / List / keyword compare'
                                    );
                            });
                        }
                        if (['Choice', 'Bool'].indexOf(field.fieldtype) !== -1) {
                            test('applied callback: field index', function () {
                                var k = 'byindex=field&choice=1';
                                deepEqual(
                                    data,
                                    comparatorMocks[k],
                                    'Single choice field index compare'
                                    );
                            });
                        }
                        if (field.fieldtype === 'TextLine') {
                            test('applied callback: text index', function () {
                                var k = 'byindex=text+field';
                                deepEqual(
                                    data,
                                    comparatorMocks[k],
                                    'Text field index compare'
                                    );
                            });
                        }
                    };
                strictEqual(schema, comparators.schema, 'bound schema');
                schema.keys().forEach(function (k) {
                    var field = schema.get(k);
                    if (['Choice', 'Bool', 'List'].indexOf(field.fieldtype) !== -1) {
                        comparators.applyComparators(field, callback);
                        comparators.applyComparators(k, callback);  // by fieldname
                    }
                    if (field.fieldtype === 'TextLine') {
                        comparators.applyComparators(field, callback);
                    }
                }, this);

            }
        };

        return tests;
    };


    ns.tests['short chain schema context'] = function () {
        var tests;

        tests = {
            'construct RecordFilter: options errors': function () {
                throws(
                    function constructWithoutOptions() {
                        var rfilter = new uu.queryeditor.RecordFilter();
                    },
                    Error,
                    'thows Error on no construction options'
                    );
                throws(
                    function constructWithEmptyOptions() {
                        var rfilter = new uu.queryeditor.RecordFilter({});
                    },
                    Error,
                    'thows Error on empty construction options'
                    );
            },
            'RecordFilter schema, no chain': function () {
                var schema = new uu.queryschema.Schema(mockSchema),
                    rfilter = new uu.queryeditor.RecordFilter({
                        schema: schema
                    });
                ok(
                    rfilter._schema instanceof uu.queryschema.Schema,
                    'Schema type'
                );
                strictEqual(rfilter._schema, rfilter.schema, 'Schema accessor');
            },
            'RecordFilter schema, short chain': function () {
                var schema = new uu.queryschema.Schema(mockSchema),
                    rfilter = new uu.queryeditor.RecordFilter({
                        schema: schema
                    }),
                    query = new uu.queryeditor.FieldQuery({
                        context: rfilter
                    });
                strictEqual(query.schema, rfilter.schema, 'acquired schema');
                ok(!query._schema, 'schema is acquired only');
            }
        };

        return tests;
    };


    ns.tests['validation tests'] = function () {
        var tests;

        tests = {
            'fieldquery with explicit schema': function () {
                ok(1===1); // TODO implement, remove boilerplate
            },
            'duplication check': function () {
                ok(1===1); // TODO implement, remove boilerplate
            }
        };

        return tests;
    };

/* 

    TEST CONSTRUCTION: 'short chain schema context'
    
    RecordFilter <#>--- FieldQuery
    
    ---
    
    1. Short chain construction errors:
    
        a. attempt to construct a RecordFilter without options throws error.
        b. attempt to construct a RecordFilter with empty options throws error.
    
    2. Short chain schema context:
    
        a. Construct RecordFilter with schema passed in options.
            * No errors on doing this
            * assert that rfilter._schema instanceof uu.queryschema.Schema
            * strictEqual(rfilter._schema, rfilter.schema, 'Schema accessor')
        
        b. Construct a FieldQuery without a schema, but with a passed context
            in the options passed to construction.
            * strictEqual(query.schema, rfilter.schema, 'acquired schema')
            * ok(!query._schema, 'no embedded schema, schema is acquired only')

    3. Validation tests:
    
        a. Create a FieldQuery with an explicit schema...
        
            * Attempt to set query.field with an null value should succeed.
            * Attempt to set query.field with any object that is not null or
                an instance of Field should throw an error.
            * Attempt to set query.field with a field not in schema should 
                throw an error.
            * Attempt to set valid field works, and valiation function
                returns expected field.
            * Attempt to set a valid field by FIELDNAME also works likewise.

        b. Duplication:
            
            * Create RecordFilter with two FieldQuery objects contained.
                * rfilter manages schema
            * query1 set field.
            * Attempt to set field already managed should warn
                * monkey patch the ns.warn?
            * Attempt to set field already managed should keep existing
               field value on change from non-null value.

*/





    $(document).ready(function () {
        var key;
        qunit.config.reorder = false;
        Object.keys(ns.tests).forEach(function (modname) {
            var suite = ns.tests[modname];
            module(modname);
            if (typeof suite === 'function') {
                suite = suite();
            }
            Object.keys(suite).forEach(function (k) {
               var fn = suite[k];
                test(k, fn);
            });
        });
    });

}(jQuery, QUnit, window[COREMODELNS], window.uu, window));
