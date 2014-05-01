/*jshint browser: true, nomen: false, eqnull: true, es5:true, trailing:true */


(function ($, qunit, core) {

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

        this.onReorder = function onReorder(previous, current, note) {
            this._old_order = previous;
            this._new_order = current;
            this._log.push(note);
            console.log(note);
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
        'item identification': function () {
            var item = new core.Item();
            equal(
                item.targetId,
                item.namespace + '/' + item.id,
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
                newns + '/' + mock.id,
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

    ns.tests['Container ordering adapter tests'] = (function () {

        // common fixures are shared state (closure) for this module:
        var item1 = new core.Item(),
            item2 = new core.Item(),
            item3 = new core.Item();
            mock = new ns.MockContainer({
                iterable: [
                    [item1.id, item1],
                    [item2.id, item2],
                    [item3.id, item3],
                ]
            }),
            original = [item1.id, item2.id, item3.id],
            adapter = new core.ContainerOrder(mock);

        return {
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
    }());

    ns.tests['Container tests'] = {
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
            ok(1==1);  // TODO replace boilerplatea
            // TEST construction with iterable
            // TEST construction with id
            // TEST construction with context
            // TEST construction with target
        },
        'test set/get': function () {
            ok(1==1);  // TODO replace boilerplate

        },
        'test containment (has)': function () {
            ok(1==1);  // TODO replace boilerplate

        },
        'test size': function () {
            ok(1==1);  // TODO replace boilerplate

        },
        'test enumeration': function () {
            ok(1==1);  // TODO replace boilerplate

        },
        'test after-deletion hook': function () {
            ok(1==1);  // TODO replace boilerplate

        },
        'test afterAdd hook': function () {
            ok(1==1);  // TODO replace boilerplate

        },
        'test reorder, post re-order hook': function () {
            ok(1==1);  // TODO replace boilerplate
            // TODO: test reorder of three items
            //  bottom, top, up, down
            // TODO: test that onReorder() hook on mock
            //       is fired on changes.
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
