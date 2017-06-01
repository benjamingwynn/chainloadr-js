/* eslint-env browser, es6 */

export default function autoExec () {
	const scripts = document.querySelectorAll("[data-chainloadr]")
		, nScripts = scripts.length

	let scriptIndex

	for (scriptIndex = 0; scriptIndex < nScripts; scriptIndex += 1) {
		const oldScript = scripts[scriptIndex]
			, newScript = document.createElement("script")

		if (oldScript.innerHTML) {
			newScript.innerHTML = oldScript.innerHTML
		} else if (oldScript.dataset.chainloadr) {
			newScript.src = oldScript.dataset.chainloadr
		} else {
			throw new Error("data-chainloadr script passed, but it has no contents and no external script. Please consult the documentation.")
		}

		oldScript.parentNode.insertBefore(newScript, oldScript.nextSibling)
		oldScript.remove()
	}
}
