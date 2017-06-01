/* eslint-env es6, browser */

import {urlPing} from "../xhr.js"

export default class unpkg {
	static checkForPackage (pkg) {
		return new Promise((resolve) => {
			this.buildPackageUrl(pkg).then((url) => {
				urlPing(url).then(resolve)
			})
		})
	}

	static buildPackageUrl (pkg) {
		return new Promise((resolve) => {
			resolve(`https://unpkg.com/${pkg}`)
		})
	}
}
