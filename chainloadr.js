/* eslint-env es6, browser */

(function loadChainloadr () {
	"use strict"

	function strReplace (oldstring, target, fill) {
		return oldstring.split(target).join(fill)
	}

	function getUrl (url, callback) {
		const xhttp = new XMLHttpRequest()

		xhttp.onerror = function onerror () {
			callback(this)
		}

		xhttp.onloadend = function onloadend () {
			callback(null, this.responseText)
		}

		xhttp.open("GET", url, true)

		xhttp.send()
	}

	function pingUrl (url, callback) {
		const xhttp = new XMLHttpRequest()

		xhttp.onerror = function onerror () {
			callback(this)
		}

		xhttp.onloadstart = function onloadstart () {
			this.abort()

			callback(false)
		}

		xhttp.open("GET", url, true)

		xhttp.send()
	}

	const libCache = {}
		, repositories = {
			browserify (lib, callback) {
				callback(`https://wzrd.in/standalone/${lib}`)
			},

			cdnjs (lib, callback) {
				// 1. Seperate the string into package and version requested
				const
					seperated = lib.split("@"),
					pkgName = seperated[0],
					pkgVer = seperated[1]

				// 2. We need to do a local SemVer compare. Let's grab a library to do this for us

				/*
					TODO:	* An entire repo having a chainloaded dependancy is questionable at best.
							* The dependancy should be loaded from another CDN or some static source. Not from a random GitHub page.
				*/

				window.chainloadr("semver from https://mottie.github.io/tablesorter/js/extras/semver-mod.js", (semver) => {
					// 3. Request the package information
					getURL(`https://api.cdnjs.com/libraries/${pkgName}`, (error, rawPkgData) => {
						if (error) {
							console.error(error)
							callback(null)

							return
						}

						console.log(rawPkgData)

						// 4. Parse the package information as JSON
						const
							assets = JSON.parse(rawPkgData).assets,
							nAssets = assets.length

						// 5. Loop over assets

						let assetI, nVersionsOkay

						nVersionsOkay = 0

						for (assetI = 0; assetI < nAssets; assetI += 1) {
							// 6. Fix version information to be semver compatible where possible
							const
								asset = assets[assetI]

							let assetVersion

							assetVersion = asset.version

							const splitAsset = assetVersion.split(".")

							if (splitAsset.length < 3) {
								if (splitAsset[1].length === 1) {
									assetVersion += ".0"
								} else {
									assetVersion = `${splitAsset[0]}.${splitAsset[1].split("").join(".")}`
								}
							}

							console.log("assetVersion", assetVersion)

							if (semver.satisfies(assetVersion, pkgVer)) {
								nVersionsOkay += 1

								// 7. Search for the latest version of the library
								getURL(`https://api.cdnjs.com/libraries?search=${pkgName}`, (latestError, rawResults) => {
									if (latestError) {
										console.error(latestError)
										callback(null)

										return
									}

									// 8. Parse as JSON

									const
										results = JSON.parse(rawResults).results,
										nResults = results.length

									let resultI,
										useFile

									console.log("results", results)

									// 9. Get the result that is the requsted package **exactly**

									for (resultI = 0; resultI < nResults; resultI += 1) {
										const result = results[resultI]

										console.log(result.name)

										if (result.name === pkgName) {
											// 10. Save the latest package path
											const pathSplit = result.latest.split("/")

											useFile = pathSplit[pathSplit.length - 1]

											break
										}
									}

									if (useFile) {
										console.log("Got useFile from query find")
										console.log("useFile", useFile)

										// 11. Build the URL and return it in our callback
										callback(`https://cdnjs.cloudflare.com/ajax/libs/${pkgName}/${asset.version}/${useFile}`)
									} else {
										console.error("Couldn't find a file to load from the search query API.")
										callback(null)
									}
								})

								break
							}
						}

						if (nVersionsOkay === 0) {
							console.warn("CDNJS has the package, but not the version of the package you requested.")
							callback(null)
						}
					})
				})
			},

			local (lib, callback) {
				if (lib.indexOf("./") === 0 || lib.indexOf("://") > -1) {
					callback(lib)
				} else {
					callback(null)
				}
			},

			unpkg (lib, callback) {
				callback(`https://unpkg.com/${lib}`)
			}
		}

	function chainloadr (libs, options, imports) {
		let loadedScripts

		// load scripts
		loadedScripts = 0

		const
			totalScripts = libs.length,
			head = document.getElementsByTagName("head")[0],
			allImported = []

		function loadScript (src, callback) {
			// Check if the script is already loaded
			if (document.querySelector(`[src="${src}"]`)) {
				console.warn(`Script ${src} is already loaded`)

				options.oncomplete(libCache[src])

				return
			}

			pingURL(src, (pingError) => {
				if (pingError) {
					callback(pingError)
				} else {
					const script = document.createElement("script")

					script.dataset.imports = imports.join(",")

					console.debug("imports", imports)
					if (imports.length === 0) {
						console.debug("imports length is 0")

						script.onload = function onload () {
							console.debug("Loaded.")

							callback(null, this)

							console.debug("element", this)

							if (options.onload) {
								options.onload()
							}

							loadedScripts += 1

							if (loadedScripts === totalScripts) {
								if (options.oncomplete) {
									options.oncomplete()
								}
							}
						}
					} else {
						const importedArray = script.dataset.imports.split(",")

						// add to the array and remove from window
						importedArray.forEach((imported) => {
							window.watch(imported, (value, oldObject, newObject) => {
								allImported.push(newObject)

								window.unwatch(imported)
								console.debug("value", value)
								console.debug("oldObject", oldObject)
								console.debug("newObject", newObject)

								// cache it
								libCache[src] = importedArray.length > 1 ? allImported : allImported[0]

								if (options.onload) {
									options.onload(libCache[src])
								}

								loadedScripts += 1

								if (loadedScripts === totalScripts) {
									if (options.oncomplete) {
										options.oncomplete(libCache[src])
									}
								}
							})
						})
					}

					script.onerror = function onerror (scriptError) {
						callback(scriptError)
					}

					script.src = src

					if (!options.sync) {
						script.async = "async"
					}

					head.appendChild(script)
				}
			})
		}

		function tryRepo (lib, repoIndex) {
			const repoKeys = options.repositories || window.chainloadr.configuration.respositoryOrder

			if (repoIndex === repoKeys.length) {
				throw new Error("Load failed, no repos were able to handle the request")
			} else {
				const
					repoName = repoKeys[repoIndex],
					repo = repositories[repoName]

				console.log("Checking for repo...", repoName)

				if (repo) {
					console.log("Found repo!", repoName)

					repo(lib, (src) => {
						if (src) {
							console.log("Repo has package!", repoName)

							// Does the src path resolve correctly?
							loadScript(src, (error) => {
								if (error) {
									console.warn(`${repoName} claimed it had ${lib}, but the package URL didn't resolve into a usable script.`)

									tryRepo(lib, repoIndex + 1)
								}
							})
						} else {
							console.warn(`The repo ${repoName} either cannot handle, or doesn't have the package.`)
							tryRepo(lib, repoIndex + 1)
						}
					})
				} else {
					console.warn(`The repo ${repoName} isn't installed. Attempting to use the next available repository`)
					tryRepo(lib, repoIndex + 1)
				}
			}
		}

		libs.forEach((lib) => {
			const
				repoLib = lib.split("::")

			if (repoLib[1]) {
				// Use a specified custom repo
				const customRepo = repositories[repoLib[0]]

				if (customRepo) {
					console.log("using speicifed repo", repoLib[0])
					customRepo(repoLib[1], (src) => {
						if (src) {
							loadScript(src, (error) => {
								if (error) {
									throw error
								}
							})
						} else {
							console.error("The specified repository does not contain the package you requested.")
						}
					})
				} else {
					console.error("The specified repository is not installed.")
				}
			} else {
				// Loop through all allowed repos
				tryRepo(lib, 0)
			}
		})
	}

	/*
		For experimental use only. Allows the chainloading of scripts with require() in them.
		use `window.require = chainloadr.require` to enable.
	*/

	function require (lib) {
		// HACK: use an error to get what called this file as a url, there is probably an easier way to do this
		// Only tested in Chrome 57 and 49!

		const
			error = new Error(),
			deconstructedPaths = error.stack.split("at "),
			origin = deconstructedPaths[deconstructedPaths.length - 1],
			deconstructedOrigin = origin.split(":"),
			url = `${deconstructedOrigin[0]}:${deconstructedOrigin[1]}`

		console.log("url", url)

		// TODO: (performance) run through chainloadr instead of chainloadr global with correctly assigned arguments
		window.chainloadr(`${url}/${strReplace(lib, "../", "")}`, {"sync": true})
	}

	window.chainloadr = (arg1, arg2, arg3) => {

		/*
			This function simply remaps the arguments provided to a common standard of arguments.
			It also handles any validation for the arguments.
		*/

		let libs, options, imports

		/* assign argument 1 */

		if (typeof arg1 === "string") {
			const splitArgument1FromSplit = arg1.split(" from ")

			if (splitArgument1FromSplit[1]) {
				imports = splitArgument1FromSplit[0].split(",").map((importVariable) =>
					importVariable.trim()
				)

				libs = [splitArgument1FromSplit[1]]
			} else {
				libs = [arg1]
			}

		} else if (Array.isArray(arg1)) {
			if (arg1.length) {
				libs = arg1
			} else {
				throw Error("libs array is empty")
			}
		} else {
			throw Error("First argument must be either a libaray name, an array of libraries to load")
		}

		/* assign argument 2 */
		if (arg2) {
			if (Array.isArray(arg2)) {
				throw Error("Second argument should not be an array.")
			} else if (typeof arg2 === "function") {
				options = {"oncomplete": arg2}
			} else {
				options = arg2
			}
		} else {
			console.warn("Only one argument provided. Provide a callback to wait for your file(s) to load")
			options = {}
		}

		/* assign argument 3 */
		if (arg3 && typeof arg3 === "function") {
			options.oncomplete = arg3
		}

		if (!imports) {
			imports = options.imports || []
		}

		chainloadr(libs, options, imports)
	}

	window.chainloadr.require = require
	window.chainloadr.version = "0.0.1"
	window.chainloadr.repositories = repositories

	window.chainloadr.caches = {
		"globals": {},
		"paths": JSON.parse(localStorage.getItem("chainloadr-paths") || "{}")
	}

	window.chainloadr.configuration = {
		"respositoryOrder": ["local", "unpkg", "cdnjs"]
	};

	(function addWinWatch () {

		/*
			Based on https://gist.github.com/eligrey/384583
		*/

		if (!window.watch) {
			Object.defineProperty(Object.getPrototypeOf(window), "watch", {
				"configurable": true,
				"enumerable": false,
				"writable": false,
				value (prop, handler) {
					let oldval, newval

					oldval = this[prop]
					newval = oldval

					function getter () {
						return newval
					}

					function setter (val) {
						oldval = newval
						newval = handler.call(this, prop, oldval, val)

						return newval
					}

					// can't watch constants
//					if (delete this[prop]) {
						Object.defineProperty(this, prop, {
							"configurable": true,
							"enumerable": true,
							"get": getter,
							"set": setter
						})
//					}
				}
			})
		}

		if (!window.unwatch) {
			Object.defineProperty(Object.getPrototypeOf(window), "unwatch", {
				"enumerable": false,
				"configurable": true,
				"writable": false,
				value (prop) {
					const val = this[prop]

					// remove accessors
					delete this[prop]
					this[prop] = val
				}
			})
		}
	}());

	// Chainloadr is loaded, now execute scripts marked with data-chainloadr
	(function autoExec () {
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
	}())
}())
