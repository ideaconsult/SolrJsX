/** SolrJsX library - a neXt Solr queries JavaScript library.
  * Free text search skills.
  *
  * Author: Ivan Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */
  
Solr.Texting = function (settings) {
  a$.extend(true, this, a$.common(settings, this));
  this.manager = null;
};

Solr.Texting.prototype = {
  domain: null,         // Additional attributes to be adde to query parameter.
  customResponse: null, // A custom response function, which if present invokes priavte doRequest.
  
  /** Make the initial setup of the manager.
    */
  init: function (manager) {
    a$.pass(this, Solr.Texting, "init", manager);
    this.manager = manager;
  },
    
  /**
   * Sets the main Solr query to the given string.
   *
   * @param {String} q The new Solr query.
   * @returns {Boolean} Whether the selection changed.
   */
  setValue: function (q) {
    var before = this.manager.getParameter('q'),
        res = this.manager.addParameter('q', q, this.domain);
        after = this.manager.getParameter('q');
    return res && !a$.equal(before, after);
  },

  /**
   * Sets the main Solr query to the empty string.
   *
   * @returns {Boolean} Whether the selection changed.
   */
  clear: function () {
    return this.manager.removeParameters('q');
  },

  /**
   * Returns a function to unset the main Solr query.
   *
   * @returns {Function}
   */
  unclickHandler: function () {
    var self = this;
    return function () {
      if (self.clear())
        self.doRequest();

      return false;
    }
  },

  /**
   * Returns a function to set the main Solr query.
   *
   * @param {Object} src Source that has val() method capable of providing the value.
   * @returns {Function}
   */
  clickHandler: function (src) {
    var self = this;
    return function () {
      if (!el) 
        el = this;
      
      if (self.setValue(typeof el.val === "function" ? el.val() : el.value))
        self.doRequest();

      return false;
    }
  }
  
};
