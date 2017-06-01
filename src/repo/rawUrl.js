/* eslint-env es6, browser */

import {urlPing} from "../xhr.js"

export default class rawUrl {
	static checkForPackage (pkg) {
		return new Promise((resolve, reject) => {
			if (pkg.indexOf("./") < 0 && pkg.indexOf("//") < 0) {
				reject(new Error("Doesn't look like a path to me."))
			} else {
				urlPing(pkg).then(resolve)
			}
		})
	}

	static buildPackageUrl (pkg) {
		return new Promise((resolve) => {
			resolve(`${pkg}`)
		})
	}
}
