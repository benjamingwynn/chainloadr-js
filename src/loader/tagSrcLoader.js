/* eslint-env es6, browser */

export default function tagSrcLoader (refs, url) {
	return new Promise((resolve, reject) => {
		const script = document.createElement("script")
			, returns = {}
			, timeouts = {}

		let nReturns

		nReturns = 0

		script.onerror = function onerror (scriptError) {
			reject(scriptError)
		}

		refs.forEach((ref) => {
			window.watch(ref, (value, oldObject, newObject) => {
				window.unwatch(ref)
				console.debug("value", value)
				console.debug("oldObject", oldObject)
				console.debug("newObject", newObject)

				returns[ref] = newObject

				nReturns += 1

				delete window[value]

				console.debug("nReturns", nReturns)
				console.debug("refs.length", refs.length)

				// stop timeout now
				clearTimeout(timeouts[ref])

				if (nReturns === refs.length) {
					resolve(returns)
				}
			})

			function timeout () {
				reject(`"${ref}" timed out. This package doesn't seem to provide the package you're looking for.`)
			}

			timeouts[ref] = setTimeout(timeout, window.chainloadr.configuration.globalPackageTimeout)
		})

		script.src = url

		script.async = "async"

		document.head.appendChild(script)
	})
}
