(function( window, document ) {

var // Pre-declared for the array function
	r, i, len,
	// Pre-declared for main qwery function
	m, el,
	// Conditional contains and select
	contains, select,
	// All caches
	classCache = {},
	tokenCache = {},
	// For noConflict
	oldQwery = window.qwery,
	// Quick docElem access
	docElem	 = document.documentElement,
	// Regex
	rbackslash = /\\/g,
	rid	 = /#([\w\-]+)/,
	rclass = /\.[\w\-]+/g,
	ridOnly	= /^#([\w\-]+$)/,
	rclassOnly = /^\.([\w\-]+)$/,
	rtagOnly = /^([\w\-]+)$/,
	rtagAndOrClass = /^([\w]+)?\.([\w\-]+)$/,
	rnormalizr = /\s*([\s\+\~>])\s*/g,
	rsplitters = /[\s\>\+\~]/,
	rsplittersMore = /(?!(?:[\s\w\-\/\?\&\=\:\.\(\)\!,@#%<>\{\}\$\*\^'"]*(?:\]|\)))|\d)/,
	rdividers = new RegExp( "(" + rsplitters.source + ")" + rsplittersMore.source, "g" ),
	rtokenizr = new RegExp( rsplitters.source + rsplittersMore.source ),
	rnextPrev = /^[+~]$/,
	rspecialChars = /([.*+?\^=!:${}()|\[\]\/\\])/g,
	rvalidChars = /(?:[\w\u00c0-\uFFFF\*\-]|\\.)+/,
	rsimple = new RegExp( "^(" + rvalidChars.source + ")?(?:([\.#]" + rvalidChars.source + ")?)" ),
	rattr = /\[([\w\-]+)(?:([\|\^\$\*\~]?\=)['"]?([ \w\-\/\?\&\=\:\.\(\)\!,@#%<>\{\}\$\[\]\*\^]+)["']?)?\]/,
	rpos = /:(nth|eq|gt|lt|first|last|even|odd)(?:\((\d*)\))?(?=[^\-]|$)/,
	rpseudo = /:([\w\-]+)(\(['"]?(\w+)['"]?\))?/,
	rchunker = new RegExp( rsimple.source + "(" + rattr.source + ")?" + "(" + rpseudo.source + ")?" + "(" + rpos + ")?" ),

	hasOwnProperty = Object.prototype.hasOwnProperty,
	toString = Object.prototype.toString,
	strArray = "[object Array]",

	// Collects methods to call after the selection
	afterMethods = [],

	// Before interpret
	preFilter = {
		ID_CLASS: function( idcls ) {
			return idcls.replace( rbackslash, "" );
		},
		TAG: function( tag ) {
			return tag.replace( rbackslash, "" ).toLowerCase();
		},
		ATTR: function( attrValue ) {
			var m, escaped;

			// Reset, then run through special characters to make sure they were escaped
			rspecialChars.exec( "" );
			while ( m = rspecialChars.exec(attrValue) ) {
				escaped = attrValue.substr( m.index - 2, 2 );
				if ( !rbackslash.test(escaped) ) {
					qwery.error( attrValue );
				}
			}
			return attrValue.replace( rbackslash, "" );
		}
	},

	// Traversing
	walker = {
		" ": function( node ) {
			return node && node !== docElem && node.parentNode;
		},
		">": function( node, contestant ) {
			return node && node.parentNode == contestant.parentNode && node.parentNode;
		},
		"~": function( node ) {
			return node && node.previousSibling;
		},
		"+": function( node, contestant, p1, p2 ) {
			if (!node ) {
				return false;
			}
			p1 = previous( node );
			p2 = previous( contestant );
			return p1 && p2 && p1 === p2 && p1;
		}
	};

var isXML = qwery.isXML = function( elem ) {
	// documentElement is verified for cases where it doesn't yet exist
	// (such as loading iframes in IE - #4833) 
	var documentElement = (elem ? elem.ownerDocument || elem : 0).documentElement;

	return documentElement ? documentElement.nodeName !== "HTML" : false;
};

qwery.error = function( msg ) {
	throw "Syntax error, unrecognized expression: " + msg;
};

qwery.noConflict = function() {
	window.qwery = oldQwery;
	return this;
};

function array( ar ) {
	r = [];
	i = 0;
	len = ar.length;
	for ( ; i < len; i++ ) {
		r[ i ] = ar[ i ];
	}
	return r;
}

function isNode( el ) {
	return ( el && el.nodeType && (el.nodeType === 1 || el.nodeType === 9) );
}

function previous( n ) {
	while ( n = n.previousSibling ) {
		if ( n.nodeType === 1 ) {
			break;
		}
	}
	return n;
}

function arrayLike( o ) {
	return toString.call( o ) === strArray || ( typeof o === "object" && isFinite(o.length) );
}

function chunk( query ) {
	var pre,
		i = 0,
		m = query.match( rchunker );

	if ( pre = m[ 1 ] ) {
		m[ 1 ] = preFilter.TAG( pre );
	}

	if ( pre = m[ 2 ] ) {
		m[ 2 ] = preFilter.ID_CLASS( pre );
	}

	if ( pre = m[ 6 ] ) {
		m[ 6 ] = preFilter.ATTR( pre );
	}

	return m;
}

function checkAttr( qualify, actual, val ) {

	return qualify === "=" ?
		actual === val :
		qualify === "!=" ?
		actual !== val :
		qualify === "^=" ?
		actual.indexOf( val ) === 0 :
		qualify === "$=" ?
		actual.substr(actual.length - val.length) === val :
		qualify === "*=" ?
		actual.indexOf( val ) > -1 :
		qualify === "~=" ?
		(" " + actual + " ").indexOf(" " + val + " ") > -1 :
		qualify === "|=" ?
		actual === val || actual.substr(0, val.length + 1) === val + "-" :
		0;
}

/**
 * given => div.hello[title="world"]:foo("bar")
 * div.hello[title="world"]:foo("bar"), div, .hello, [title="world"], title, =, world, :foo("bar"), foo, ("bar"), bar]
 */
function interpret( whole, tag, idsAndClasses, wholeAttribute, attribute, qualifier, value, wholePseudo, pseudo, wholePseudoVal, pseudoVal ) {
	var i, j, ret, classes;

	// Tag
	if ( tag && this.tagName.toLowerCase() !== tag ) {
		return false;
	}

	// ID	
	if ( idsAndClasses && (i = idsAndClasses.match( rid )) && i[1] !== (this.id || this.getAttribute("id")) ) {
		return false;
	}

	// Class
	if ( idsAndClasses && (classes = idsAndClasses.match( rclass )) ) {
		ret = " " + ( this.className || this.getAttribute("class") ) + " ";
		for ( i = classes.length; i--; ) {
			j = classes[i].slice( 1 );

			if ( ret.indexOf(" " + j + " ") < 0 ) {
				return false;
			}
		}
	}

	// Pseudo
	if ( pseudo && (qwery.pseudos[pseudo] || qwery.error( whole )) && !(ret = qwery.pseudos[ pseudo ]( this, pseudoVal )) ) {
		if ( ret === null ) {
			qwery.error( whole );
		}
		return false;
	}

	// Attribute exists
	if ( wholeAttribute && !value ) {
		ret = this.attributes;
		for ( i in ret ) {
			if ( hasOwnProperty.call( ret, i ) && ( ret[i].name || i ) === attribute ) {
				return this;
			}
		}
	}

	// Attribute has value
	if ( wholeAttribute && !checkAttr(qualifier, this.getAttribute( attribute ) || "", value) ) {
		return false;
	}

	return this;
}

function _ancestorMatch( elem, tokens, dividedTokens ) {
	var found,
		p = elem;

	for ( i = tokens.length; i--; ) {
		// loop through parent nodes
		while ( p = walker[dividedTokens[ i ]](p, elem) ) {
			if ( found = !tokens[i] ? elem : interpret.apply(p, chunk( tokens[i] )) ) {
				break;
			}
		}
	}

	return !!found;
}

function _qwery( selector, root ) {
	var i, j, k, l,	m, p,
		token,
		tag,
		els,
		intr,
		item,
		children,
		found,
		ret,
		r = [],
		tokens = tokenCache[ selector ] || ( tokenCache[ selector ] = selector.split(rtokenizr) ),
		dividedTokens = selector.match( rdividers );

	tokens = tokens.slice( 0 ); // this makes a copy of the array so the cached original is not effected
	if ( !tokens.length ) {
		return r;
	}

	token = tokens.pop();
	root = tokens.length && ( m = tokens[tokens.length - 1].match(ridOnly) ) ? root.getElementById( m[1] ) : root;
	if ( !root ) {
		return r;
	}

	intr = chunk( token );

	if ( intr[0] === "" ) {
		// Not a valid selector
		qwery.error( selector );
	}

	els = dividedTokens && rnextPrev.test( dividedTokens[dividedTokens.length - 1] ) ?
		function( r ) {
			var _root = root;
			while ( root = root.nextSibling ) {
				root.nodeType === 1 && ( intr[1] ? intr[1] === root.tagName.toLowerCase() : 1 ) && r.push( root );
			}
			root = _root.parentNode || _root;
			return r;
		}([]) :
		root.getElementsByTagName( intr[1] || "*" );

	j = 0;
	l = els.length;
	for ( i = 0; i < l; i++ ) {
		if ( item = interpret.apply(els[ i ], intr) ) {
			r[j++] = item;
		}
	}
	if ( !tokens.length ) {
		return r;
	}

	// loop through all descendent tokens
	ret = [];
	j = k = 0;
	l = r.length;
	for ( ; j < l; j++ ) {
		if ( _ancestorMatch(r[ j ], tokens, dividedTokens) ) {
			ret[ k++ ] = r[ j ];
		}
	}
	return ret;
}

var matches = qwery.matchesSelector = function( elem, selector ) {
	var tokens, dividedTokens,
		selectors = (selector || "").split(",");

	while ( selector = selectors.pop() ) {
		tokens = tokenCache[ selector ] || ( tokenCache[selector] = selector.split(rtokenizr) );
		dividedTokens = selector.match( rdividers );
		tokens = tokens.slice(0);
		if ( interpret.apply(elem, chunk( tokens.pop() )) && (!tokens.length || _ancestorMatch( elem, tokens, dividedTokens )) ) {
			return true;
		}
	}

	return false;
};

// Use matchesSelector if available
(function() {
	var rquoteAttr, disconnectedMatch, oldMatches,
		matchesSelector = docElem.matchesSelector || docElem.webkitMatchesSelector || docElem.mozMatchesSelector || docElem.msMatchesSelector;

	if ( matchesSelector ) {
		oldMatches = matches;
		rquoteAttr = /\=\s*([^'"\]]*)\s*\]/g;
		// IE9 cannot do matchesSelector on a disconnected node
		disconnectedMatch = !matchesSelector.call( document.createElement("div"), "div");

		matches = qwery.matchesSelector = function( node, selector ) {
			var ret;

			// Make sure that attribute selectors are quoted
			selector = selector.replace( rquoteAttr, "='$1']");

			if ( !isXML(node) ) {
				try {
					ret = matchesSelector.call( node, selector );
					if ( ret || !disconnectedMatch ||
						node.document && node.document.nodeType !== 11 ) {
						return ret;
					}
				} catch (e) {}
			}
			return oldMatches( node, selector );
		};
	}
})();

var is = qwery.is = function( elem, selector ) {
	if ( isNode(selector) ) {
		return elem === selector;
	}

	if ( arrayLike(selector) ) {
		return !!~array(selector).indexOf( elem );
	}

	return matches( elem, selector );
};

var uniq = qwery.uniq = function( ar ) {
	var a = [], i, j;
	label:
	for ( i = 0; i < ar.length; i++ ) {
		for ( j = 0; j < a.length; j++ ) {
			if ( a[j] === ar[i]) {
				continue label;
			}
		}
		a[ a.length ] = ar[ i ];
	}
	return a;
};

contains = qwery.contains = "compareDocumentPosition" in docElem ?
	function( container, element ) {
		return ( container.compareDocumentPosition( element ) & 16 ) === 16;
	} :
	"contains" in docElem ?
	function( container, element ) {
		container = container === document || container === window ? docElem : container;
		return container !== element && container.contains( element );
	} :
	function( container, element ) {
		while ( element = element.parentNode ) {
			if ( element === container ) {
				return 1;
			}
		}
		return 0;
	};

select = function( selector, root ) {
	selector = selector.replace( rnormalizr, "$1");
	var elem, items, collection, l,
		i = 0,
		j = 0,
		result = [],
		collections = [];

	if ( m = selector.match(rtagAndOrClass) ) {
		items = root.getElementsByTagName( m[1] || "*" );
		l = items.length;

		r = classCache[ m[2] ] || ( classCache[ m[2] ] = new RegExp("(^|\\s+)" + m[2] + "(\\s+|$)") );
		for ( j = 0; i < l; i++ ) {
			elem = items[i];
			r.test( elem.className || elem.getAttribute("class") ) && ( result[j++] = elem );
		}
		return result;
	}

	items = selector.split(",");
	l = items.length;
	for ( i = 0; i < l; i++ ) {
		collections[i] = _qwery( items[i], root );
	}

	l = collections.length;
	for ( i = 0; i < l && (collection = collections[ i ]); i++ ) {
		var ret = collection;

		if ( root !== document ) {
			ret = [];
			m = collections.length;
			for ( j = 0; j < m && (elem = collection[j]); j++ ) {
				// make sure element is a descendent of root
				contains( root, elem ) && ret.push( elem );
			}
		}
		result = result.concat( ret );
	}

	result = uniq( result );

	if ( afterMethods.length ) {
		result = jQuery( result );
		for ( i = 0, l = afterMethods.length; i < l; i++ ) {
			result = result[ afterMethods[i].n ]( afterMethods[i].v );
		}
		result = result.get();
	}

	return result;
};

if ( document.querySelectorAll ) {
	(function() {
		var id,
		 	oldSelect = select,
			div = document.createElement("div");

		div.innerHTML = "<p class='TEST'></p>";

		// Safari can't handle uppercase or unicode characters when
		// in quirks mode.
		if ( div.querySelectorAll && div.querySelectorAll(".TEST").length === 0 ) {
			return;
		}

		id = "__qwery__";

		select = function( selector, root ) {
			if ( !isXML(root) ) {
				if ( root.getElementsByClassName && (m = selector.match( rclassOnly )) ) {
					return array( root.getElementsByClassName(m[ 1 ]) );
				}
				try {
					return array( root.querySelectorAll(selector) );
				} catch (e) {}
			}

			return oldSelect( selector, root );
		};
	})();
}

function qwery( selector, _root, results ) {
	var root = ( typeof _root === "string" ) ? qwery(_root )[ 0 ] : ( _root || document );
	results = results || [];

	if ( !root || !selector ) {
		return results;
	}

	if ( selector === window || isNode(selector) ) {
		if ( !_root || (selector !== window && isNode( root ) && contains( root, selector )) ) {
			results.push( selector );
		}
		return results;
	}

	if ( selector && typeof selector === "object" && isFinite(selector.length) ) {
		return results.push.apply( results, array(selector) );
	}

	if ( m = selector.match(ridOnly) ) {
		// Call getElementById from a document context
		if ( el = (root.nodeType === 9 ? root : (root.ownerDocument || document)).getElementById(m[ 1 ]) ) {
			results.push( el );
		}
		return results;
	}

	if ( m = selector.match(rtagOnly) ) {
		return results.push.apply( results, array(root.getElementsByTagName( m[1] )) );
	}

	return results.push.apply( results, select(selector, root) );
}

/**
 * Utility function for retreiving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
var getText = qwery.getText = function( elem ) {
    var i, node,
		nodeType = elem.nodeType,
		ret = "";

	if ( nodeType ) {
		if ( nodeType === 1 ) {
			// Use textContent || innerText for elements
			if ( typeof elem.textContent === "string" ) {
				return elem.textContent;
			} else if ( typeof elem.innerText === "string" ) {
				// Replace IE's carriage returns
				return elem.innerText.replace( rReturn, "" );
			} else {
				// Traverse it's children
				for ( elem = elem.firstChild; elem; elem = elem.nextSibling) {
					ret += getText( elem );
				}
			}
		} else if ( nodeType === 3 || nodeType === 4 ) {
			return elem.nodeValue;
		}
	} else {

		// If no nodeType, this is expected to be an array
		for ( i = 0; (node = elem[i]); i++ ) {
			// Do not traverse comment nodes
			if ( node.nodeType !== 8 ) {
				ret += getText( node );
			}
		}
	}
	return ret;
};

/**
 * Gets all children of nodeType 1
 * @param {Element} node - The parent
 */
function children( node ) {
	var i, l,
		nodes = node.childNodes,
		r = [];

	for ( i = 0, l = nodes.length; i < l; i++ ) {
		var item = nodes[i];
		nodes[i].nodeType === 1 && r.push( nodes[i] );
	}
	return r;
}


// Add valid and custom pseudo selectors
qwery.pseudos = {
	"last-child": function( elem, p, childs ) {
		if ( p ) {
			return null;
		}
		return elem.parentNode && ( p = elem.parentNode ) && ( childs = children(p) ) && childs[childs.length - 1] === elem;
	},
	"first-child": function( elem, p, childs ) {
		if ( p ) {
			return null;
		}
		return elem.parentNode && ( p = elem.parentNode ) && ( childs = children(p) ) && childs[0] === elem;
	},
	"nth-child": function( elem, val, p ) {
		if ( !val ) {
			return null;
		}
		if ( !(p = elem.parentNode) ) {
			return false;
		}
		var i, l,
			childs = children( p );

		if ( isFinite(val) ) {
			return childs[ val - 1 ] === elem;

		} else if ( val === "odd" ) {
			for ( i = 0, l = childs.length;i < l; i = i + 2 ) {
				if ( elem === childs[i] ) {
					return true;
				}
			}

		} else if ( val === "even" ) {
			for ( i = 1, l = childs.length;i < l; i = i + 2 ) {
				if ( elem === childs[i] ) {
					return true;
				}
			}
		}
		return false;
	},
	checked: function( elem ) {
		return elem.checked;
	},
	enabled: function( elem ) {
		return !elem.disabled;
	},
	disabled: function( elem ) {
		return elem.disabled;
	},
	empty: function( elem ) {
		return !elem.childNodes.length;
	},
	selected: function( elem ) {
		// Accessing this property makes selected-by-default
		// options in Safari work properly
		if ( elem.parentNode ) {
			elem.parentNode.selectedIndex;
		}
		return elem.selected === true;
	}
};

/**
 * Filter elements given a selector against which to match
 * @param {Array} nodes - elements to filter
 * @param {String} selector - selector by which to filter the elements
 */
qwery.filter = function( nodes, selector ) {
	var node,
		result = [],
		i = 0;

	for ( ; (node = nodes[i]); i++ ) {
		if ( is(node, selector) ) {
			result.push( node );
		}
	}
	return result;
};

// Used in filter to compare nodes
qwery.matches = function( nodes, selector ) {
	return !!qwery.filter( nodes, selector ).length;
};

// Expose
window.qwery = qwery;

})( this, this.document );