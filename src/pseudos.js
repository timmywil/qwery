(function( qwery ) {

function children( node ) {
	var i, nodes = node.childNodes, r = [], l;
	for ( i = 0, l = nodes.length; i < l; i++ ) {
		var item = nodes[i];
		nodes[i].nodeType == 1 && r.push( nodes[i] );
	}
	return r;
}
qwery.pseudos['last-child'] = function( el, p, childs ) {
	return el.parentNode && ( p = el.parentNode ) && ( childs = children(p) ) && childs[childs.length - 1] == el;
};

qwery.pseudos['first-child'] = function( el, p, childs ) {
	return el.parentNode && ( p = el.parentNode ) && ( childs = children(p) ) && childs[0] == el;
};

qwery.pseudos['nth-child'] = function( el, val, p ) {
	if ( !val || !(p = el.parentNode) ) {
		return false;
	}
	var childs = children( p ), i, l;
	if ( isFinite( val ) ) {
		return childs[val - 1] == el;
	} else if ( val == 'odd' ) {
		for ( i = 0, l = childs.length;i < l; i = i + 2 ) {
			if ( el == childs[i] ) {
				return true;
			}
		}
	} else if ( val == 'even' ) {
		for ( i = 1, l = childs.length;i < l; i = i + 2 ) {
			if ( el == childs[i] ) {
				return true;
			}
		}
	}
	return false;
};

qwery.pseudos.checked = function( el ) {
	return el.checked;
};

qwery.pseudos.enabled = function( el ) {
	return !el.disabled;
};

qwery.pseudos.disabled = function( el ) {
	return el.disabled;
};

qwery.pseudos.empty = function( el ) {
	return !el.childNodes.length;
};


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
			if ( typeof elem.textContent === 'string' ) {
				return elem.textContent;
			} else if ( typeof elem.innerText === 'string' ) {
				// Replace IE's carriage returns
				return elem.innerText.replace( rReturn, '' );
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

var matches = qwery.matchesSelector = function( node, selector ) {
	return true;
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
		if ( matches(node) ) {
			result.push( node );
		}
	}
	return result;
};

qwery.matches = function( nodes, selector ) {
	return !!qwery.filter( nodes, selector ).length;
};

(function() {
	var rquoteAttr, disconnectedMatch,
		docElem = document.documentElement,
		matchesSelector = docElem.matchesSelector || docElem.webkitMatchesSelector || docElem.mozMatchesSelector || docElem.msMatchesSelector;

	if ( matchesSelector ) {
		rquoteAttr = /\=\s*([^'"\]]*)\s*\]/g;
		// IE9 cannot do matchesSelector on a disconnected node
		disconnectedMatch = !matchesSelector.call( document.createElement("div"), "div");

		qwery.matchesSelector = function( node, selector ) {
			var ret;

			// Make sure that attribute selectors are quoted
			selector = selector.replace( rquoteAttr, "='$1']");

			if ( !qwery.isXML(node) ) {
				try {
					ret = matchesSelector.call( node, selector );
					if ( ret || !disconnectedMatch ||
						node.document && node.document.nodeType !== 11 ) {
						return ret;
					}
				} catch (e) {}
			}
			return matches( node, selector );
		};
	}
})();

})( qwery );
