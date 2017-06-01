/* eslint-env es6, browser */

import repos from "./repo/main.js"
import loader from "./loader/main.js"
import addWinWatch from "./winWatchPollyfill.js"
import autoExec from "./autoExec.js"

addWinWatch()

const loadedPackages = []

function isPackageLoaded (testForPackage) {
	const nLoadedPackages = loadedPackages.length

	let loadedPackageI

	for (loadedPackageI = 0; loadedPackageI < nLoadedPackages; loadedPackageI += 1) {
		const thisPackage = loadedPackages[loadedPackageI]

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

		console.debug("repoName", repoName)
		console.debug("pkg", pkg)
		console.debug("importArray", importArray)

		const repo = repos[repoName]

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
			console.debug("Looks like our repo has our package!")
			repo.buildPackageUrl(pkg).then((url) => {
				console.debug("We have a URL!")

				loader.tagSrcLoader(importArray, url)
				. then((libs) => {
					console.debug("The loader just finished loading our lib!")

					resolve(libs)
				})
				. catch(reject)
			})
		})
		.catch((error) => {
			console.warn(error)
			reject(error)
		})
	})
}

function tryRepoAtIndex (packageQuery, index) {
	return new Promise((resolve, reject) => {
		const keys = window.chainloadr.configuration.repositoryOrder
			, repo = keys[index]
			, impSplit = packageQuery.split("from")

		console.debug("keys", keys)
		console.debug("repo", repo)
		console.debug("impSplit", impSplit)

		chainloadrRaw(repo, impSplit[1].trim(), impSplit[0].split(",").map((value) => value.trim()))
		. then(resolve)
		. catch(() => {
			console.debug("Caught failed repo")
			console.debug("keys.length", keys.length)
			console.debug("index + 1", index + 1)

			if (index + 1 < keys.length) {
				tryRepoAtIndex(packageQuery, index + 1)
			} else {
				reject(new Error(`I tested ${index + 1} repos, none of which could find "${packageQuery}". Are you sure you spelt the package name correctly?`))
			}
		})
	})
}

function chainloadPackageQuery (packageQuery) {
	return new Promise((resolve, reject) => {
		const spitChar = "::"
			, split = packageQuery.split(spitChar)

		console.debug("split", split)

		if (split.length === 1) {
			tryRepoAtIndex(packageQuery, 0)
			. then(resolve)
			. catch(reject)
		} else if (split.length === 2) {
			const impSplit = split[0].split("from")

			chainloadrRaw(impSplit[1].trim(), split[1].trim(), impSplit[0].split(",").map((value) => value.trim()))
			. then(resolve)
			. catch(reject)

		} else {
			reject(new Error(`Malformed package query; "${packageQuery}" -- too many '${spitChar}' characters`))
		}

	})
}

function chainloadr (pkgs) {
	return new Promise((resolve, reject) => {
		const promises = []

		pkgs.split(";").forEach((pkgRaw) => {
			promises.push(chainloadPackageQuery(pkgRaw))
		})

		Promise.all(promises).then((arrays) => {
			const toReturn = {}

			arrays.forEach((objects) => {
				console.log("objects", objects)
				Object.assign(toReturn, objects)
			})

			/*
				This checks if there is only one argument to return, and if there is, it returns it on its lonesome outside of an object
			*/

			{
				const keys = Object.keys(toReturn)
					, nKeys = keys.length

				if (nKeys === 1) {
					resolve(toReturn[keys[0]])
				} else {
					resolve(toReturn)
				}
			}

		})
		.catch((error) => {
			reject(error)
		})
	})
}

// Add to the window object
window.chainloadr = chainloadr

window.chainloadr.configuration = {
	"globalPackageTimeout": 10000,
	// "repositoryOrder": Object.keys(repos),
	"repositoryOrder": ["rawUrl", "unpkg", "browserify"],
}

// Automatically execute data-chainloadr scripts
autoExec()
