import React from 'react';
import ReactDOM from 'react-dom';
import isNodeInRoot from './nodeInRoot';
import getBoundsForNode from './getBoundsForNode';
import doObjectsCollide from './doObjectsCollide';


function getNumericStyleProperty(style, prop){
    return parseInt(style.getPropertyValue(prop),10) ;
}

function element_position(e) {
    var x = 0, y = 0;
    var inner = true ;
    do {
        x += e.offsetLeft;
        y += e.offsetTop;
        var style = getComputedStyle(e,null) ;
        var borderTop = getNumericStyleProperty(style,"border-top-width") ;
        var borderLeft = getNumericStyleProperty(style,"border-left-width") ;
        y += borderTop ;
        x += borderLeft ;
        if (inner){
          var paddingTop = getNumericStyleProperty(style,"padding-top") ;
          var paddingLeft = getNumericStyleProperty(style,"padding-left") ;
          y += paddingTop ;
          x += paddingLeft ;
        }
        inner = false ;
    } while (e = e.offsetParent);
    return { x: x, y: y };
}

class SelectableGroup extends React.Component {


	constructor (props) {
		super(props);

		this.state = {
			isBoxSelecting: false,
			boxWidth: 0,
			boxHeight: 0
		}

		this._mouseDownData = null;
		this._registry = [];

		this._openSelector = this._openSelector.bind(this);
		this._mouseDown = this._mouseDown.bind(this);
		this._mouseUp = this._mouseUp.bind(this);
		this._selectElements = this._selectElements.bind(this);
		this._registerSelectable = this._registerSelectable.bind(this);
		this._unregisterSelectable = this._unregisterSelectable.bind(this);
	}


	getChildContext () {
		return {
			selectable: {
				register: this._registerSelectable,
				unregister: this._unregisterSelectable
			}
		};
	}


	componentDidMount () {
		ReactDOM.findDOMNode(this).addEventListener('mousedown', this._mouseDown);
	}


	/**
	 * Remove global event listeners
	 */
	componentWillUnmount () {
		ReactDOM.findDOMNode(this).removeEventListener('mousedown', this._mouseDown);
	}


	_registerSelectable (key, domNode) {
		this._registry.push({key, domNode});
	}


	_unregisterSelectable (key) {
		this._registry = this._registry.filter(data => data.key !== key);
	}


	/**
	 * Called while moving the mouse with the button down. Changes the boundaries
	 * of the selection box
	 */
	 _openSelector (e) {
		 const p = element_position(e.target);

 	    const w = Math.abs(this._mouseDownData.initialX - e.pageX);
 	    const h = Math.abs(this._mouseDownData.initialY - e.pageY);


			// e.target.offset/
			// console.log(e.pageX - p.x);
			// console.log(e.pageY - p.y);

 	    this.setState({
 	    	isBoxSelecting: true,
 	    	boxWidth: w,
 	    	boxHeight: h,
 	    	boxLeft: this._mouseDownData.initialW,
 	    	boxTop: this._mouseDownData.initialH
 	    });
 	}

	/**
	 * Called when a user presses the mouse button. Determines if a select box should
	 * be added, and if so, attach event listeners
	 */
	_mouseDown (e) {
		const node = ReactDOM.findDOMNode(this);
		let collides, offsetData, distanceData;
		ReactDOM.findDOMNode(this).addEventListener('mouseup', this._mouseUp);

		// Right clicks
		if(e.which === 3 || e.button === 2) return;

		if(!isNodeInRoot(e.target, node)) {
			offsetData = getBoundsForNode(node);
			collides = doObjectsCollide(
				{
					top: offsetData.top,
					left: offsetData.left,
					bottom: offsetData.offsetHeight,
					right: offsetData.offsetWidth
				},
				{
					top: e.pageY,
					left: e.pageX,
					offsetWidth: 0,
					offsetHeight: 0
				}
			);
			if(!collides) return;
		}

		const p = element_position(e.target);

		this._mouseDownData = {
			boxLeft: e.pageX,
			boxTop: e.pageY,
			initialX: e.pageX,
			initialY: e.pageY,
      initialW: e.pageX - p.x,
    	initialH: e.pageY - p.y
		};


		e.preventDefault();

		ReactDOM.findDOMNode(this).addEventListener('mousemove', this._openSelector);
	}


	/**
	 * Called when the user has completed selection
	 */
	_mouseUp (e) {
	    ReactDOM.findDOMNode(this).removeEventListener('mousemove', this._openSelector);
	    ReactDOM.findDOMNode(this).removeEventListener('mouseup', this._mouseUp);

	    if(!this._mouseDownData) return;

		return this._selectElements(e);
	}


	/**
	 * Selects multiple children given x/y coords of the mouse
	 */
	_selectElements (e) {

		this.props.onSelection(this.state);
		this.setState({
			isBoxSelecting: false,
			boxWidth: 0,
			boxHeight: 0
		});
	}


	/**
	 * Renders the component
	 * @return {ReactComponent}
	 */
	render () {

		const boxStyle = {
			left: this.state.boxLeft,
			top: this.state.boxTop,
			width: this.state.boxWidth,
			height: this.state.boxHeight,
			zIndex: 9000,
			position: this.props.fixedPosition ? 'fixed' : 'absolute',
			cursor: 'default'
		};

		const spanStyle = {
			backgroundColor: 'transparent',
			border: '1px dashed #999',
			width: '100%',
			height: '100%',
			float: 'left'
		};

		return (
			<this.props.component {...this.props}>
				{this.state.isBoxSelecting &&
				  <div style={boxStyle} ref="selectbox"><span style={spanStyle}></span></div>
				}
				{this.props.children}
			</this.props.component>
		);
	}
}

SelectableGroup.propTypes = {

	/**
	 * Event that will fire when items are selected. Passes an array of keys
	 */
	onSelection: React.PropTypes.func,

	/**
	 * The component that will represent the Selectable DOM node
	 */
	component: React.PropTypes.node,

	/**
	 * Amount of forgiveness an item will offer to the selectbox before registering
	 * a selection, i.e. if only 1px of the item is in the selection, it shouldn't be
	 * included.
	 */
	tolerance: React.PropTypes.number,

	/**
	 * In some cases, it the bounding box may need fixed positioning, if your layout
	 * is relying on fixed positioned elements, for instance.
	 * @type boolean
	 */
	fixedPosition: React.PropTypes.bool

};

SelectableGroup.defaultProps = {
	onSelection: () => {},
	component: 'div',
	tolerance: 0,
	fixedPosition: false
};

SelectableGroup.childContextTypes = {
	selectable: React.PropTypes.object
};

export default SelectableGroup;
