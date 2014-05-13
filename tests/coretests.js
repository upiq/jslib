/*jshint browser: true, nomen: false, eqnull: true, es5:true, trailing:true, undef:true */
/*global jQuery, console, QUnit, COREMODELNS, window */

(function ($, qunit, core) {
    "use strict";

    var test = qunit.test,
        ok = qunit.ok,
        module = qunit.module,
        equal = qunit.equal,
        deepEqual = qunit.deepEqual,
        strictEqual = qunit.strictEqual,
        ns = {};  // internal namespace


    ns.MockContainer = function (kwargs) {
        this.namespace = 'mock';

        this._log = [];
        this._added = [];
        this._removed = [];

        this.onReorder = function onReorder(previous, current, note) {
            this._old_order = previous;
            this._new_order = current;
            this._log.push(note);
        };

        this.afterAdd = function (key, value) {
            var result = this.get(key) == value; // value contained after add
            this._added.push([key, result]);
        };

        this.afterDelete = function (key, value) {
            var result = (!!value && !this.has(key));
            this._removed.push([key, result]);
        };

        ns.MockContainer.prototype.init.apply(this, [kwargs]);

    };
    core.klass.subclasses(ns.MockContainer, core.Container);

    ns.MockContext = function () {

        this.target = {};

        this.updated = false;

        this.sync = function (observed) {
            this.updated = true;
            ns.MockContext.prototype.sync.apply(this, [observed]);
        };

        this.syncTarget = function (observed) {
            this.target.text('OK');
        };

        this.preSync = function (observed) {
            this._pre_sync_called = observed;
        };

        this.postSync = function (observed) {
            this._post_sync_called = observed;
        };

    };
    core.klass.subclasses(ns.MockContext, core.Item);

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

    ns.tests['klass module tests'] = {
        'inheritance introspection': function () {
            var plain = {},
                item = new core.Item(),
                container = new core.Container(),
                mock = new ns.MockContainer();
            ok(item instanceof core.Item, 'Base instanceof');
            ok(core.klass.all(item).length === 1, 'item bases');
            ok(core.klass.all(container).length === 2, 'container bases');
            ok(core.klass.all(mock).length === 3, 'deeper hierarchy');
            deepEqual(
                core.klass.all(container),
                [core.Container, core.Item],
                'Check two-level hierarchy'
            );
            deepEqual(
                core.klass.all(mock),
                [ns.MockContainer, core.Container, core.Item],
                'Check three-level hierarchy'
            );
            equal(
                core.klass.get(mock),
                ns.MockContainer
            );
            equal(
                core.klass.base(mock),
                core.Container
            );

        }
    };

    ns.tests['Item tests'] = {
        'item defaults': function () {
            var item = new core.Item();
            ok(core.id.isUUID(item.id), 'Item auto-UUID');
        },
        'item construction': function () {
            var uid = core.id.uuid4(),
                target = $('<div>'),
                context = new ns.MockContext(),
                item = new core.Item({
                    id: uid,
                    context: context,
                    target: target
                });
            equal(item.id, uid, 'id passed from contstruction');
            equal(item.target, target, 'target passed');
            equal(item.context, context, 'context passed');
        },
        'item identification': function () {
            var item = new core.Item();
            equal(
                item.targetId,
                item.namespace + '_' + item.id,
                'Compute target ID'
            );
        },
        'item namespaces': function () {
            var item = new core.Item(),
                container = new core.Container(),
                mock = new ns.MockContainer(),
                newns = 'mything';
            equal(item.namespace, 'item', 'default namespace 1');
            equal(container.namespace, 'container', 'default namespace 2');
            equal(mock.namespace, 'mock', 'default namespace 3');
            mock.namespace = newns;
            equal(mock.namespace, newns, 'per-instance namespace');
            equal(
                mock.targetId,
                newns + '_' + mock.id,
                'per-instance namespace, target id'
            );
        },
        'sync observers and context': function () {
            var item = new core.Item(),
                observer = new ns.MockContext(),
                context = new ns.MockContext();
            item.observers.push(observer);
            equal(item.observers.length, 1, 'observers length');
            equal(observer.updated, false, 'initial observer state');
            item.context = context;
            equal(item.context, context, 'context set');
            equal(context.updated, false, 'initial context state');
            item.sync();
            equal(observer.updated, true, 'synced observer state');
            equal(context.updated, true, 'synced context state');
        },
        'View/DOM target sync (subclass hook)': function () {
            var el = $('<div>'),
                item = new ns.MockContext();
            item.target = el;
            equal(item.target, el, 'Target set');
            ok(!el.text(), 'default target text');
            item.sync();
            equal(
                el.text(),
                'OK',   // set by MockContext.syncTarget()
                'default target text'
            );
        },
        'pre/post sync (subclass hook)': function () {
            var item = new ns.MockContext(),
                marker = {};
            strictEqual(
                item._pre_sync_called,
                undefined,
                'pre-sync, before call'
            );
            strictEqual(
                item._post_sync_called,
                undefined,
                'post-sync, before call'
            );
            item.sync(marker);
            equal(
                item._pre_sync_called,
                marker,
                'pre-sync, after call'
            );
            equal(
                item._post_sync_called,
                marker,
                'post-sync, after call'
            );
        }
    };

    ns.tests['Container ordering adapter tests'] = function (modname) {

        // common fixures are shared state (closure) for this module:
        var item1 = new core.Item(),
            item2 = new core.Item(),
            item3 = new core.Item(),
            mock = new ns.MockContainer({
                iterable: [
                    [item1.id, item1],
                    [item2.id, item2],
                    [item3.id, item3],
                ]
            }),
            original = [item1.id, item2.id, item3.id],
            adapter = new core.ContainerOrder(mock),
            adapter2 = new core.ContainerOrder(mock),
            tests;

        tests = {
            'order adaptation': function () {
                ok(mock.order instanceof core.ContainerOrder, 'Adapter test');
                ok(adapter instanceof core.ContainerOrder, 'Adaptation');
                equal(mock.order.context, mock, 'Adapter context');
                equal(adapter.context, mock, 'Adapter context 2');
            },
            'order reset': function () {
                var reorder1 = [item1.id, item3.id, item2.id],
                    reorder1_items = [item1, item3, item2];
                deepEqual(mock.keys(), original, 'Initial key order');
                mock.order.setOrder(reorder1);
                deepEqual(mock.keys(), reorder1, 'New key order');
                mock.order.setOrder(original);
                deepEqual(mock.keys(), original, 'Initial order restored');
                mock.order.setOrder(reorder1_items);
                deepEqual(mock.keys(), reorder1, 'New item order');
                mock.order.setOrder(original);
                deepEqual(mock.keys(), original, 'Initial order restored');
            },
            'order bounds test': function () {
                // Previous, current...
                deepEqual(mock.keys(), original, 'Initial key order');
                // bounds check, swallowing issues, means no move should
                // occur, thus no change in order:
                mock.order.moveUp(item1.id);
                deepEqual(mock.keys(), original, 'Bounds check up');
                mock.order.moveDown(item3.id);
                deepEqual(mock.keys(), original, 'Bounds check down');
                mock.order.moveUp(item1);
                deepEqual(mock.keys(), original, 'Bounds check up item');
                mock.order.moveDown(item3);
                deepEqual(mock.keys(), original, 'Bounds check down item');
                mock.order.moveToTop(item1.id);
                deepEqual(mock.keys(), original, 'Bounds check top');
                mock.order.moveToBottom(item3.id);
                deepEqual(mock.keys(), original, 'Bounds check bottom');
                mock.order.moveToTop(item1);
                deepEqual(mock.keys(), original, 'Bounds check top item');
                mock.order.moveToBottom(item3);
                deepEqual(mock.keys(), original, 'Bounds check bottom item');
            },
            'order move up': function () {
                deepEqual(mock.keys(), original, 'Initial key order');
                mock.order.moveUp(item3.id);
                deepEqual(
                    mock.keys(),
                    [item1.id, item3.id, item2.id],
                    'Move up by id'
                );
                mock.order.moveUp(item3);
                deepEqual(
                    mock.keys(),
                    [item3.id, item1.id, item2.id],
                    'Move up by value'
                );
                // clean up:
                mock.order.setOrder(original);
                deepEqual(mock.keys(), original, 'Initial key order');
            },
            'order move down': function () {
                deepEqual(mock.keys(), original, 'Initial key order');
                mock.order.moveDown(item1.id);
                deepEqual(
                    mock.keys(),
                    [item2.id, item1.id, item3.id],
                    'Move down by id'
                );
                mock.order.moveDown(item1);
                deepEqual(
                    mock.keys(),
                    [item2.id, item3.id, item1.id],
                    'Move down by value'
                );
                // clean up:
                mock.order.setOrder(original);
                deepEqual(mock.keys(), original, 'Initial key order');
            },
            'order move to top': function () {
                deepEqual(mock.keys(), original, 'Initial key order');
                mock.order.moveToTop(item3.id);
                deepEqual(
                    mock.keys(),
                    [item3.id, item1.id, item2.id],
                    'Move to top by id'
                );
                mock.order.moveToTop(item2);
                deepEqual(
                    mock.keys(),
                    [item2.id, item3.id, item1.id],
                    'Move top top by value'
                );
                // clean up:
                mock.order.setOrder(original);
                deepEqual(mock.keys(), original, 'Initial key order');
            },
            'order move to bottom': function () {
                deepEqual(mock.keys(), original, 'Initial key order');
                mock.order.moveToBottom(item1.id);
                deepEqual(
                    mock.keys(),
                    [item2.id, item3.id, item1.id],
                    'Move to bottom by id'
                );
                mock.order.moveToBottom(item2);
                deepEqual(
                    mock.keys(),
                    [item3.id, item1.id, item2.id],
                    'Move top bottom by value'
                );
                // clean up:
                mock.order.setOrder(original);
                deepEqual(mock.keys(), original, 'Initial key order');
            },
        };

        return tests;
    };

    ns.tests['Container tests'] = function (modname) {

        var item1 = new core.Item(),
            item2 = new core.Item(),
            item3 = new core.Item(),
            mock = new ns.MockContainer({
                iterable: [
                    [item1.id, item1],
                    [item2.id, item2],
                    [item3.id, item3],
                ]
            }),
            original = [item1.id, item2.id, item3.id],
            tests;

        tests = {
            'container defaults': function () {
                var container = new core.Container();
                ok(core.id.isUUID(container.id), 'Container auto-UUID');
                strictEqual(
                    container.target,
                    undefined,
                    'default target undefined'
                );
                strictEqual(
                    container.context,
                    undefined,
                    'default context undefined'
                );
            },
            'container construction': function () {
                var uid1 = core.id.uuid4(),
                    uid2 = core.id.uuid4(),
                    target = $('<div>'),
                    context = new ns.MockContext(),
                    container1 = new core.Container({
                        id: uid1,
                        target: target,
                        context: context,
                    }),
                    container2 = new core.Container({
                        id: uid2,
                        iterable: []
                    }),
                    container3 = new core.Container({
                        iterable: [item1, [item2.id, item2], item3]
                    });
                // TEST construction with iterable:
                equal(container3.size(), 3, 'construct with values: size');
                [item1, item2, item3].forEach(function (item) {
                    ok(container3.has(item.id), 'has() passed by item');
                    ok(container3.has(item), 'has() value passed by item');
                }, this);
                original.forEach(function (uid) {
                    ok(container3.has(uid), 'has() passed by id');
                }, this);
                // TEST construction with id
                equal(container1.id, uid1, 'id passed 1');
                equal(container2.id, uid2, 'id passed 2');
                // TEST construction with context
                equal(container1.context, context, 'context passed');
                // TEST construction with target
                equal(container1.target, target, 'target passed');
            },
            'test set/get/delete': function () {
                var uid1 = item1.id,
                    container = new core.Container();
                strictEqual(container.get(uid1), undefined, 'get before set');
                container.set(uid1, item1);
                strictEqual(container.get(uid1), item1, 'get after set');
                container.delete(uid1);
                strictEqual(container.get(uid1), undefined, 'get after rem');
            },
            'test add by value': function () {
                var uid1 = item1.id,
                    container = new core.Container();
                container.add(item1);
                strictEqual(container.get(uid1), item1, 'get after add');
                container.delete(uid1);
                strictEqual(container.get(uid1), undefined, 'get after rem');
            },
            'test containment (has)': function () {
                var uid1 = item1.id,
                    container = new core.Container();
                ok(!container.has(uid1), 'intial container has()');
                ok(!container.has(item1), 'intial container has()');
                equal(container.size(), 0, 'initial container size');
                container.set(uid1, item1);
                ok(container.has(uid1), 'intial container has()');
                ok(container.has(item1), 'intial container has()');
                equal(container.size(), 1, 'initial container size');
                container.delete(uid1);
                ok(!container.has(uid1), 'intial container has()');
                ok(!container.has(item1), 'intial container has()');
                equal(container.size(), 0, 'initial container size');
            },
            'test size': function () {
                var uid1 = item1.id,
                    container = new core.Container();
                equal(container.size(), 0, 'initial container size');
                container.set(uid1, item1);
                equal(container.size(), 1, 'initial container size');
                container.delete(uid1);
                equal(container.size(), 0, 'initial container size');
            },
            'test enumeration': function () {
                var container = new core.Container(),
                    items = [item1, item2, item3],
                    cb_called = 0,
                    callback = function (v, k, container) {
                        equal(container.get(k), v, 'callback eq');
                        cb_called += 1;
                    };
                items.forEach(function (item) {
                    container.add(item);
                }, this);
                // test original order, inclusion; note order change
                // is tested sufficiently elsewhere.
                deepEqual(container.keys(), original, 'keys()');
                deepEqual(container.values(), items, 'values()');
                deepEqual(
                    container.entries(),
                    items.map(function (o) { return [o.id, o]; }),
                    'entries()'
                );
                container.forEach(callback, this);
                equal(cb_called, items.length, 'callback count');
            },
            'test after-deletion hook': function () {
                var container = new ns.MockContainer({
                        iterable: [item1]
                    }),
                    removed_uid,
                    assertions_passed;
                container.delete(item1.id);
                removed_uid = container._removed[0][0];
                assertions_passed = container._removed[0][1];
                equal(removed_uid, item1.id, 'removed id');
                ok(assertions_passed, 'Value assertions in hook pass');
            },
            'test afterAdd hook': function () {
                var container = new ns.MockContainer(),
                    added_uid,
                    assertions_passed;
                // via add()
                container.add(item1);
                added_uid = container._added[0][0];
                assertions_passed = container._added[0][1];
                equal(added_uid, item1.id, 'added id');
                ok(assertions_passed, 'Value assertions in hook pass');
                // add an item via set():
                container.set(item2.id, item2);
                added_uid = container._added[1][0];
                assertions_passed = container._added[1][1];
                equal(added_uid, item2.id, 'added id');
                ok(assertions_passed, 'Value assertions in hook pass');
                // set an item already in, no hook fires:
                container.set(item2.id, item2);
                equal(container._added.length, 2, 'not fired on non-add set');
            },
            'test post re-order hook': function () {
                var container = new ns.MockContainer({
                        iterable: [item1, item2, item3]
                    });
                // testing assumption about implementation:
                //   avoid being repetitive, since hook is called by move()
                //   so we do not test each possible move action here
                deepEqual(container.keys(), original, 'initial key order');
                ok(
                    !container._old_order && !container._new_order,
                    'hook order undefined'
                );
                container.order.moveUp(item2.id);
                deepEqual(
                    container._old_order,
                    original,
                    'after move, hook previous key order'
                );
                deepEqual(
                    container._new_order,
                    [item2.id, item1.id, item3.id],
                    'after move, hook previous key order'
                );
            }
        };

        return tests;
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

}(jQuery, QUnit, window[COREMODELNS]));
