/*jshint browser: true, nomen: false, eqnull: true, es5:true, trailing:true */


(function ($, qunit, core) {

    var test = qunit.test,
        ok = qunit.ok,
        module = qunit.module,
        equal = qunit.equal,
        deepEqual = qunit.deepEqual,
        strictEqual = qunit.strictEqual,
        ns = {};  // internal namespace

    ns.tests = {};

    ns.tests['Meta tests'] = {
        // QUnit is functioning properly:
        'tests run': function () {
            ok(1 == '1', 'QUnit loads, runs,');
        },
        // core is not undefined
        'core defined': function () {
            ok(core !== null && core !== undefined, 'Core namespace defined');
        }
    };

    ns.tests['core.id tests'] = {
        'uuid4 generation': function () {
            var generated = core.id.uuid4(),
                nodashes = generated.replace((/-/g),'');
            strictEqual(typeof generated, 'string', 'UUIDs are strings.');
            strictEqual(generated.length, 36, 'UUID length is 36.');
            strictEqual(nodashes.length, 32, 'UUID length, no dashes.');
        },
        'isUUID() tests': function () {
            var generated = core.id.uuid4(),
                nodashes = generated.replace((/-/g),'');
            ok(core.id.isUUID(generated), 'Valid UUID accepted.');
            ok(!core.id.isUUID(nodashes), 'Must have dashes.');
            ok(!core.id.isUUID(null), 'Null UUID rejected.');
            ok(!core.id.isUUID(12345), 'Non-string UUID rejected.');
        },
        'assignUID() tests': function () {
            var context1 = {},
                context2 = {'_uid': core.id.uuid4()},
                context3 = {'_uid': null},
                uid;
            // object without gets assigned:
            ok(!core.id.getUID(context1), 'Empty object has no initial UID.');
            uid = core.id.assignUID(context1);
            ok(
                core.id.getUID(context1) === uid,
                'Assigned UID on previously empty object matches accessor ' +
                'value.'
            );
            uid = core.id.getUID(context2);
            strictEqual(uid, core.id.assignUID(context2), 'No overwrite');
            ok(!core.id.getUID(context3), 'Object with null initial UID.');
            uid = core.id.assignUID(context3);
            ok(
                core.id.isUUID(core.id.getUID(context3)) &&
                    core.id.isUUID(uid),
                'Object with null re-assigned a UID.'
            );
            strictEqual(uid, core.id.getUID(context3), 'Overwrite null UID');
        },
        'UID getter/setter tests': function () {
            var context1 = {},
                context2 = {'_uid': core.id.uuid4()},
                context3 = {'_uid': null},
                uid;
            ok(!core.id.getUID(context1), 'No UUID for empty object');
            uid = core.id.uuid4();
            core.id.setUID(context1, uid);
            strictEqual(
                core.id.getUID(context1),
                uid,
                'UID set correctly, round-trip get correctly on previously ' +
                'empty object.'
            );
            uid = core.id.getUID(context2);
            core.id.setUID(context2, core.id.uuid4());
            ok(core.id.getUID(context2) !== uid, 'UID successfully modified');
            uid = core.id.uuid4();
            core.id.setUID(context3, uid);
            strictEqual(
                core.id.getUID(context3),
                uid,
                'UID set correctly, round-trip get correctly on object ' +
                'previously with null UID.'
            );
        }
    };

    $(document).ready(function () {
        var key;
        Object.keys(ns.tests).forEach(function (modname) {
            var suite = ns.tests[modname];
            module(modname);
            Object.keys(suite).forEach(function (k) {
                var fn = suite[k];
                test(k, fn);
            });
        });
    });

}(jQuery, QUnit, self[COREMODELNS]));
