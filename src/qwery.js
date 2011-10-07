(function( window, document ) {

var c, i, j, k, l, m, o, p, r, v,
	el, node, len, found, classes, item, items, token,
	classCache, cleanCache, attrCache, tokenCache,
	contains, select,
	oldQwery      = window.qwery,
	html          = document.documentElement,
	id            = /#([\w\-]+)/,
	clas          = /\.[\w\-]+/g,
	idOnly        = /^#([\w\-]+$)/,
	classOnly     = /^\.([\w\-]+)$/,
	tagOnly       = /^([\w\-]+)$/,
	tagAndOrClass = /^([\w]+)?\.([\w\-]+)$/,
	normalizr     = /\s*([\s\+\~>])\s*/g,
	splitters     = /[\s\>\+\~]/,
	splittersMore = /(?![\s\w\-\/\?\&\=\:\.\(\)\!,@#%<>\{\}\$\*\^'"]*\])/,
	dividers      = new RegExp('(' + splitters.source + ')' + splittersMore.source, 'g'),
	tokenizr      = new RegExp(splitters.source + splittersMore.source),
	specialChars  = /([.*+?\^=!:${}()|\[\]\/\\])/g,
	simple        = /^([a-z0-9]+)?(?:([\.\#]+[\w\-\.#]+)?)/,
	attr          = /\[([\w\-]+)(?:([\|\^\$\*\~]?\=)['"]?([ \w\-\/\?\&\=\:\.\(\)\!,@#%<>\{\}\$\*\^]+)["']?)?\]/,
	pseudo        = /:([\w\-]+)(\(['"]?(\w+)['"]?\))?/,
	chunker       = new RegExp( simple.source + '(' + attr.source + ')?' + '(' + pseudo.source + ')?'),
	walker        = {
		' ': function( node ) {
			return node && node !== html && node.parentNode;
		},
		'>': function( node, contestant ) {
			return node && node.parentNode == contestant.parentNode && node.parentNode;
		},
		'~': function( node ) {
			return node && node.previousSibling;
		},
		'+': function( node, contestant, p1, p2 ) {
			if (!node ) {
				return false;
			}
			p1 = previous( node );
			p2 = previous( contestant );
			return p1 && p2 && p1 == p2 && p1;
		}
	},
	isXML = function( elem ) {
		// documentElement is verified for cases where it doesn't yet exist
		// (such as loading iframes in IE - #4833) 
		var documentElement = (elem ? elem.ownerDocument || elem : 0).documentElement;

		return documentElement ? documentElement.nodeName !== "HTML" : false;
	};


function cache() {
	this.c = {};
}
cache.prototype = {
	g: function( k ) {
		return this.c[k] || undefined;
	},
	s: function( k, v ) {
		this.c[k] = v;
		return v;
	}
};

classCache = new cache();
cleanCache = new cache();
attrCache  = new cache();
tokenCache = new cache();

function array( ar ) {
	r = [];
	for ( i = 0, len = ar.length; i < len; i++ ) {
		r[i] = ar[i];
	}
	return r;
}

function previous( n ) {
	while ( n = n.previousSibling ) {
		if ( n.nodeType == 1 ) {
			break;
		}
	}
	return n;
}

function q( query ) {
	return query.match( chunker );
}

function clean( s ) {
	return cleanCache.g( s ) || cleanCache.s( s, s.replace( specialChars, '\\$1'));
}

function checkAttr( qualify, actual, val ) {
	switch ( qualify ) {
	case '=':
		return actual === val;
	case '^=':
		return actual.match( attrCache.g('^=' + val ) || attrCache.s('^=' + val, new RegExp('^' + clean( val ))));
	case '$=':
		return actual.match( attrCache.g('$=' + val ) || attrCache.s('$=' + val, new RegExp( clean( val ) + '$')));
	case '*=':
		return actual.match( attrCache.g( val ) || attrCache.s( val, new RegExp( clean( val ))));
	case '~=':
		return actual.match( attrCache.g('~=' + val ) || attrCache.s('~=' + val, new RegExp('(?:^|\\s+)' + clean( val ) + '(?:\\s+|$)')));
	case '|=':
		return actual.match( attrCache.g('|=' + val ) || attrCache.s('|=' + val, new RegExp('^' + clean( val ) + '(-|$)')));
	}
	return 0;
}

/**
 * given => div.hello[title="world"]:foo('bar')
 * div.hello[title="world"]:foo('bar'), div, .hello, [title="world"], title, =, world, :foo('bar'), foo, ('bar'), bar]
 */
function interpret( whole, tag, idsAndClasses, wholeAttribute, attribute, qualifier, value, wholePseudo, pseudo, wholePseudoVal, pseudoVal ) {
	var m, c, k;
	if ( tag && this.tagName.toLowerCase() !== tag ) {
		return false;
	}
	if ( idsAndClasses && ( m = idsAndClasses.match( id )) && m[1] !== this.id ) {
		return false;
	}
	if ( idsAndClasses && ( classes = idsAndClasses.match( clas ))) {
		for ( i = classes.length; i--; ) {
			c = classes[i].slice( 1 );
			if (!( classCache.g( c ) || classCache.s( c, new RegExp('(^|\\s+)' + c + '(\\s+|$)'))).test( this.className )) {
				return false;
			}
		}
	}
	if ( pseudo && qwery.pseudos[pseudo] && !qwery.pseudos[pseudo]( this, pseudoVal )) {
		return false;
	}
	if ( wholeAttribute && !value ) {
		o = this.attributes;
		for ( k in o ) {
			if ( Object.prototype.hasOwnProperty.call( o, k ) && ( o[k].name || k ) == attribute ) {
				return this;
			}
		}
	}
	if ( wholeAttribute && !checkAttr( qualifier, this.getAttribute( attribute ) || '', value )) {
		return false;
	}
	return this;
}

function _qwery( selector ) {
	var i, j, k, l,	m, p,
		token,
		tag,
		els,
		root,
		intr,
		item,
		children,
		dividedToken,
		r = [],
		ret = [],
		tokens = tokenCache.g( selector ) || tokenCache.s( selector, selector.split( tokenizr )),
		dividedTokens = selector.match( dividers );

	tokens = tokens.slice( 0 ); // this makes a copy of the array so the cached original is not effected
	if (!tokens.length ) {
		return r;
	}

	token = tokens.pop();
	root = tokens.length && ( m = tokens[tokens.length - 1].match(idOnly) ) ? document.getElementById( m[1] ) : document;
	if ( !root ) {
		return r;
	}

	intr = q( token );

	els = dividedTokens && /^[+~]$/.test( dividedTokens[dividedTokens.length - 1] ) ?
		function( r ) {
			while ( root = root.nextSibling ) {
				root.nodeType == 1 && ( intr[1] ? intr[1] == root.tagName.toLowerCase() : 1 ) && r.push( root );
			}
			return r;
		}([]) :
		root.getElementsByTagName( intr[1] || '*' );

	j = 0;
	for ( i = 0, l = els.length; i < l; i++ ) {
		if ( item = interpret.apply(els[ i ], intr) ) {
			r[j++] = item;
		}
	}
	if (!tokens.length ) {
		return r;
	}

	// loop through all descendent tokens
	j = k = 0;
	l = r.length;
	for ( ; j < l; j++ ) {
		p = r[j];
		// loop through each token backwards crawling up tree
		for ( i = tokens.length; i--; ) {
			// loop through parent nodes
			while ( p = walker[dividedTokens[ i ]](p, r[ j ]) ) {
				if ( found = interpret.apply(p, q( tokens[i] )) ) {
					break;
				}
			}
		}
		if ( found ) {
			ret[k++] = r[j];
		}
	}
	return ret;
}

function isNode( el ) {
	return ( el && el.nodeType && (el.nodeType == 1 || el.nodeType == 9) );
}

function uniq( ar ) {
	var a = [], i, j;
	label:
	for ( i = 0; i < ar.length; i++ ) {
		for ( j = 0; j < a.length; j++ ) {
			if ( a[j] == ar[i]) {
				continue label;
			}
		}
		a[ a.length ] = ar[ i ];
	}
	return a;
}

contains = 'compareDocumentPosition' in html ?
	function( element, container ) {
		return ( container.compareDocumentPosition( element ) & 16 ) == 16;
	} :
	'contains' in html ?
	function( element, container ) {
		container = container == document || container == window ? html : container;
		return container !== element && container.contains( element );
	} :
	function( element, container ) {
		while ( element = element.parentNode ) {
			if ( element === container ) {
				return 1;
			}
		}
		return 0;
	};

select = function( selector, root ) {
	selector = selector.replace( normalizr, '$1');
	var result = [], collection, collections = [], i, element;
	if ( m = selector.match( tagAndOrClass )) {
		items = root.getElementsByTagName( m[1] || '*');
		r = classCache.g( m[2]) || classCache.s( m[2], new RegExp('(^|\\s+)' + m[2] + '(\\s+|$ )'));
		for ( i = 0, l = items.length, j = 0; i < l; i++ ) {
			r.test( items[i].className ) && ( result[j++] = items[i]);
		}
		return result;
	}
	for ( i = 0, items = selector.split(','), l = items.length; i < l; i++ ) {
		collections[i] = _qwery( items[i]);
	}
	for ( i = 0, l = collections.length; i < l && ( collection = collections[i]); i++ ) {
		var ret = collection;
		if ( root !== document ) {
			ret = [];
			for ( j = 0, m = collection.length; j < m && ( element = collection[j]); j++ ) {
				// make sure element is a descendent of root
				contains( element, root ) && ret.push( element );
			}
		}
		result = result.concat( ret );
	}
	return uniq( result );
};

if ( document.querySelectorAll ) {
	(function() {
		var oldSelect = select,
			div = document.createElement("div"),
			id = "__qwery__";

		div.innerHTML = "<p class='TEST'></p>";

		// Safari can't handle uppercase or unicode characters when
		// in quirks mode.
		if ( div.querySelectorAll && div.querySelectorAll(".TEST").length === 0 ) {
			return;
		}

		select = function( selector, root ) {
			if ( document.getElementsByClassName && (m = selector.match( classOnly )) ) {
				return array(( root ).getElementsByClassName( m[1]));
			}
			try {
				return array(( root ).querySelectorAll( selector ));
			} catch (e) {}

			return oldSelect( selector, root );
		};
	})();
}

function qwery( selector, _root, results ) {
	var root = ( typeof _root == 'string' ) ? qwery(_root )[ 0 ] : ( _root || document );
	results = results || [];

	if (!root || !selector ) {
		return results;
	}

	if ( selector === window || isNode( selector )) {
		if (!_root || ( selector !== window && isNode( root ) && contains( selector, root ))) {
			results.push( selector );
		}
		return results;
	}

	if ( selector && typeof selector === 'object' && isFinite( selector.length )) {
		return results.push.apply( results, array( selector ));
	}

	if ( m = selector.match(idOnly) ) {
		if ( el = document.getElementById(m[ 1 ]) ) {
			results.push( el );
		}
		return results;
	}

	if ( m = selector.match(tagOnly) ) {
		return results.push.apply( results, array(root.getElementsByTagName( m[1] )) );
	}

	return results.push.apply( results, select(selector, root) );
}

qwery.uniq = uniq;
qwery.pseudos = {};
qwery.contains = contains;
qwery.isXML = isXML;

qwery.noConflict = function() {
	window.qwery = oldQwery;
	return this;
};

// Expose
window.qwery = qwery;

})( this, this.document );