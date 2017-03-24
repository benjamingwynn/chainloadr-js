# Chainloadr.js

## Important!

**Chainloadr is still under development. The API is still unstable and may change at any time.**

## Introduction

Chainloadr is designed to be a cross between a very simple package manager, and a script loader.

It's main aim is to remove the need for a build process behind Javascript applications, why should one have to use bower or NPM server-side to keep packages up to date on a server, mirroring files that already exist somewhere else.

### Aims

Chainloadr's development priorities are as follows:

1. Reliability
2. Simplicity
3. Performance
4. Compatibility

#### Reliability

...

#### Simplicity

Chainloadr is designed to be both simple to use and develop. It's API is designed to be very easy to use, and Chainloadr itself has no dependencies.

#### Performance

...

#### Compatibility

Chainloadr is built in ES2015 for ease of development, but a final version (read: 1.0) will be compatible in as many browsers as feasible.

## Implementation

You can use Chainloadr inline. Once Chainloadr loads, it will automatically execute any script tag with the `data-chainloadr` attribute:

```
<script async src="path/to/chainloadr.js" data-chainloadr>
	chainloadr("jquery@3", () => {
		// We can now use window.jQuery
	});
</script>
```

Or if you would rather use an external script, you can define the `data-chainloadr` attribute as a string:

```
<script async src="path/to/chainloadr.js" data-chainloadr="external_file_to_load_after_chainloadr.js"></script>
```