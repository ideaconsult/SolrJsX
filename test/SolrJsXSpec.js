asSys = require("@thejonan/as-sys");
Solr = require("../");

a$ = asSys;

describe("SolrJsX:", function () {
	// Now - GO with the tests.
	describe("Configuration:", function () {
  	
  	it("Adds/Gets raw parameter", function () {
  	  var main = new (a$(Solr.Configuring))();
    	main.addParameter("rows", 20);
    	expect(main.getParameter("rows").value).toBe(20);
  	});
  	
  	it("Adds/Gets single-parameter", function () {
  	  var main = new (a$(Solr.Configuring))();
    	main.addParameter("q", "field1:value1");
    	main.addParameter("q", "field2:value2");
    	expect(main.getParameter("q")).toEqual({ name: "q", value: "field2:value2" });
  	});

  	it("Adds/Gets multi-parameter", function () {
  	  var main = new (a$(Solr.Configuring))();
    	main.addParameter("fq", "field1:value1");
    	main.addParameter("fq", "field2:value2");
    	expect(main.getParameter("fq")).toEqual([ { name: "fq", value:"field1:value1" }, { name: "fq", value: "field2:value2" }]);
  	});

  	it("Removes multi-parameter", function () {
  	  var main = new (a$(Solr.Configuring))();
    	main.addParameter("fq", "field1:value1");
    	main.addParameter("fq", "field2:value2");
    	main.removeParameters("fq", 0);
    	expect(main.getParameter("fq", 0)).toEqual({ name: "fq", value:"field2:value2" });
  	});
  	
  	it("Resets the parameters store", function () {
  	  var main = new (a$(Solr.Configuring))();
    	main.addParameter("fq", "field1:value1");
    	main.resetParameters();
    	expect(main.parameterStore).toEqual({});
  	});
	});
	
	describe("Listenning", function () {
  	var aListener = { id: "a" };
  	  	
  	it("Can add listeners", function () {
      var topic = new (a$(Solr.Management, Solr.Configuring, Solr.QueryingURL))();
    	topic.addListeners(aListener);
    	expect(a$.weight(topic.listeners)).toBe(1);
  	});

    it("Listener can be removed", function () {
      var topic = new (a$(Solr.Management, Solr.Configuring, Solr.QueryingURL))();
      topic.addListeners(aListener);
      topic.removeListener("a");
      expect(a$.weight(topic.listeners)).toBe(0);
    })

    it("Many consumers can be removed", function () {
      var topic = new (a$(Solr.Management, Solr.Configuring, Solr.QueryingURL))();
      topic.addListeners(aListener);
      topic.addListeners({ id: "b" });
      topic.removeManyListeners(function (c, i) { return i == "a"; });
      expect(a$.weight(topic.listeners)).toBe(1);
      expect(topic.getListener("b")).toBeDefined();
    })
    
    it("Can enumerate consumers", function () {
      var topic = new (a$(Solr.Management, Solr.Configuring, Solr.QueryingURL))();
      topic.addListeners(aListener);
      topic.addListeners({ id: "b" });
      var ctx = { count: 0 };
      topic.enumerateListeners(function (c, i, context) { ++context.count; }, ctx);
      expect(ctx.count).toBe(2);
    });
	});
	
	describe("Making URL-based queries", function () {
  	
  	it("Forms the URL on simple parameters", function () {
      var main = new (a$(Solr.Configuring, Solr.QueryingURL))();
    	main.addParameter("q", "f:v");
    	main.addParameter("rows", 20);
    	expect(main.prepareQuery()).toEqual({ url: "?q=f%3Av&rows=20" });
  	});

  	it("Forms the URL on multi parameters", function () {
      var main = new (a$(Solr.Configuring, Solr.QueryingURL))();
    	main.addParameter("q", "*:*");
    	main.addParameter("fq", "field1:value1");
    	main.addParameter("fq", "field2:value2");
    	main.addParameter("json.nl", "map");
    	expect(main.prepareQuery()).toEqual({ url: "?q=*%3A*&fq=field1%3Avalue1&fq=field2%3Avalue2&json.nl=map" });
    });
    
  	it("Properly resets parameters", function () {
      var main = new (a$(Solr.Configuring, Solr.QueryingURL))();
    	main.addParameter("fq", "field1:value1");
    	main.addParameter("fq", "field2:value2");
    	main.resetParameters();
    	main.addParameter("q", "f:v");
    	main.addParameter("rows", 20);
    	expect(main.prepareQuery()).toEqual({ url: "?q=f%3Av&rows=20" });
  	});
  	
  	// TODO: Add some escapeValue involving tests
  	
	});
	
	describe("Json-based querying", function () {
  	
  	it ("Prepares the query settings", function () {
      var main = new (a$(Solr.Configuring, Solr.QueryingJson))();
    	main.addParameter("q", "f:v");
    	main.addParameter("rows", 20);
    	expect(main.prepareQuery()).toEqual({ url: "?q=f%3Av", contentType: "application/json", method: "POST", type: "POST", data: '{"params":{"rows":20}}' });
  	});
  	
  	it ("Handles simple parameters", function () {
      var main = new (a$(Solr.Configuring, Solr.QueryingJson))();
    	main.addParameter("q", "f:v");
    	main.addParameter("fq", "field1:value1");
    	main.addParameter("rows", 20);
    	main.addParameter("json.nl", "map");
    	main.addParameter("json2tsv", true);
    	
    	var q = main.prepareQuery();
    	
    	expect(q.url).toBe("?q=f%3Av&json.nl=map&json2tsv=true");
    	expect(JSON.parse(q.data)).toEqual({ 
      	params: { rows: 20, fq: [ "field1:value1" ] }
      });
  	});

  	it ("Adds Json-based parameter", function () {
      var main = new (a$(Solr.Configuring, Solr.QueryingJson))();
    	main.addParameter("q", "f:v");
    	main.addParameter("rows", 20);
    	main.addParameter("json.facet", { avg_price: "avg(price)" });
    	
    	var q = main.prepareQuery();
    	expect(q.url).toBe("?q=f%3Av");
    	expect(JSON.parse(q.data)).toEqual({ 
      	params: { rows: 20 },
      	facet: { avg_price: "avg(price)" }
      });
    });
      
  	it ("Adds multiple Json-based parameter", function () {
      var main = new (a$(Solr.Configuring, Solr.QueryingJson))();
    	main.addParameter("q", "f:v");
    	main.addParameter("rows", 20);
    	main.addParameter("json.query", "field3:value3");
    	main.addParameter("json.query", "field4:value4");
    	
    	var q = main.prepareQuery();
    	expect(q.url).toBe("?q=f%3Av");
    	expect(JSON.parse(q.data)).toEqual({ 
      	params: { rows: 20 },
      	query: [ "field3:value3", "field4:value4" ]
      });
    });
    
  	it ("Adds a full Json object parameter", function () {
      var main = new (a$(Solr.Configuring, Solr.QueryingJson))();
    	main.addParameter("q", "f:v");
    	main.addParameter("rows", 20);
    	main.addParameter("json", { 
        query: ['field3:value3', 'field4:value4']
      });
    	main.addParameter("json2tsv", true);
    	
    	var q = main.prepareQuery();
      expect(q.url).toBe("?q=f%3Av&json2tsv=true");
    	expect(JSON.parse(q.data)).toEqual({ 
      	params: { rows: 20 },
      	query: [ "field3:value3", "field4:value4" ]
      });
  	});
  	
	}) // Json querying
	
	describe("Flat (URL) faceting", function () {
    var facet = new (a$(Solr.Faceting))({ id: "test", field: "field" });
	}); // Json faceting
	
	describe("Json API faceting", function () {
    var preTest = function (handler) {
      return function () {
        var main = new (a$(Solr.Management, Solr.Configuring, Solr.QueryingJson))();
        var facet = new (a$(Solr.Faceting))({ id: "test", field: "field", useJson: true });
        main.resetParameters();
        main.addListeners(facet);
        main.init();
        
        handler(main, facet);  
      };
    };
    
  	describe("Simple faceting", function () {
      
      it("Has built proper json configuration", preTest(function (main, facet) {
        var data = JSON.parse(main.prepareQuery().data);
        expect(data.facet).toEqual({ "test": { field: "field", type: "terms", mincount: 1 } });
      }));
      
      it ("Property adds a simple value", preTest(function (main, facet) {
        facet.addValue("foo");
        expect(main.getParameter('json.filter')).toEqual([ { name: 'json.filter', value: "field:foo"} ]);
      }));
      
      it ("Property overrides a value", preTest(function (main, facet) {
        facet.addValue("foo");
        facet.addValue("bar");
        expect(main.getParameter('json.filter')).toEqual([ { name: 'json.filter', value: "field:bar"} ]);
      }));
  
    });
    
    describe("Faceting with space named field", function () {
      var preTest = function (handler) {
        return function () {
          var main = new (a$(Solr.Management, Solr.Configuring, Solr.QueryingJson))();
          var facet = new (a$(Solr.Faceting))({ id: "test", field: "spaced field", useJson: true });
          main.resetParameters();
          main.addListeners(facet);
          main.init();
  
          handler(main, facet);
        };
      };

      it("Has built proper json configuration", preTest(function (main, facet) {
        var data = JSON.parse(main.prepareQuery().data);
        expect(data.facet).toEqual({ "test": { field: "spaced field", type: "terms", mincount: 1 } });
      }));
      
      it ("Property adds a simple value", preTest(function (main, facet) {
        facet.addValue("foo");
        expect(main.getParameter('json.filter')).toEqual([ { name: 'json.filter', value: "spaced\\ field:foo"} ]);
      }));
      
      it ("Property overrides a value", preTest(function (main, facet) {
        facet.addValue("foo");
        facet.addValue("bar");
        expect(main.getParameter('json.filter')).toEqual([ { name: 'json.filter', value: "spaced\\ field:bar"} ]);
      }));
    });
    
    describe("Faceting with exclusion", function () {
      var preTest = function (handler) {
        return function () {
          var main = new (a$(Solr.Management, Solr.Configuring, Solr.QueryingJson))();
          var facet = new (a$(Solr.Faceting))({ id: "test", field: "field", exclusion: true, useJson: true });
          main.resetParameters();
          main.addListeners(facet);
          main.init();

          handler(main, facet);    
        };
      };
      
      it("Has built proper json configuration", preTest(function (main, facet) {
        var data = JSON.parse(main.prepareQuery().data);
        expect(data.facet).toEqual({ "test": { field: "field", type: "terms", mincount: 1, domain: { excludeTags: "test_tag" } } });
      }));

      // TODO: Add add/remove/has tests.
      
    });
    
    describe("Faceting with multi-values and aggregation", function () {
      var preTest = function (handler) {
        return function () {
          var main = new (a$(Solr.Management, Solr.Configuring, Solr.QueryingURL))();
          var facet = new (a$(Solr.Faceting))({ id: "test", field: "field", multivalue: true, aggregate: true });
          main.resetParameters();
          main.addListeners(facet);
          main.init();
    
          handler(main, facet);
        };
      };
      
      it ("Property adds a simple value", preTest(function (main, facet) {
        facet.addValue("foo");
        expect(main.getParameter('fq')).toEqual([ { name: 'fq', value: "field:foo"} ]);
      }));
      
      it ("Property add more values a value", preTest(function (main, facet) {
        facet.addValue("foo");
        facet.addValue("bar");
        expect(main.getParameter('fq')).toEqual([ { name: 'fq', value: "field:(foo bar)"} ]);
      }));
      
      it ("Properly removes an added value", preTest(function (main, facet) {
        facet.addValue("foo");
        facet.addValue("bar");
        expect(facet.removeValue("foo")).toBeTruthy();
        expect(main.getParameter('fq')).toEqual([ { name: 'fq', value: "field:bar"} ]);
      }));
    });

    describe("Patterned faceting with multi-values and aggregation", function () {
      var preTest = function (handler) {
        return function () {
          var main = new (a$(Solr.Management, Solr.Configuring, Solr.QueryingURL))();
          var facet = new (a$(Solr.Faceting, Solr.Patterning))({ 
            id: "test", 
            field: "field", 
            multivalue: true, 
            aggregate: true,
            valuePattern:"-(condition:yes OR -{{v}})"
          });
          main.resetParameters();
          main.addListeners(facet);
          main.init();

          handler(main, facet);
        };
      };
      
      it ("Property adds a simple value", preTest(function (main, facet) {
        facet.addValue("foo");
        expect(main.getParameter('fq')).toEqual([ { name: 'fq', value: "-(condition:yes OR -field:foo)"} ]);
      }));
      
      it ("Property add more values a value", preTest(function (main, facet) {
        facet.addValue("foo");
        facet.addValue("bar");
        expect(main.getParameter('fq')).toEqual([ { name: 'fq', value: "-(condition:yes OR -field:(foo bar))"} ]);
      }));

      it ("Property skips same value", preTest(function (main, facet) {
        facet.addValue("foo");
        facet.addValue("bar");
        facet.addValue("foo");
        expect(main.getParameter('fq')).toEqual([ { name: 'fq', value: "-(condition:yes OR -field:(foo bar))"} ]);
      }));
      
    });
    
	}); // Json faceting
	
	describe("Ranging ablities", function () {
    var preTest = function (handler) {
      return function () {
        var main = new (a$(Solr.Management, Solr.Configuring, Solr.QueryingURL))();
        var range = new (a$(Solr.Ranging))({ id: "test", field: "field" });
        main.addListeners(range);
        main.init();

        handler(main, range);
      };
    };
    
    it ("Property adds a simple range", preTest(function (main, range) {
      range.addValue([ 3, 4 ]);
      expect(main.getParameter('fq')).toEqual([ { name: 'fq', value: "field:[3 TO 4]"}]);
    }));
    
    it ("Property adds an excluded range", preTest(function (main, range) {
      range.addValue([ 3, 4 ], true);
      expect(main.getParameter('fq')).toEqual([ { name: 'fq', value: "-field:[3 TO 4]"}]);
    }));

    it ("Property removes a range", preTest(function (main, range) {
      range.addValue([ 3, 4 ]);
      range.addValue([ 1, 5 ]);
      expect(main.getParameter('fq')).toEqual([ { name: 'fq', value: "field:[1 TO 5]"}]);
    }));
    
    it ("Adds right open range", preTest(function (main, range) {
      range.addValue([ 3 ]);
      expect(main.getParameter('fq')).toEqual([ { name: 'fq', value: "field:[3 TO *]"}]);
    }));
    
    it ("Adds left open range", preTest(function (main, range) {
      range.addValue([ null, 4 ]);
      expect(main.getParameter('fq')).toEqual([ { name: 'fq', value: "field:[* TO 4]"}]);
    }));
    
	});
	
	describe("Patterning ablities", function () {
    var preTest = function (handler) {
      return function () {
        var main = new (a$(Solr.Management, Solr.Configuring, Solr.QueryingURL))();
        var range = new (a$(Solr.Ranging, Solr.Patterning))({ id: "test", field: "field", valuePattern:"-(condition:yes OR -{{v}})" });
        main.addListeners(range);
        main.init();

        handler(main, range);
      };
    };
    
    it ("Property adds a simple range", preTest(function (main, range) {
      range.addValue([ 3, 4 ]);
      expect(main.getParameter('fq')).toEqual([ { name: 'fq', value: "-(condition:yes OR -field:[3 TO 4])"}]);
    }));
    
    it ("Property adds an excluded range", preTest(function (main, range) {
      range.addValue([ 3, 4 ], true);
      expect(main.getParameter('fq')).toEqual([ { name: 'fq', value: "-(condition:yes OR field:[3 TO 4])"}]);
    }));

    it ("Property overrides a value", preTest(function (main, range) {
      range.addValue([ 3, 4 ]);
      range.addValue([ 1, 5 ]);
      expect(main.getParameter('fq')).toEqual([ { name: 'fq', value: "-(condition:yes OR -field:[1 TO 5])"}]);
    }));
    
	});
	
	
});
