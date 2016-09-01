Solr.Persistency = function (obj) {
  a$.extend(true, this, obj);
  this.storage = {};
};

Solr.Persistency.prototype = {
  __expects: [ Solr.Configuring ],
  
  persistentParams: [],   // Parameters that need to stay persistent between calls.

  addParameter: function (param, value, locals) {
    // TODO Check if the parameter is persistent and store it.
    
    // And make the call to the "super".
    a$.act(this, Solf.Configuring.prototype.addParameter, param, value, locals);
    return param;
  },
  
  /** Remove parameters. If needle is an array it is treated as an idices array,
    * if not - it is first passed to findParameters() call.
    */
  removeParameters: function (indices) {
    // TODO Check if the parameter is persistent and store it.
    
    // And make the call to the "super".
    a$.act(this, Solf.Configuring.prototype.removeParameters, indices);
  },
  
  /** The method that is invoked just before making the actual request.
    */
  onPrepare: function (settings) {
    
  }
};