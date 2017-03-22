/* eslint-env es6, browser */

(function loadChainloadr () {
	"use strict";

	function strReplace (oldstring, target, fill) {
		return oldstring.split(target).join(fill);
	}

	function chainloadr (arg1, arg2) {
		// check arguments
		let libs, options, loadedScripts;

		libs = arg1;
		options = arg2;

		if (!arg2) {
			options = {};
		}

		if (typeof arg1 === "string") {
			libs = [arg1];
		}

		if (typeof arg2 === "function") {
			options = {"oncomplete": arg2};
		}

		if (!libs || libs.length < 1) {
			throw Error("First argument must be either a libaray name, an array of libraries to load");
		}

		// load scripts

		loadedScripts = 0;

		// Ensure CDN's have trailing slashes, or they will not work
		const
			totalScripts = libs.length,
			cdn = options.cdn || "https://unpkg.com/",
			head = document.getElementsByTagName("head")[0];

		function loadScript (src) {
			// Check if the script is already loaded
			if (document.querySelector(`[src="${src}"]`)) {
				console.warn(`Script ${src} is already loaded`);

				return;
			}

			function onload () {
				console.log(this);

				if (options.onload) {
					options.onload(strReplace(this.src, cdn, ""));
				}

				loadedScripts += 1;

				if (loadedScripts === totalScripts) {
					if (options.oncomplete) {
						options.oncomplete();
					}
				}
			}

			const script = document.createElement("script");

			script.onload = onload;
			script.src = src;

			if (!options.sync) {
				script.async = "async";
			}

			head.appendChild(script);
		}

		libs.forEach((lib) => {
			if (lib.indexOf("./") === 0) {
				loadScript(`${lib}`);
			} else {
				loadScript(`${cdn}${lib}`);
			}
		});
	}

	window.chainloadr = chainloadr;

	// Chainloadr is loaded, now execute scripts marked with data-chainloadr
	document.querySelectorAll("[data-chainloadr]").forEach((oldScript) => {
		const newScript = document.createElement("script");

		if (oldScript.innerHTML) {
			newScript.innerHTML = oldScript.innerHTML;
		} else if (oldScript.dataset.chainloadr) {
			newScript.src = oldScript.dataset.chainloadr;
		} else {
			throw new Error("data-chainloadr script passed, but it has no contents and no external script. Please consult the documentation.");
		}

		oldScript.parentNode.insertBefore(newScript, oldScript.nextSibling);
		oldScript.remove();
	});
}());
