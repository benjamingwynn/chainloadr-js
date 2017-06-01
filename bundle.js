(function () {
'use strict';

/* eslint-env es6, browser */



function urlPing (url) {
	return new Promise((resolve, reject) => {
		const xhttp = new XMLHttpRequest();

		xhttp.onerror = function onerror () {
			reject(this);
		};

		xhttp.onloadstart = function onloadstart () {
			this.abort();
			resolve();
		};

		xhttp.open("GET", url, true);

		xhttp.send();
	})
}

/* eslint-env es6, browser */

class browserify {
	static checkForPackage (pkg) {
		return new Promise((resolve) => {
			this.buildPackageUrl(pkg).then((url) => {
				urlPing(url).then(resolve);
			});
		})
	}

	static buildPackageUrl (pkg) {
		return new Promise((resolve) => {
			resolve(`https://wzrd.in/standalone/${pkg}`);
		})
	}
}

/* eslint-env es6, browser */

class rawUrl {
	static checkForPackage (pkg) {
		return new Promise((resolve, reject) => {
			if (pkg.indexOf("./") < 0 && pkg.indexOf("//") < 0) {
				reject(new Error("Doesn't look like a path to me."));
			} else {
				urlPing(pkg).then(resolve);
			}
		})
	}

	static buildPackageUrl (pkg) {
		return new Promise((resolve) => {
			resolve(`${pkg}`);
		})
	}
}

/* eslint-env es6, browser */

class unpkg {
	static checkForPackage (pkg) {
		return new Promise((resolve) => {
			this.buildPackageUrl(pkg).then((url) => {
				urlPing(url).then(resolve);
			});
		})
	}

	static buildPackageUrl (pkg) {
		return new Promise((resolve) => {
			resolve(`https://unpkg.com/${pkg}`);
		})
	}
}

/* eslint-env es6, browser */

var repos = {
	browserify,
	rawUrl,
	unpkg,
};

/* eslint-env es6, browser */

function tagSrcLoader (refs, url) {
	return new Promise((resolve, reject) => {
		const script = document.createElement("script")
			, returns = {}
			, timeouts = {};

		let nReturns;

		nReturns = 0;

		script.onerror = function onerror (scriptError) {
			reject(scriptError);
		};

		refs.forEach((ref) => {
			window.watch(ref, (value, oldObject, newObject) => {
				window.unwatch(ref);
				console.debug("value", value);
				console.debug("oldObject", oldObject);
				console.debug("newObject", newObject);

				returns[ref] = newObject;

				nReturns += 1;

				delete window[value];

				console.debug("nReturns", nReturns);
				console.debug("refs.length", refs.length);

				// stop timeout now
				clearTimeout(timeouts[ref]);

				if (nReturns === refs.length) {
					resolve(returns);
				}
			});

			function timeout () {
				reject(`"${ref}" timed out. This package doesn't seem to provide the package you're looking for.`);
			}

			timeouts[ref] = setTimeout(timeout, window.chainloadr.configuration.globalPackageTimeout);
		});

		script.src = url;

		script.async = "async";

		document.head.appendChild(script);
	})
}

var loader = {tagSrcLoader};

/* eslint-env es6, browser */

// add .watch we need to polyfill this for chrome...

function addWinWatch () {

	/*
		Based on https://gist.github.com/eligrey/384583
	*/

	if (!window.watch) {
		console.info("Pollyfilling winwatch from Chainloadr");

		Object.defineProperty(Object.getPrototypeOf(window), "watch", {
			"configurable": true,
			"enumerable": false,
			"writable": false,
			value (prop, handler) {
				let oldval, newval;

				oldval = this[prop];
				newval = oldval;

				function getter () {
					return newval
				}

				function setter (val) {
					oldval = newval;
					newval = handler.call(this, prop, oldval, val);

					return newval
				}

				// can't watch constants
//					if (delete this[prop]) {
					Object.defineProperty(this, prop, {
						"configurable": true,
						"enumerable": true,
						"get": getter,
						"set": setter
					});
//					}
			}
		});
	}

	if (!window.unwatch) {
		Object.defineProperty(Object.getPrototypeOf(window), "unwatch", {
			"enumerable": false,
			"configurable": true,
			"writable": false,
			value (prop) {
				const val = this[prop];

				// remove accessors
				delete this[prop];
				this[prop] = val;
			}
		});
	}
}

/* eslint-env browser, es6 */

function autoExec () {
	const scripts = document.querySelectorAll("[data-chainloadr]")
		, nScripts = scripts.length;

	let scriptIndex;

	for (scriptIndex = 0; scriptIndex < nScripts; scriptIndex += 1) {
		const oldScript = scripts[scriptIndex]
			, newScript = document.createElement("script");

		if (oldScript.innerHTML) {
			newScript.innerHTML = oldScript.innerHTML;
		} else if (oldScript.dataset.chainloadr) {
			newScript.src = oldScript.dataset.chainloadr;
		} else {
			throw new Error("data-chainloadr script passed, but it has no contents and no external script. Please consult the documentation.")
		}

		oldScript.parentNode.insertBefore(newScript, oldScript.nextSibling);
		oldScript.remove();
	}
}

/* eslint-env es6, browser */

addWinWatch();

const loadedPackages = [];

function isPackageLoaded (testForPackage) {
	const nLoadedPackages = loadedPackages.length;

	let loadedPackageI;

	for (loadedPackageI = 0; loadedPackageI < nLoadedPackages; loadedPackageI += 1) {
		const thisPackage = loadedPackages[loadedPackageI];

		if (testForPackage === thisPackage) {
			return true
		}
	}

	return false
}

function chainloadrRaw (repoName, pkg, importArray) {
	return new Promise((resolve, reject) => {
		// FUTURE: Careful of falsey values
		if (!importArray || !repoName || !pkg) {
			throw new Error("Requires all three arguments. See documentation.")
		}

		console.debug("repoName", repoName);
		console.debug("pkg", pkg);
		console.debug("importArray", importArray);

		const repo = repos[repoName];

		if (!pkg) {
			throw new Error(`Malformed package query; "${pkg}" -- you must specify what this libarary exports to window using 'from'. See the documentation for more information`)
		}

		if (importArray.length < 1) {
			throw new Error(`Malformed package query; "${pkg}" -- no variables to watch specified before "from"`)
		}

		if (isPackageLoaded(pkg)) {
			throw new Error(`"${pkg}" is already loaded.`)
		}

		if (!repo) {
			throw new Error(`Repo "${repoName}" not found. It is normally unwise to specify a repo name outright, consider allowing Chainloadr to pick a best repo for you.`)
		}

		repo.checkForPackage(pkg).then(() => {
			console.debug("Looks like our repo has our package!");
			repo.buildPackageUrl(pkg).then((url) => {
				console.debug("We have a URL!");

				loader.tagSrcLoader(importArray, url)
				. then((libs) => {
					console.debug("The loader just finished loading our lib!");

					resolve(libs);
				})
				. catch(reject);
			});
		})
		.catch((error) => {
			console.warn(error);
			reject(error);
		});
	})
}

function tryRepoAtIndex (packageQuery, index) {
	return new Promise((resolve, reject) => {
		const keys = window.chainloadr.configuration.repositoryOrder
			, repo = keys[index]
			, impSplit = packageQuery.split("from");

		console.debug("keys", keys);
		console.debug("repo", repo);
		console.debug("impSplit", impSplit);

		chainloadrRaw(repo, impSplit[1].trim(), impSplit[0].split(",").map((value) => value.trim()))
		. then(resolve)
		. catch(() => {
			console.debug("Caught failed repo");
			console.debug("keys.length", keys.length);
			console.debug("index + 1", index + 1);

			if (index + 1 < keys.length) {
				tryRepoAtIndex(packageQuery, index + 1);
			} else {
				reject(new Error(`I tested ${index + 1} repos, none of which could find "${packageQuery}". Are you sure you spelt the package name correctly?`));
			}
		});
	})
}

function chainloadPackageQuery (packageQuery) {
	return new Promise((resolve, reject) => {
		const spitChar = "::"
			, split = packageQuery.split(spitChar);

		console.debug("split", split);

		if (split.length === 1) {
			tryRepoAtIndex(packageQuery, 0)
			. then(resolve)
			. catch(reject);
		} else if (split.length === 2) {
			const impSplit = split[0].split("from");

			chainloadrRaw(impSplit[1].trim(), split[1].trim(), impSplit[0].split(",").map((value) => value.trim()))
			. then(resolve)
			. catch(reject);

		} else {
			reject(new Error(`Malformed package query; "${packageQuery}" -- too many '${spitChar}' characters`));
		}

	})
}

function chainloadr (pkgs) {
	return new Promise((resolve, reject) => {
		const promises = [];

		pkgs.split(";").forEach((pkgRaw) => {
			promises.push(chainloadPackageQuery(pkgRaw));
		});

		Promise.all(promises).then((arrays) => {
			const toReturn = {};

			arrays.forEach((objects) => {
				console.log("objects", objects);
				Object.assign(toReturn, objects);
			});

			/*
				This checks if there is only one argument to return, and if there is, it returns it on its lonesome outside of an object
			*/

			{
				const keys = Object.keys(toReturn)
					, nKeys = keys.length;

				if (nKeys === 1) {
					resolve(toReturn[keys[0]]);
				} else {
					resolve(toReturn);
				}
			}

		})
		.catch((error) => {
			reject(error);
		});
	})
}

// Add to the window object
window.chainloadr = chainloadr;

window.chainloadr.configuration = {
	"globalPackageTimeout": 10000,
	// "repositoryOrder": Object.keys(repos),
	"repositoryOrder": ["rawUrl", "unpkg", "browserify"],
};

// Automatically execute data-chainloadr scripts
autoExec();

}());
//# sourceMappingURL=bundle.js.map
