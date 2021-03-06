/* Full Row View
 *
 * Handles 1D view containing one sub-category of elements
 *
 */

(function (exports) {
    "use strict";

    //module constants
    var ID_ONED_SHOVELER_CONTAINER   = "one-D-shoveler-container",
        
        ID_ONED_SUMMARY_TITLE     = "summaryTitle",

        ID_ONED_SUMMARY_DATE      = "summaryDate",

        ID_ONED_SUMMARY_DESC      = "summaryDesc";

    var TIME_TIMEOUT_DISPLAY_INFO = 350;

    /**
     * @class OneDView
     * @description The 1D view object, this handles everything about the 1D menu.
     */
    var OneDView = function () {
        // mixin inheritance, initialize this as an event handler for these events:
        Events.call(this, ['exit', 'startScroll', 'indexChange', 'stopScroll', 'select', 'bounce', 'loadComplete']);

        //global variables
        this.currSelection = 0;
        this.currentView   = null;
        this.titleText = null;
        this.$shovelerContainer = null;

        //jquery global variables
        this.$el = null;
        this.el = null;

       /**
        * Hide this view - use visibility instead of display
        * so that we don't loose any of our dynamic items
        */
        this.hide = function () {
            this.$el.css('visibility', 'hidden');
            this.shovelerView.hide();
        };

       /**
        * Display this view
        */
        this.show = function () {
            this.$el.css('visibility', 'visible');
            this.shovelerView.show();
        };

       /**
        * Remove the oneDView element
        */
        this.remove = function () {
            if(this.el) {
                $(this.el).remove();
            }
        };

       /**
        * Maintain the current view for event handling
        */
        this.setCurrentView = function (view) {
            this.currentView = view;
        };

        /**
         * Creates the one-d-view and attaches it to the application container
         * @param {Element} $el application container
         * @param {Object} rowData data object for the row
         */
        this.render = function ($el, rowData, displayButtonsParam) {
            //Make sure we don't already have a full container
            this.remove();

            // Build the main content template and add it
            this.titleText = rowData.title;
            this.rowElements = rowData;
            var html = utils.buildTemplate($("#one-D-view-items-template"), {});

            $el.append(html);
            this.$el = $el.children().last();
            this.el = this.$el[0];

            //gather widths of all the row elements
            this.$elementWidths = [];

            this.createShovelerView(rowData);
            this.createButtonView(displayButtonsParam, this.$el);

            this.setCurrentView(this.shovelerView);
        };

       /**
        * Initialize the shoveler subview
        * @param {Object} rowData data for the content items
        */
        this.createShovelerView = function (rowData) {
            // create the shoveler subview
            this.$shovelerContainer = this.$el.children("#" + ID_ONED_SHOVELER_CONTAINER);
            var shovelerView = this.shovelerView = new ShovelerView();
            this.shovelerView.render(this.$shovelerContainer, rowData);

            shovelerView.on('exit', function() {
                this.trigger('exit');
            }, this);

            shovelerView.on('select', function(index) {
                this.currSelection = index;
                this.trigger('select', index);
            }, this);

            shovelerView.on('bounce', function(direction) {
                 this.trigger('bounce', direction);
            }, this);

            shovelerView.on('startScroll', function(direction) {
                this.hideExtraData();
                this.trigger('startScroll', direction);
            }, this);

            shovelerView.on('stopScroll', function(index) {
                this.currSelection = index;
                this.showExtraData(index);
                this.trigger('stopScroll', index);
            }, this);

            shovelerView.on('indexChange', function(index) {
                this.currSelection = index;
                this.trigger('indexChange', index);
            }, this);

            shovelerView.on('loadComplete', function() {
                this.trigger('loadComplete');
                this.showExtraData();
             }, this);
        };

       /**
        * Create the buttons that will appear under the media content
        */
        this.createButtonView = function (displayButtonsParam, $el) {
            if(!displayButtonsParam) {return;}

            // create and set up the 1D view
            var buttonView = this.buttonView = new ButtonView();

            buttonView.on('exit', function() {
                this.trigger('exit');
            }, this);

            buttonView.render($el);
        };

       /**
        * Make the shoveler the active view
        */
        this.transitionToShovelerView = function () {
            //change to button view
            this.setCurrentView(this.shovelerView);

            //change opacity of the shoveler
            this.shovelerView.unfadeSelected();

            //set buttons back to static
            if(this.buttonView) this.buttonView.setStaticButton();
        };

       /**
        * Make the buttons the active view
        */
        this.transitionToButtonView = function () {
            //change to button view
            this.setCurrentView(this.buttonView);

            //change opacity of the shoveler
            this.shovelerView.fadeSelected();

            //set default selected button and apply selected style
            this.buttonView.setCurrentSelectedIndex(0);
            this.buttonView.setSelectedButton();
        };

       /**
        * Return to selected shoveler state 
        */
        this.transition = function () {
            this.shovelerView.unfadeSelected();
        };

       /**
        * Shrink the selected shoveler item for 'out of focus' effect
        */
        this.shrinkShoveler = function () {
            this.shovelerView.shrinkSelected();
        };

       /**
        * Expand the selected shoveler item for 'in focus' effect
        */
        this.expandShoveler = function () {
            this.shovelerView.setTransforms();
        };

        /**
         * Handle key events
         * @param {event} the keydown event
         */
        this.handleControls = function (e) {
            var dirty = false;

            // pressing play triggers select on the media element
            if (e.type === 'buttonpress') {
                switch (e.keyCode) {
                    case buttons.PLAY_PAUSE:
                        this.trigger('select', this.currSelection);
                    case buttons.UP:
                         if(this.currentView !== this.shovelerView) {
                             this.transitionToShovelerView();
                         } else {
                             this.trigger('bounce');
                         }
                         dirty = true;
                         break;
                    case buttons.DOWN:
                         if(this.buttonView && this.currentView !== this.buttonView) {
                             this.transitionToButtonView();
                         } 
                         dirty = true;
                         break;
                }
            }

            //use the dirty flag to make sure we are not handling the
            //event twice - once for this view and once in the child view
            if(!dirty) {
                this.currentView.handleControls(e);
            }
        }.bind(this);

        /**
         * Show summary text in the 1D View
         * @param {Number} index number of current element to show data for
         */
        this.showExtraData = function (index) {
            index = index || 0;

            window.setTimeout(function () {
                //add description
                $("#" + ID_ONED_SUMMARY_TITLE).html(this.rowElements[index].title);
                $("#" + ID_ONED_SUMMARY_DATE).html(this.rowElements[index].pubDate);
                $("#" + ID_ONED_SUMMARY_DESC).html(this.rowElements[index].description);
            }.bind(this), TIME_TIMEOUT_DISPLAY_INFO);
        };

        /**
         * Hide the text in the 1D view when scrolling starts
         */
        this.hideExtraData = function () {
            $("#" + ID_ONED_SUMMARY_TITLE).text("");
            $("#" + ID_ONED_SUMMARY_DATE).text("");
            $("#" + ID_ONED_SUMMARY_DESC).text("");
        };
    };

    exports.OneDView = OneDView;
}(window));
