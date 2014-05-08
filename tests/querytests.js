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

    ns.tests['schema and comparator tests'] = function () {
        var schema, comparators, tests,
            callCache = uu.queryschema.apiCallCache,
            cAjax = uu.queryschema.cAjax;

        // set up ajax mocks by pre-filling the cache:
        callCache[uu.queryschema.schemaURL()] = mockSchema;

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
            }
        };

        return tests;
    };

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
