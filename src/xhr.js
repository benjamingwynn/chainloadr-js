/* eslint-env es6, browser */

export function urlGet (url) {
	return new Promise((resolve, reject) => {
		const xhttp = new XMLHttpRequest()

		xhttp.onerror = function onerror () {
			reject(this)
		}

		xhttp.onloadend = function onloadend () {
			resolve(this.responseText)
		}

		xhttp.open("GET", url, true)

		xhttp.send()
	})
}

export function urlPing (url) {
	return new Promise((resolve, reject) => {
		const xhttp = new XMLHttpRequest()

		xhttp.onerror = function onerror () {
			reject(this)
		}

		xhttp.onloadstart = function onloadstart () {
			this.abort()
			resolve()
		}

		xhttp.open("GET", url, true)

		xhttp.send()
	})
}
