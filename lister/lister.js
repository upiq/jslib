/*jshint browser: true, nomen: false, eqnull: true, es5:true, trailing:true */

var lister = lister || {};  //ns

(function ($, ns) {
    "use strict";

    $.extend($.easing, {
        easeInCubic: function (x, t, b, c, d) {
        return c*(t/=d)*t*t + b;
    }
    });

    // uuid function via http://stackoverflow.com/a/2117523/835961
    ns.uuid4_tmpl = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    ns.uuid4 = function () {
        return ns.uuid4_tmpl.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    };

    ns.snippets = {};

    ns.snippets.EMPTY = String() +
        '<div class="listwidget compact">' +
        '  <div class="listcontrol">' +
        '   <div class="toggle-switch">' +
        '    <a href="javascript:void(0)"' +
        '       class="toggle-button"' +
        '       title="Click to expand listing"' +
        '       tabindex="99">&#x25BA;</a>' +
        '   </div>' +
        '  </div>' +
        '  <ul class="list-chooser">' +
        '    <li class="search">' +
        '        <input tabindex="99"' +
        '               type="text"' +
        '               placeholder="Input search term or value" />' +
        '    </li>' +
        '  </ul>' +
        '  <div class="listing-footer"></div>' +
        '</div>';

    ns.snippets.ITEM = String() +
        '<li tabindex="99">' +
        '    <div class="term-actions">' +
        '        <a class="remove-term"' +
        '           href="javascript:void(0)"' +
        '           tabindex="99"' +
        '           title="Remove">&times;</a>' +
        '    </div>' +
        '    <input class="list-element" type="hidden" id="IDHERE" name="IDHERE:list" />' +
        '    <label for="IDHERE">Item title</label>' +
        '    <div class="details"></div>' +
        '</li>';

    ns.TRIANGLE_H = '&#x25BA;';
    ns.TRIANGLE_V = '&#x25BC;';


    ns.ListElement = function ListElement(data, prefix) {

        Object.defineProperties(
            this,
            {
                prefix: {
                    get: function () {
                        return this._prefix;
                    },
                    set: function (v) {
                        this._prefix = String() + v;
                        this._syncInputId();
                    }
                },
                elementId: {
                    get: function () {
                        var prefix = this.prefix,
                            id = this.id;
                        return (prefix) ? [prefix, id].join('-') : id;
                    },
                    set: function () {
                        // not user-settable
                    }
                }
            }
        );

        this._constructFromDOMElement = function (elem, prefix) {
            var widgetDiv = $(elem);
        };

        this.init = function (data, prefix) {
            if (data instanceof $ || data instanceof HTMLElement) {
                return this._constructFromDOMElement(data, prefix);
            }
            this.parent = null;  // set explicitly later
            this.id = data.id;
            this.name = data.name || data.id;
            this.title = data.title;
            this.url = data.url;
            this.description = data.description;
            this.prefix = prefix || '';
            this._mkElement();
        };

        this._syncInputId = function () {
            $('input.list-element', this.elem).attr(id, this.elementId);
        };

        this._mkElement = function () {
            this.elem = $(ns.snippets.ITEM);
            this.elem.attr('id', this.elementId);
            this.elem.attr('name', this.id);
            this.elem.attr('value', this.id);
        };

        this.attach = function (parent) {
            this.parent = parent;
            this.prefix = this.parent.id;  // setter auto-syncs INPUT id
            if (!this.parent.has(this.id)) {
                this.parent.add(this);
            }
        };

        this.showDetails = function () {

        };

        this.hideDetails = function () {

        };

        this.toggleView = function () {

        };

        this.init(data, prefix);
    };

    ns.ListWidget = function ListWidget(elem) {

        Object.defineProperties(
            this,
            {
                expanded: {
                    get: function () {
                        return this.elem.hasClass('expanded');
                    },
                    set: function (v) {
                        // cannot be user-set
                    }
                },
                animatedToggle: {
                    get: function () {
                        return this.elem.hasClass('animated-toggle');
                    },
                    set: function (v) {
                        if (v) {
                            this.elem.addClass('animated-toggle');
                        } else {
                            this.elem.removeClass('animated-toggle');
                        }
                    }
                }
            }
        );

        this.init = function (elem) {
            if (elem === undefined) {
                // no element to bind to => no pre-existing id; use random:
                this.id = ns.uuid4();
                // element not going to be inserted into DOM yet, that is
                //  the callers responsibility; after this is added to the
                //  DOM, the caller must then call either appendTo() or
                //  bindEvents() method to bind event handlers.
                this.elem = this.newElement(this.id);
            } else {
                this.elem = $(elem);
                this.id = elem.attr('id');
                if (!this.id) {
                    this.id = ns.uuid4();
                    elem.attr('id', this.id);
                }
                this.bindEvents();
            }
        };

        this.appendTo = function (parent) {
            $(parent).append(this.elem);
            this.bindEvents();
            return this.elem;
        };

        this.newElement = function (id) {
            return $(ns.snippets.EMPTY).attr('id', id).addClass('animated-toggle');
        };

        // display helpers:

        this.showDetails = function (context) {
            var item = $(context);
            if (!item.length || item[0].tagName !== 'LI') {
                item = $(
                    $(
                        'input.list-element[value=' + context.id + ']',
                        this.elem
                    ).parents('li')[0]);
            }
            item.toggleClass('expanded');
        };

        // Event bindings:
        this.bindEvents = function () {
            this.toggleHookup();
            this.keystrokeHookup();
        };

        this.toggleHookup = function () {
            var toggleBtn = $('.listcontrol .toggle-button', this.elem),
                self = this;
            toggleBtn.click(function (evt) {
                self.toggle();
            });
        };

        this.keystrokeHookup = function (context) {
            var items,
                item,
                self = this,
                keyUpHandler = function (evt) {
                    if ($.inArray(evt.which, [13, 33, 34, 38, 40, 46]) === -1) {
                        return true;  // ignore this keystroke
                    }
                    switch (evt.which) {
                        case 13:
                            // ENTER: Toggle class 'expanded' on LI
                            self.showDetails($(this));
                            break;
                        case 33:
                            // PgUp: Move to top
                            break;
                        case 34:
                            // PgDn: Move to bottom
                            break;
                        case 38:
                            // Cursor Up: move up one slot
                            break;
                        case 40:
                            // Cursor Down: move down one slot
                            break;
                        case 46:
                            // Del: remove element from list
                            break;
                    }
                    return false;
                },
                keyDownHandler = function (evt) {
                    if ($.inArray(evt.which, [13, 33, 34, 38, 40, 46]) !== -1) {
                        return false;  // ignore control keystroke, keyup will handle
                    }
                    if ($.inArray(evt.which, [9, 16]) !== -1) {
                        return true;  // shift /+ tab ==> default
                    }
                    return true;
                },
                keyPressHandler = function (evt) {
                    var searchCtl, c;
                    if (evt.which > 13) {
                        searchCtl = $('li.search input', self.elem).filter(':visible');
                        if (searchCtl.length) {
                            searchCtl.focus();
                            c = String.fromCharCode(evt.which);
                            searchCtl.val(searchCtl.val() + c);
                            return false;
                        }
                    }
                    return true;
                },
                bindAll = function (context) {
                    $(context).keydown(keyDownHandler);
                    $(context).keypress(keyPressHandler);
                    $(context).keyup(keyUpHandler);
                };
            if (context === undefined) {
                // no specific <li>, so hookup entire widget thus far
                items = $('li', this.elem).not('.search');
                items.each(function () {
                    bindAll(this);
                });
            } else {
                bindAll(context);
            }
        };

        // expand/contract widget
        this.expand = function () {
            if (this.animatedToggle) {
                return this.expandAnimate();
            }
            this.elem.addClass('expanded');
            $('a.toggle-button', this.elem).html('&#x25bc').blur();
        };

        this.expandAnimate = function () {
            var widgetDiv = this.elem,
                chooserUL = $('ul.list-chooser', widgetDiv),
                searchLI = $('li.search', widgetDiv),
                items = chooserUL.children('li').not('.search'),
                idx = 0,
                item,
                fxFn = {};
            if (!items.length) {
                return;  // do not expand empty list
            }
            fxFn.transformLI = function (item, idx) {
                // Given item and its index in UL, execute chain of animation fn:
                // stackItems, widenLI, completeLITransform
                fxFn.stackItems(item, idx);
            };
            fxFn.stackItems = function (item, idx) {
                var itemHeight = item.outerHeight(),
                    newTop = itemHeight * idx + 2*idx,
                    newLeft = -1 * item.position().left;
                item.css('max-width', '95%');
                chooserUL.css('height', itemHeight*(idx+1) + 2*idx);
                item.animate({top: newTop, left: newLeft}, 450, 'easeInCubic', fxFn.widenLI);
            };
            fxFn.widenLI = function () {
                var item = $(this);
                item.css({left:0, top:0, clear:'left'});
                item.animate({width: '95%'}, 450, fxFn.expandDetails);
            };
            fxFn.expandDetails = function () {
                var item = $(this);
                searchLI.css({'display': 'block', width:'95%', maxWidth: '95%'});
                $('input', searchLI).animate({width:'100%'}, 200);
                $('label', $(this)).animate(
                    {
                        fontSize:'115%',
                        lineHeight:'130%'
                    },
                    300,
                    fxFn.completeLITransform
                );
                chooserUL.css('height', 'auto');
                $('.details', $(this)).slideDown(300);
            };
            fxFn.completeLITransform = function () {
                $('a.toggle-button', widgetDiv).html(ns.TRIANGLE_V).blur();
                widgetDiv.addClass('expanded');
                // clear inline styles
                $('[style]', widgetDiv).removeAttr('style');
                $('a.toggle-button', widgetDiv).html('&#x25bc').blur();
            };
            chooserUL.css({
                overflow: 'visible'
            });
            items.css({
                display: 'block',
                top: 0
            });
            searchLI.css('display', 'none');
            for (idx = 0; idx < items.length; idx += 1) {
                item = $(items[idx]);
                fxFn.transformLI(item, idx);
            }
        };

        this.collapse = function () {
            this.elem.removeClass('expanded');
            $('li.expanded', this.elem).removeClass('expanded');
            $('a.toggle-button', this.elem).html('&#x25ba').blur();
        };

        this.toggle = function () {
            return (this.expanded) ? this.collapse() : this.expand();
        };

        this.init(elem);

    };

    function listToggle(evt) {
        /*jshint validthis:true */
        }

    $(document).ready(function () {
        //$('.listcontrol .toggle-button').click(listToggle);
        var widgetDivs = $('.listwidget');
        ns.widgets = ns.widgets || {};
        widgetDivs.each(function () {
            var div = $(this),
                widget = new ns.ListWidget(div);
            ns.widgets[widget.id] = widget;
        });
    });

}(jQuery, lister));

