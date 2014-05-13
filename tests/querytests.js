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

    ns.tests['schema and comparator tests'] = function (modname) {
        var schema, comparators, tests,
            callCache = uu.queryschema.apiCallCache,
            cAjax = uu.queryschema.cAjax,
            comparatorsBase = uu.queryschema.comparatorsBase + '&';

        // set up ajax mocks by pre-filling the cache (schema):
        callCache[uu.queryschema.schemaURL()] = mockSchema;

        tests = {
            'test schema ajax mock' : function () {
                var result = cAjax({
                    url: uu.queryschema.schemaURL(),
                    success: function (data) {
                        module(modname);
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
                    comparators = new uu.queryschema.Comparators(schema);
                strictEqual(schema, comparators.schema, 'bound schema');
                schema.keys().forEach(function (k) {
                    var field = schema.get(k),
                        c = uu.queryschema.comparators,
                        choiceExpected = [c.ANY, c.EQ, c.NOTEQ],
                        byIndex = uu.queryschema.COMPARATORS_BY_INDEX,
                        textExpected = byIndex.text,
                        fieldExpected = byIndex.field,
                        vocab,
                        i,
                        term;
                    if (['Choice', 'Bool'].indexOf(field.fieldtype) !== -1) {
                        vocab = comparators.vocabulary(field);
                        deepEqual(vocab, choiceExpected, 'Choice vocab');
                    }
                    if (field.fieldtype === 'TextLine') {
                        vocab = comparators.vocabulary(field);
                        for (i=0; i<textExpected.length; i++) {
                            term = textExpected[i];
                            ok(vocab.indexOf(term) !== -1, 'term / text');
                        }
                        for (i=0; i<fieldExpected.length; i++) {
                            term = fieldExpected[i];
                            ok(vocab.indexOf(term) !== -1, 'term / field');
                        }
                    }
                }, this);
            }
        };

        return tests;
    };


    ns.tests['schema context'] = function (modname) {
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
            },
            'Complete chain of schema context': function () {
                var schema = new uu.queryschema.Schema(mockSchema),
                    composed = new uu.queryeditor.ComposedQuery({
                        schema: schema
                    }),
                    group = new uu.queryeditor.FilterGroup({
                        context: composed
                    }),
                    rfilter = new uu.queryeditor.RecordFilter({
                        context: group
                    }),
                    query = new uu.queryeditor.FieldQuery({
                        context: rfilter
                    });
                strictEqual(query.schema, rfilter.schema, 'acquired schema');
                strictEqual(query.schema, group.schema, 'acquired schema');
                strictEqual(query.schema, composed.schema, 'acquired schema');
                ok(!query._schema, 'query schema is acquired only');
                ok(!rfilter._schema, 'filter schema is acquired only');
                ok(!group._schema, 'group schema is acquired only');
            }
        };

        return tests;
    };


    ns.tests['validation tests'] = function (modname) {
        var tests;

        tests = {
            'fieldquery with explicit schema': function () {
                var schema = new uu.queryschema.Schema(mockSchema),
                    allowedField = schema.values()[0],
                    query = new uu.queryeditor.FieldQuery({
                        schema: schema
                    }),
                    orphanField = new uu.queryschema.Field('orphan', {
                        title: 'Orphaned field, not in any schema',
                        fieldtype: 'Choice'
                    });
                // Attempt to set query.field with an null value should succeed
                query.field = null;
                strictEqual(query.field, null, 'null field value');
                // Attempt to set query.field with any object that is not null
                //   of an instance of Field should throw an error:
                throws(
                    function setInvalidFieldType() {
                        query.field = {};
                    },
                    TypeError,
                    'Invalid field type'
                    );
                // Attempt to set query.field with a field not in schema should
                //   throw an error.
                throws(
                    function setOrphanedField() {
                        query.field = orphanField;
                    },
                    Error,
                    'Field not in schema throws error'
                    );
                // Attempt to set valid field works, and valiation function
                //   returns expected field
                query.field = allowedField;
                strictEqual(
                    query.validateField(allowedField),
                    allowedField,
                    'validate/normalize returns field value'
                );
                // Attempt to set by fieldname is appropriately normalized
                query.field = allowedField.name;
                strictEqual(
                    query.field,
                    allowedField,
                    'validate/normalize returns field value'
                );
            },
            'duplication check': function () {
                var schema = new uu.queryschema.Schema(mockSchema),
                    rfilter = new uu.queryeditor.RecordFilter({
                        schema: schema
                    }),
                    query1 = new uu.queryeditor.FieldQuery({
                        context: rfilter
                    }),
                    query2 = new uu.queryeditor.FieldQuery({
                        context: rfilter
                    }),
                    field = schema.values()[0],
                    warn_msg;
                // set up uu.queryeditor.warnfn with special callback
                uu.queryeditor.warnfn = function (message) {
                    warn_msg = message;
                };
                query1.field = null;
                query2.field = null;
                rfilter.add(query1);
                rfilter.add(query2);
                strictEqual(query1.context, rfilter, 'context');
                strictEqual(query2.context, rfilter, 'context');
                query1.field = field;  // ok
                strictEqual(warn_msg, undefined);
                // Attempt to set a field in-use in another query will WARN:
                query2.field = field;  // in use!!
                equal(warn_msg.slice(0,20), 'Field already in use', 'warn');
                warn_msg = null;
                // Attempt to set field already managed should keep existing
                // field value on set from non-null value.
                query1.field = field;  // ok to set same value again
                strictEqual(warn_msg, null, 'no warning on valid set');
                strictEqual(query1.field, field, 'set twice');
                // revert monkey patch for warning plug:
                uu.queryeditor.warnfn = null;
            }
        };

        return tests;
    };

    ns.tests['FieldQuery state'] = function (modname) {
        return {
            'completion state': function () {
                var schema = new uu.queryschema.Schema(mockSchema),
                    field = schema.get('asthma_diagnosis_documented'),
                    query = new uu.queryeditor.FieldQuery({
                        schema: schema
                    });
                strictEqual(query.completionState(), null, 'EMPTY');
                query.field = field;
                strictEqual(query.completionState(), false, 'Incomplete');
                query.comparator = 'Any';
                strictEqual(query.completionState(), false, 'Incomplete');
                query.value = ['Yes', 'No'];  // what fun!
                strictEqual(query.completionState(), true, 'Complete');
                query.value = [];  // set empty
                strictEqual(query.completionState(), false, 'Empty value');
            }
        };
    };


    $(document).ready(function () {
        var key;
        qunit.config.reorder = false;
        Object.keys(ns.tests).forEach(function (modname) {
            var suite = ns.tests[modname];
            if (typeof suite === 'function') {
                suite = suite(modname);
            }
            Object.keys(suite).forEach(function (k) {
                var fn = suite[k];
                module(modname);
                test(k, fn);
            });
        });
    });

}(jQuery, QUnit, window[COREMODELNS], window.uu, window));
