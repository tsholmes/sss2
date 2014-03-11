sss2
====
A CSS preprocessor using an alternative easy-to-parse syntax

Tokens
------
```
name    -> [\-_a-zA-Z0-9\.:]+
varName -> @[\-_a-zA-Z0-9]+
string  -> "[^"]+"
```

Grammar
------
```
document        -> (rule|varElement)*
rule            -> selector '{' body '}'
selector        -> '(' selectorPath (',' selectorPath)* ')'
selectorPath    -> (name|selector) ('>'? selectorPath)?
body            -> bodyElement*
bodyElement     -> nestedRule | propertyElement | varElement
nestedRule      -> nestedSelector '{' body '}'
nestedSelector  -> '>'? selector
propertyElement -> name '=' value ';'
varElement      -> varName '=' value ';'
value           -> (string|varName)+
```

Example
-------
```
(div > (span,a)) {
  background-color = "red";
  >(img) {
    max-width = "100%";
  }
  (img) {
    max-height = "100%";
  }
}
```
transforms to
```css
div > span > img,
div > a > img {
  max-width : 100%;
}

div > span img,
div > a img {
  max-height : 100%;
}

div > span,
div > a {
  background-color : red;
}
```
