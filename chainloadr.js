/* eslint-env es6, browser */

(function loadChainloadr () {
	"use strict";

	function strReplace (oldstring, target, fill) {
		return oldstring.split(target).join(fill);
	}

	function chainloadr (arg1, arg2) {
		let libs, options, loadedScripts;

		libs = arg1;
		options = arg2;

		if (!options) {
			options = {};
		}

		if (typeof options === "function") {
			options = {options};
		}

		if (typeof libs === "string") {
			libs = [libs];
		}

		if (!libs || libs.length < 1) {
			throw Error("First argument must be an array of libraries to load");
		}

		loadedScripts = 0;

		// Ensure CDN's have trailing slashes, or they will not work
		const
			totalScripts = libs.length,
			cdn = options.cdn || "https://unpkg.com/",
			head = document.getElementsByTagName("head")[0];

		function scriptLoad () {
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

		libs.forEach((lib) => {
			const script = document.createElement("script");

			script.onload = scriptLoad;
			if (!options.sync) {
				script.async = "async";
			}

			if (lib.indexOf("./") === 0) {
				script.src = `${lib}`;
			} else {
				script.src = `${cdn}${lib}`;
			}

			head.appendChild(script);
		});
	}

	window.chainloadr = chainloadr;
}());
