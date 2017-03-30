/* eslint-env es6, browser */

(function loadChainloadr () {
	"use strict";

	const repositories = {
		local (lib) {
			if (lib.indexOf("./") === 0 || lib.indexOf("://") > -1) {
				return lib;
			}

			return null;
		},

		unpkg (lib) {
			return `https://unpkg.com/${lib}`;
		},

		browserify (lib) {
			return `https://wzrd.in/standalone/${lib}`;
		}
	};

	function strReplace (oldstring, target, fill) {
		return oldstring.split(target).join(fill);
	}

	function chainloadr (arg1, arg2, arg3) {
		let libs, options, loadedScripts, imports;

		/* assign argument 1 */

		if (typeof arg1 === "string") {
			const splitArgument1FromSplit = arg1.split(" from ");

			if (splitArgument1FromSplit[1]) {
				imports = splitArgument1FromSplit[0].split(",").map((importVariable) =>
					importVariable.trim()
				);

				libs = [splitArgument1FromSplit[1]];
			} else {
				libs = [arg1];
			}

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

		if (!imports) {
			imports = options.imports || [];
		}

		// load scripts
		loadedScripts = 0;

		const
			totalScripts = libs.length,
			head = document.getElementsByTagName("head")[0],
			allImported = [];

		function loadScript (src) {
			// Check if the script is already loaded
			if (document.querySelector(`[src="${src}"]`)) {
				console.warn(`Script ${src} is already loaded`);

				return;
			}

			const script = document.createElement("script");

			script.dataset.imports = imports.join(",");

			script.onload = function onload () {
				console.log(this);
				const importedArray = this.dataset.imports.split(",");

				// add to the array and remove from window
				importedArray.forEach((imported) => {
					allImported.push(window[imported]);
					delete window[imported];
				});

				if (options.onload) {
					options.onload(importedArray.length > 1 ? importedArray : importedArray[0]);
				}

				loadedScripts += 1;

				if (loadedScripts === totalScripts) {
					if (options.oncomplete) {
						options.oncomplete(importedArray.length > 1 ? allImported : allImported[0]);
					}
				}
			};

			script.onerror = function onerror () {
				// TODO: try using another repo?
			};

			script.src = src;

			if (!options.sync) {
				script.async = "async";
			}

			head.appendChild(script);
		}

		libs.forEach((lib) => {
			const
				repoLib = lib.split("::");

			if (repoLib[1]) {
				const specifiedRepo = repositories[repoLib[0]];

				if (specifiedRepo) {
					console.log("using speicifed repo", repoLib[0]);
					const src = specifiedRepo(repoLib[1]);

					if (src) {
						loadScript(src);
					} else {
						console.error("The specified repository does not contain the package you requested.");
					}
				} else {
					console.error("The specified repository is not installed.");
				}
			} else {
				const repoKeys = options.repositories || ["local", "unpkg", "browserify"];

				let repoIndex;

				for (repoIndex = 0; repoIndex < repoKeys.length; repoIndex += 1) {
					const
						repoName = repoKeys[repoIndex],
						repo = repositories[repoName],
						src = repo(lib);

					if (repo) {
						if (src) {
							console.log("Using repo", repoName);

							loadScript(src);

							return;
						}
					} else {
						console.warn(`The repo ${repoName} isn't installed. Attempting to use the next available repository`);
					}
				}

				console.error("Load failed, no repos were able to handle the request");
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
