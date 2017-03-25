/* eslint-env es6, browser */

(function loadChainloadr () {
	"use strict";

	function strReplace (oldstring, target, fill) {
		return oldstring.split(target).join(fill);
	}

	function chainloadr (arg1, arg2, arg3) {
		let libs, options, loadedScripts;
		
		/* assign argument 1 */
		if (typeof arg1 === "string") {
			libs = [arg1];
		} else if (Array.isArray(arg1)) {
			if (arg1.length) {
				libs = arg1;
			} else {
				throw Error("libs array is empty");
			}
		} else {
			throw Error("First argument must be either a libaray name, an array of libraries to load");
		}
		
		/* assign argument 2 */
		if (arg2) {
			if (Array.isArray(arg2)) {
				throw Error("Second argument should not be an array.");
			} else if (typeof arg2 === "function") {
				options = {"oncomplete": arg2};
			} else {
				options = arg2;
			}
		} else {
			console.warn("Only one argument provided. Provide a callback to wait for your file(s) to load");
			options = {};
		}
		
		/* assign argument 3 */
		if (arg3 && typeof arg3 === "function") {
			options.oncomplete = arg3;
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
			if (lib.indexOf("./") === 0 || lib.indexOf("://") > -1) {
				loadScript(`${lib}`);
			} else {
				loadScript(`${cdn}${lib}`);
			}
		});
	}
	
	/* DO NOT USE */
	
	function require (lib) {
		// HACK: use an error to get what called this file as a url, there is probably an easier way to do this
		
		const
			error = new Error(),
			deconstructedPaths = error.stack.split("at "),
			origin = deconstructedPaths[deconstructedPaths.length - 1],
			deconstructedOrigin = origin.split(":"),
			url = `${deconstructedOrigin[0]}:${deconstructedOrigin[1]}`;
		
		console.log("url", url);
		
		chainloadr(`${url}/${strReplace(lib, "../", "")}`, {"sync": true});
	}

	window.chainloadr = chainloadr;
	window.chainloadr.require = require;

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
