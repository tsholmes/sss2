var isnode =
    (typeof module !== "undefined" && typeof module.exports !== "undefined");

(function(root){

  var Util = {
    append: function(l1,l2) {
      for (var i = 0; i < l2.length; i++) {
        l1.push(l2[i]);
      }
    },
    uniqueMerge: function(a1,a2) {
      var i1 = 0;
      var i2 = 0;
      var ret = [];
      while (i1 < a1.length || i2 < a2.length) {
        if (i1 == a1.length || (i2 < a2.length && a2[i2] <= a1[i1])) {
          if (!ret.length || a2[i2] > ret[ret.length-1]) {
            ret.push(a2[i2]);
          }
          i2++;
        } else {
          if (!ret.length || a1[i1] > ret[ret.length-1]) {
            ret.push(a1[i1]);
          }
          i1++;
        }
      }
      return ret;
    },
    remove: function(a,el) {
      var pos = a.indexOf(el);
      if (~pos) {
        a.splice(pos,1);
      }
    },
    equals: function(a1,a2) {
      if (a1.length != a2.length) return false;
      for (var i = 0; i < a1.length; i++) {
        if (a1[i] != a2[i]) return false;
      }
      return true;
    },
    equalsWithout: function(a1,a2,el) {
      var i1 = 0;
      var i2 = 0;
      while (i1 < a1.length && i2 < a2.length) {
        if (a1[i1] == el) {
          i1++;
        } else if (a2[i2] == el) {
          i2++;
        } else if (a1[i1] == a2[i2]) {
          i1++;
          i2++;
        } else {
          return false;
        }
      }
      while (i1 < a1.length && a1[i1] == el) i1++;
      while (i2 < a2.length && a2[i2] == el) i2++;
      return i1 == a1.length && i2 == a2.length;
    }
  };

  function Reader(src) {
    this.src = src;
    this.index = 0;
    this.line = 0;
    this.char = 0;
  }
  Reader.prototype.next = function() {
    if (this.index >= this.src.length) return null;
    var c = this.src[this.index++];
    if (c == '\n') {
      this.line++;
      this.char = 0;
    } else {
      this.char++;
    }
    return c;
  }
  Reader.prototype.peek = function() {
    if (this.index >= this.src.length) return null;
    return this.src[this.index];
  }
  Reader.prototype.pos = function() {
    return {line:this.line,char:this.char};
  }
  Reader.prototype.getLine = function(line) {
    var l = 0;
    var ret = "";
    for (var i = 0; i < this.src.length && l <= line; i++) {
      if (this.src[i] == '\n') {
        l++;
      } else if (l == line) {
        ret += this.src[i];
      }
    }
    return ret;
  }

  function Scanner(reader) {
    this.r = reader;
  }
  Scanner.nameChars =
    "-_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:";
  Scanner.wsChars = " \t\r\n";
  Scanner.prototype.error = function(msg,pos) {
    var errmsg = msg + " at " + JSON.stringify(pos) + "\n";
    errmsg += this.r.getLine(pos.line) + "\n";
    for (var i = 0; i < pos.char; i++) errmsg += " ";
    errmsg += "^";
    throw new Error(errmsg);
  }
  Scanner.prototype.scanSingle = function() {
    var pos = this.r.pos();
    var c = this.r.next();
    return {val:c,type:c,pos:pos};
  }
  Scanner.prototype.scanName = function() {
    var pos = this.r.pos();
    var res = "";
    while (this.r.peek() && Scanner.nameChars.indexOf(this.r.peek()) != -1) {
      res += this.r.next();
    }
    return {val:res,type:"name",pos:pos};
  }
  Scanner.prototype.scanVarName = function() {
    var pos = this.r.pos();
    var res = this.r.next();
    while (this.r.peek() && Scanner.nameChars.indexOf(this.r.peek()) != -1) {
      res += this.r.next();
    }
    return {val:res,type:"varName",pos:pos};
  }
  Scanner.prototype.scanString = function() {
    var pos = this.r.pos();
    var res = "";
    this.r.next();
    while (this.r.peek() && this.r.peek() != '"') {
      res += this.r.next();
    }
    if (this.r.next() != '"') {
      this.error("Unclosed string",pos);
    }
    return {val:res,type:"string",pos:pos};
  }
  Scanner.prototype.scanComment = function() {
    var pos = this.r.pos();
    this.r.next();
    var c = this.r.next();
    if (c == '/') {
      while ((c = this.r.peek()) && c != '\n') {
        this.r.next();
      }
    } else if (c == '*') {
      while (c = this.r.next()) {
        if (c == '*' && this.r.peek() == '/') {
          this.r.next();
          break;
        }
      }
      if (!c) {
        this.error("Unclosed comment", pos);
      }
    } else {
      this.error("Unexpected character '/'", pos);
    }
  }
  Scanner.prototype.scan = function() {
    if (this.peeked) {
      var ret = this.peeked;
      this.peeked = null;
      return ret;
    }
    var c = this.r.peek();
    if (c === null) {
      return {val:null,type:null,pos:this.r.pos()};
    }
    if ("{}();>=,".indexOf(c) != -1) {
      return this.scanSingle();
    } else if (c == '@') {
      return this.scanVarName();
    } else if (Scanner.nameChars.indexOf(c) != -1) {
      return this.scanName();
    } else if (c == '"') {
      return this.scanString();
    } else if (Scanner.wsChars.indexOf(c) != -1) {
      this.r.next();
      return this.scan();
    } else if (c == '/') {
      this.scanComment();
      return this.scan();
    } else {
      // unknown character
      this.error("Unexpected character '" + c + "'", this.r.pos());
    }
  }
  Scanner.prototype.peek = function() {
    return this.peeked = this.scan();
  }

  function SymbolTable() {
    this.scopes = [{}];
  }
  SymbolTable.prototype.pushScope = function() {
    this.scopes.push({});
  }
  SymbolTable.prototype.popScope = function() {
    if (this.scopes.length > 1)
      this.scopes.pop();
  }
  SymbolTable.prototype.set = function(name,val) {
    this.scopes[this.scopes.length-1][name] = val;
  }
  SymbolTable.prototype.get = function(name) {
    for (var i = this.scopes.length; --i >= 0;) {
      if (name in this.scopes[i])
        return this.scopes[i][name];
    }
    return null;
  }

  function Parser(scanner) {
    this.s = scanner;
    this.rules = [];
    this.symbols = new SymbolTable();
    this.nextid = 0;
  }
  Parser.prototype.assert = function(t,type) {
    if (t.type != type) {
      this.s.error("Expected '" + type + '"', t.pos);
    }
  }
  Parser.prototype.unexpected = function(t) {
    if (t.type) {
      this.s.error("Unexpected token '" + t.type + "'", t.pos);
    } else {
      this.s.error("Unexpected EOF", t.pos);
    }
  }
  Parser.prototype.graphify = function(node) {
    var ins = [];
    var outs = [];
    var nodes = {};
    if (node.el) {
      var elnode = { val: node.el, id: this.nextid++, ins: [], outs: [] };
      ins.push(elnode.id);
      outs.push(elnode.id);
      nodes[elnode.id] = elnode;
    } else {
      for (var i = 0; i < node.graph.length; i++) {
        var gel = node.graph[i];
        var gnode = this.graphify(gel);
        Util.append(ins,gnode.ins);
        Util.append(outs,gnode.outs);
        for (var id in gnode.nodes) {
          nodes[id] = gnode.nodes[id];
        }
      }
    }
    if (node.next) {
      var next = this.graphify(node.next);
      for (var id in next.nodes) {
        nodes[id] = next.nodes[id];
      }
      for (var i = 0; i < outs.length; i++) {
        var ni = nodes[outs[i]];
        for (var j = 0; j < next.ins.length; j++) {
          var nj = nodes[next.ins[j]];
          ni.outs.push(nj.id);
          nj.ins.push(ni.id);
        }
      }
      outs = next.outs;
    }
    return {nodes:nodes,ins:ins,outs:outs};
  }
  Parser.prototype.parseDocument = function() {
    var t;
    while ((t = this.s.peek()).type) {
      if (t.type == "(") {
        this.parseRule();
      } else if (t.type == "varName") {
        this.parseVarElement();
      } else {
        this.unexpected(this.s.scan());
      }
    }
  }
  Parser.prototype.parseRule = function() {
    var selector = {graph:this.parseSelector()};
    this.assert(this.s.scan(),"{");
    this.parseBody(selector);
    this.assert(this.s.scan(),"}");
  }
  Parser.prototype.parseSelector = function() {
    this.assert(this.s.scan(),"(");
    var paths = [this.parseSelectorPath()];
    while (this.s.peek().type == ",") {
      this.assert(this.s.scan(),",");
      paths.push(this.parseSelectorPath());
    }
    this.assert(this.s.scan(),")");
    return paths;
  }
  Parser.prototype.parseSelectorPath = function() {
    var ret = {};
    var cur = ret;
    var type = this.s.peek().type;
    if (type == "name") {
      ret.el = this.s.scan().val;
    } else if (type == "(") {
      ret.graph = this.parseSelector();
    } else {
      this.unexpected(this.s.scan());
    }
    type = this.s.peek().type;
    if (type == ">") {
      ret.next = {el:this.s.scan().val};
      cur = ret.next;
      cur.next = this.parseSelectorPath();
    } else if (type == "name" || type == "(") {
      cur.next = this.parseSelectorPath();
    }
    return ret;
  }
  Parser.prototype.parseBody = function(selector) {
    this.symbols.pushScope();

    var props = [];
    var type = this.s.peek().type;
    while (type == "name" || type == "varName" || type == "(" || type == ">") {
      this.parseBodyElement(selector,props);
      type = this.s.peek().type;
    }

    if (props.length > 0) {
      var graph = Graph.simplify(this.graphify(selector));
      this.rules.push({selector:graph,properties:props});
    }

    this.symbols.popScope();
  }
  Parser.prototype.parseBodyElement = function(selector,props) {
    var type = this.s.peek().type;
    if (type == "(" || type == ">") {
      this.parseNestedRule(selector);
    } else if (type == "name") {
      props.push(this.parsePropertyElement());
    } else if (type == "varName") {
      this.parseVarElement();
    } else {
      this.unexpected(this.s.scan());
    }
  }
  Parser.prototype.parseNestedRule = function(parentSelector) {
    var selector = this.parseNestedSelector(parentSelector);
    this.assert(this.s.scan(),"{");
    this.parseBody(selector);
    this.assert(this.s.scan(),"}");
  }
  Parser.prototype.parseNestedSelector = function(parentSelector) {
    var ret = {graph:[parentSelector]};
    var cur = ret;
    var type = this.s.peek().type;
    if (type == ">") {
      ret.next = {el:this.s.scan().val};
      cur = ret.next;
    }
    cur.next = {graph:this.parseSelector()};
    return ret;
  }
  Parser.prototype.parsePropertyElement = function(parentSelector) {
    var name;
    this.assert(name=this.s.scan(),"name");
    this.assert(this.s.scan(),"=");
    var value = this.parseValue();
    this.assert(this.s.scan(),";");
    return {name:name.val,value:value};
  }
  Parser.prototype.parseVarElement = function() {
    var name;
    this.assert(name=this.s.scan(),"varName");
    this.assert(this.s.scan(),"=");
    this.symbols.set(name.val,this.parseValue());
    this.assert(this.s.scan(),";");
  }
  Parser.prototype.parseValue = function() {
    var ret = [];
    var type = this.s.peek().type;
    while (type == "string" || type == "varName") {
      var t = this.s.scan();
      if (type == "varName") {
        var val = this.symbols.get(t.val);
        if (!val) {
          this.s.error("Undefined variable '" + t.val + "'", t.pos);
        }
        Util.append(ret,val);
      } else {
        ret.push(t.val);
      }
      type = this.s.peek().type;
    }
    if (ret.length == 0) {
      this.unexpected(this.s.scan());
    }
    return ret;
  }
  Parser.prototype.parse = function() {
    this.parseDocument();
  }

  Graph = {
    postorder: function(graph,callback) {
      var visited = {};
      function traverse(node) {
        if (visited[node.id]) return;
        visited[node.id] = true;
        for (var i = 0; i < node.outs.length; i++) {
          traverse(graph.nodes[node.outs[i]]);
        }
        callback(node);
      }
      for (var i = 0; i < graph.ins.length; i++) {
        traverse(graph.nodes[graph.ins[i]]);;
      }
    },
    flatten: function(graph) {
      var paths = {};

      Graph.postorder(graph, function(n){
        var id = n.id;
        var start = [[n.val]];
        var ps = [];
        if (n.outs.length) {
          for (var j = 0; j < n.outs.length; j++) {
            var p2s = paths[n.outs[j]];
            for (var k = 0; k < p2s.length; k++) {
              ps.push(start.concat(p2s[k]));
            }
          }
        } else {
          ps.push(start);
        }
        paths[id] = ps;
      });

      var ret = [];
      for (var i = 0; i < graph.ins.length; i++) {
        Util.append(ret,paths[graph.ins[i]]);
      }

      return ret;
    },
    mergeNodes: function(graph,i1,i2) {
      var n1 = graph.nodes[i1];
      var n2 = graph.nodes[i2];
      if (n1.val != n2.val) {
        throw new Error("Bad merge: '" + n1.val + "'!='" + n2.val +"'");
      }
      Util.remove(graph.ins,i2);
      Util.remove(graph.outs,i2);
      n1.ins = Util.uniqueMerge(n1.ins,n2.ins);
      n1.outs = Util.uniqueMerge(n1.outs,n2.outs);
      //TODO: speed up
      for (var i = 0; i < n2.ins.length; i++) {
        var n3 = graph.nodes[n2.ins[i]];
        Util.remove(n3.outs,i2);
        if (!~n3.outs.indexOf(i1)) {
          n3.outs.push(i1);
          n3.outs.sort();
        }
      }
      for (var i = 0; i < n2.outs.length; i++) {
        var n3 = graph.nodes[n2.outs[i]];
        Util.remove(n3.ins,i2);
        if (!~n3.ins.indexOf(i1)) {
          n3.ins.push(i1);
          n3.ins.sort();
        }
      }
      delete graph.nodes[i2];
    },
    spliceNode: function(graph,id) {
      var n = graph.nodes[id];

      for (var i = 0; i < n.ins.length; i++) {
        var ni = graph.nodes[n.ins[i]];
        ni.outs = Util.uniqueMerge(ni.outs,n.outs);
        Util.remove(ni.outs,id);
      }
      for (var i = 0; i < n.outs.length; i++) {
        var ni = graph.nodes[n.outs[i]];
        ni.ins = Util.uniqueMerge(ni.ins,n.ins);
        Util.remove(ni.ins,id);
      }

      delete graph.nodes[id];
    },
    simplify: function(graph) {
      var changed;
      do {
        changed = false;
        var ns = {};
        Graph.postorder(graph,function(n){
          if (!ns[n.val]) ns[n.val] = [];
          ns[n.val].push(n.id);
        });
        for (var x in ns) {
          var nl = ns[x];
          for (var i = nl.length; --i >= 0;) {
            var ni = graph.nodes[nl[i]];
            for (var j = 0; j < i; j++) {
              var nj = graph.nodes[nl[j]];
              if (Util.equals(ni.ins,nj.ins) || Util.equals(ni.outs,nj.outs)) {
                Graph.mergeNodes(graph,ni.id,nj.id);
                changed = true;
                break;
              }
            }
          }
        }
        var ds = ns['>'];
        if (ds) {
          for (var i = 0; i < ds.length; i++) {
            var n = graph.nodes[ds[i]];
            if (!n) continue;
            var eq = true;
            for (var j = 0; j < n.outs.length; j++) {
              var nj = graph.nodes[n.outs[j]];
              eq = eq && Util.equalsWithout(n.ins,nj.ins,n.id);
            }
            if (eq) {
              Graph.spliceNode(graph,n.id);
              changed = true;
            }
          }
        }
      } while (changed);
      console.log(graph);
      return graph;
    }
  };

  function MinifiedFormatter() { }
  MinifiedFormatter.prototype.format = function(rules) {
    var ret = "";
    for (var i = 0; i < rules.length; i++) {
      ret += this.formatRule(rules[i]);
    }
    return ret;
  }
  MinifiedFormatter.prototype.formatRule = function(rule) {
    var paths = Graph.flatten(rule.selector);
    var ret = "";
    for (var i = 0; i < paths.length; i++) {
      if (i != 0) ret += ",";
      ret += this.formatPath(paths[i]);
    }
    ret += "{";
    for (var i = 0; i < rule.properties.length; i++) {
      if (i != 0) ret += ";";
      var prop = rule.properties[i];
      ret += prop.name + ":" + prop.value.join(" ");
    }
    ret += "}";
    return ret;
  }
  MinifiedFormatter.prototype.formatPath = function(path) {
    var last = ">";
    var ret = "";
    for (var i = 0; i < path.length; i++) {
      if (last != ">" && path[i] != ">") {
        ret += " ";
      }
      ret += path[i];
      last = path[i];
    }
    return ret;
  }

  function PrettyFormatter() { }
  PrettyFormatter.prototype.format = function(rules) {
    var ret = "";
    for (var i = 0; i < rules.length; i++) {
      if (i != 0) ret += "\n";
      ret += this.formatRule(rules[i]);
    }
    return ret;
  }
  PrettyFormatter.prototype.formatRule = function(rule) {
    var paths = Graph.flatten(rule.selector);
    var ret = "";
    for (var i = 0; i < paths.length; i++) {
      if (i != 0) ret += ",\n";
      ret += paths[i].join(" ");
    }
    ret += " {\n";
    for (var i = 0; i < rule.properties.length; i++) {
      var prop = rule.properties[i];
      ret += "  " + prop.name + " : " + prop.value.join(" ") + ";\n";
    }
    ret += "}\n";
    return ret;
  }

  root.sss2 = function(src,pretty) {
    try {
      var reader = new Reader(src);
      var scanner = new Scanner(reader);
      var parser = new Parser(scanner);
      parser.parse();
      var formatter = pretty?new PrettyFormatter():new MinifiedFormatter();
      return formatter.format(parser.rules);
    } catch (e) {
      if (!isnode) {
        console.error(e.stack);
      }
      throw e;
    }
  }
})(isnode?module.exports:window);

if (!isnode) {
  var convertTags = function(){
    var styles = document.getElementsByTagName("style");
    for (var i = 0; i < styles.length; i++) {
      var style = styles[i];
      if (style.type == "text/sss2") {
        try {
          var css = sss2(style.innerText);
          var s = document.createElement("style");
          s.type = "text/css";
          s.innerText = css;
          document.head.appendChild(s);
        } catch (e) {
        }
      }
    }
  };
  if (document.readyState == "complete") {
    convertTags();
  } else {
    document.addEventListener("readystatechange", function(){
      if (document.readyState != "complete") return;
      convertTags();
    });
  }
}
