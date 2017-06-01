/* eslint-env es6, browser */

// add .watch we need to polyfill this for chrome...

export default function addWinWatch () {

	/*
		Based on https://gist.github.com/eligrey/384583
	*/

	if (!window.watch) {
		console.info("Pollyfilling winwatch from Chainloadr")

		Object.defineProperty(Object.getPrototypeOf(window), "watch", {
			"configurable": true,
			"enumerable": false,
			"writable": false,
			value (prop, handler) {
				let oldval, newval

				oldval = this[prop]
				newval = oldval

				function getter () {
					return newval
				}

				function setter (val) {
					oldval = newval
					newval = handler.call(this, prop, oldval, val)

					return newval
				}

				// can't watch constants
//					if (delete this[prop]) {
					Object.defineProperty(this, prop, {
						"configurable": true,
						"enumerable": true,
						"get": getter,
						"set": setter
					})
//					}
			}
		})
	}

	if (!window.unwatch) {
		Object.defineProperty(Object.getPrototypeOf(window), "unwatch", {
			"enumerable": false,
			"configurable": true,
			"writable": false,
			value (prop) {
				const val = this[prop]

				// remove accessors
				delete this[prop]
				this[prop] = val
			}
		})
	}
}
